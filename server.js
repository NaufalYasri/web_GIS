require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper table mapping
const LAYER_TABLES = {
  titik: 'digitasi_titik',
  garis: 'digitasi_garis',
  poligon: 'digitasi_poligon',
};

// 1. Health check & status koneksi DB
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await db.query('SELECT NOW() as now, PostGIS_Version() as postgis_ver;');
    res.json({
      status: 'connected',
      time: dbRes.rows[0].now,
      postgis: dbRes.rows[0].postgis_ver,
      database: process.env.DB_NAME || 'webgis_digitasi',
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
      hint: 'Pastikan PostgreSQL aktif dan ekstensi PostGIS sudah terpasang.',
    });
  }
});

// 2. Statistik Jumlah Fitur
app.get('/api/stats', async (req, res) => {
  try {
    const qTitik = await db.query('SELECT COUNT(*)::int AS count FROM digitasi_titik;');
    const qGaris = await db.query('SELECT COUNT(*)::int AS count FROM digitasi_garis;');
    const qPoligon = await db.query('SELECT COUNT(*)::int AS count FROM digitasi_poligon;');

    const titik = qTitik.rows[0].count;
    const garis = qGaris.rows[0].count;
    const poligon = qPoligon.rows[0].count;

    res.json({
      titik,
      garis,
      poligon,
      total: titik + garis + poligon,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Ambil Semua Fitur (GeoJSON)
app.get('/api/features', async (req, res) => {
  try {
    const [titikRes, garisRes, poligonRes] = await Promise.all([
      db.query(`
        SELECT json_build_object(
          'type', 'FeatureCollection',
          'features', COALESCE(json_agg(
            json_build_object(
              'type', 'Feature',
              'id', id,
              'geometry', ST_AsGeoJSON(geom)::json,
              'properties', json_build_object(
                'id', id,
                'layer', 'titik',
                'nama', nama,
                'kategori', kategori,
                'keterangan', keterangan,
                'foto', foto,
                'created_at', created_at
              )
            )
          ), '[]'::json)
        ) AS geojson FROM digitasi_titik;
      `),
      db.query(`
        SELECT json_build_object(
          'type', 'FeatureCollection',
          'features', COALESCE(json_agg(
            json_build_object(
              'type', 'Feature',
              'id', id,
              'geometry', ST_AsGeoJSON(geom)::json,
              'properties', json_build_object(
                'id', id,
                'layer', 'garis',
                'nama', nama,
                'kategori', kategori,
                'panjang_meter', panjang_meter,
                'keterangan', keterangan,
                'foto', foto,
                'created_at', created_at
              )
            )
          ), '[]'::json)
        ) AS geojson FROM digitasi_garis;
      `),
      db.query(`
        SELECT json_build_object(
          'type', 'FeatureCollection',
          'features', COALESCE(json_agg(
            json_build_object(
              'type', 'Feature',
              'id', id,
              'geometry', ST_AsGeoJSON(geom)::json,
              'properties', json_build_object(
                'id', id,
                'layer', 'poligon',
                'nama', nama,
                'kategori', kategori,
                'luas_m2', luas_m2,
                'keterangan', keterangan,
                'foto', foto,
                'created_at', created_at
              )
            )
          ), '[]'::json)
        ) AS geojson FROM digitasi_poligon;
      `),
    ]);

    res.json({
      titik: titikRes.rows[0].geojson,
      garis: garisRes.rows[0].geojson,
      poligon: poligonRes.rows[0].geojson,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Ambil fitur per layer (titik / garis / poligon)
app.get('/api/features/:layer', async (req, res) => {
  const layer = req.params.layer.toLowerCase();
  const table = LAYER_TABLES[layer];

  if (!table) {
    return res.status(400).json({ error: 'Layer tidak valid. Pilih: titik, garis, atau poligon' });
  }

  try {
    let extraProps = '';
    if (layer === 'garis') extraProps = `'panjang_meter', panjang_meter,`;
    if (layer === 'poligon') extraProps = `'luas_m2', luas_m2,`;

    const sql = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'id', id,
            'geometry', ST_AsGeoJSON(geom)::json,
            'properties', json_build_object(
              'id', id,
              'layer', '${layer}',
              'nama', nama,
              'kategori', kategori,
              ${extraProps}
              'keterangan', keterangan,
              'foto', foto,
              'created_at', created_at
            )
          )
        ), '[]'::json)
      ) AS geojson FROM ${table};
    `;

    const result = await db.query(sql);
    res.json(result.rows[0].geojson);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Tambah Fitur Baru (Hasil Digitasi)
app.post('/api/features', async (req, res) => {
  const { geometry, properties } = req.body;

  if (!geometry || !properties || !properties.nama) {
    return res.status(400).json({ error: 'Parameter tidak lengkap (geometry, properties.nama wajib diisi)' });
  }

  const geomType = geometry.type;
  const geomJson = JSON.stringify(geometry);
  const nama = properties.nama.trim();
  const kategori = properties.kategori ? properties.kategori.trim() : 'Umum';
  const keterangan = properties.keterangan ? properties.keterangan.trim() : '';
  const foto = properties.foto ? properties.foto.trim() : null;

  try {
    let inserted;

    if (geomType === 'Point') {
      const result = await db.query(`
        INSERT INTO digitasi_titik (nama, kategori, keterangan, foto, geom)
        VALUES ($1, $2, $3, $4, ST_SetSRID(ST_GeomFromGeoJSON($5), 4326))
        RETURNING id, nama, kategori, keterangan, foto, created_at, ST_AsGeoJSON(geom)::json AS geometry;
      `, [nama, kategori, keterangan, foto, geomJson]);
      inserted = { ...result.rows[0], layer: 'titik' };

    } else if (geomType === 'LineString' || geomType === 'MultiLineString') {
      const result = await db.query(`
        INSERT INTO digitasi_garis (nama, kategori, keterangan, foto, panjang_meter, geom)
        VALUES (
          $1,
          $2,
          $3,
          $4,
          ROUND(ST_Length(ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)::geography)::numeric, 2),
          ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)
        )
        RETURNING id, nama, kategori, panjang_meter, keterangan, foto, created_at, ST_AsGeoJSON(geom)::json AS geometry;
      `, [nama, kategori, keterangan, foto, geomJson]);
      inserted = { ...result.rows[0], layer: 'garis' };

    } else if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
      const result = await db.query(`
        INSERT INTO digitasi_poligon (nama, kategori, keterangan, foto, luas_m2, geom)
        VALUES (
          $1,
          $2,
          $3,
          $4,
          ROUND(ST_Area(ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)::geography)::numeric, 2),
          ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)
        )
        RETURNING id, nama, kategori, luas_m2, keterangan, foto, created_at, ST_AsGeoJSON(geom)::json AS geometry;
      `, [nama, kategori, keterangan, foto, geomJson]);
      inserted = { ...result.rows[0], layer: 'poligon' };

    } else {
      return res.status(400).json({ error: `Tipe geometri '${geomType}' tidak didukung. Gunakan Point, LineString, atau Polygon.` });
    }

    res.status(201).json({
      message: 'Berhasil menyimpan hasil digitasi ke PostGIS',
      feature: inserted,
    });
  } catch (err) {
    console.error('Error insert feature:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Update Fitur (Atribut atau Geometri)
app.put('/api/features/:layer/:id', async (req, res) => {
  const layer = req.params.layer.toLowerCase();
  const id = parseInt(req.params.id, 10);
  const table = LAYER_TABLES[layer];

  if (!table) {
    return res.status(400).json({ error: 'Layer tidak valid' });
  }

  const { nama, kategori, keterangan, geometry } = req.body;

  try {
    if (geometry) {
      const geomJson = JSON.stringify(geometry);
      if (layer === 'titik') {
        await db.query(`
          UPDATE digitasi_titik 
          SET nama = COALESCE($1, nama),
              kategori = COALESCE($2, kategori),
              keterangan = COALESCE($3, keterangan),
              geom = ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)
          WHERE id = $5;
        `, [nama, kategori, keterangan, geomJson, id]);
      } else if (layer === 'garis') {
        await db.query(`
          UPDATE digitasi_garis 
          SET nama = COALESCE($1, nama),
              kategori = COALESCE($2, kategori),
              keterangan = COALESCE($3, keterangan),
              panjang_meter = ROUND(ST_Length(ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)::geography)::numeric, 2),
              geom = ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)
          WHERE id = $5;
        `, [nama, kategori, keterangan, geomJson, id]);
      } else if (layer === 'poligon') {
        await db.query(`
          UPDATE digitasi_poligon 
          SET nama = COALESCE($1, nama),
              kategori = COALESCE($2, kategori),
              keterangan = COALESCE($3, keterangan),
              luas_m2 = ROUND(ST_Area(ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)::geography)::numeric, 2),
              geom = ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)
          WHERE id = $5;
        `, [nama, kategori, keterangan, geomJson, id]);
      }
    } else {
      await db.query(`
        UPDATE ${table} 
        SET nama = COALESCE($1, nama),
            kategori = COALESCE($2, kategori),
            keterangan = COALESCE($3, keterangan)
        WHERE id = $4;
      `, [nama, kategori, keterangan, id]);
    }

    res.json({ message: 'Fitur berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Hapus Fitur
app.delete('/api/features/:layer/:id', async (req, res) => {
  const layer = req.params.layer.toLowerCase();
  const id = parseInt(req.params.id, 10);
  const table = LAYER_TABLES[layer];

  if (!table) {
    return res.status(400).json({ error: 'Layer tidak valid' });
  }

  try {
    const result = await db.query(`DELETE FROM ${table} WHERE id = $1 RETURNING id;`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json({ message: `Fitur ${layer} ID ${id} berhasil dihapus` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 WebGIS Digitasi Server aktif di port ${PORT}`);
  console.log(`🌐 Buka di browser: http://localhost:${PORT}`);
  console.log(`===============================================`);
});


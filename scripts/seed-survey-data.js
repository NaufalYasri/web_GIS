require('dotenv').config();
const { Client } = require('pg');

const surveyPoints = [
  {
    nama: "Taman Alun-Alun dan Hutan Kota Depok",
    kategori: "Ruang Terbuka Hijau",
    keterangan: "Jl. Ali Andong No.17, RT.1/RW.9, Bojongsari Lama, Kec. Bojongsari, Kota Depok (Alun-Alun & Hutan Kota)",
    foto: "/uploads/survey/alun_alun_depok.jpg",
    lat: -6.389838,
    lng: 106.752294
  },
  {
    nama: "Taman Kelurahan Serua",
    kategori: "Ruang Terbuka Hijau",
    keterangan: "Jl. H. Hanafi No.1, RT.1/RW.3, Serua, Kec. Bojongsari, Kota Depok",
    foto: "/uploads/survey/taman_serua.jpg",
    lat: -6.377899,
    lng: 106.741332
  },
  {
    nama: "Puskesmas Duren Seribu",
    kategori: "Fasilitas Kesehatan",
    keterangan: "Jl. Delima No.6, RT.5/RW.2, Duren Seribu, Kec. Bojongsari, Kota Depok",
    foto: "/uploads/survey/puskesmas_duren_seribu.jpg",
    lat: -6.435478,
    lng: 106.745948
  },
  {
    nama: "Halte SDN Bojongsari",
    kategori: "Fasilitas Transportasi",
    keterangan: "Jl. Raya Bojongsari, Bojongsari Lama, Kec. Bojongsari, Kota Depok",
    foto: "/uploads/survey/halte_sdn_bojongsari.jpg",
    lat: -6.397415,
    lng: 106.743018
  },
  {
    nama: "Masjid Nurul Jihad",
    kategori: "Fasilitas Peribadatan",
    keterangan: "Jl. H. Suhaemi No.15-20, Duren Mekar, Kec. Bojongsari, Kota Depok",
    foto: "/uploads/survey/masjid_nurul_jihad.jpg",
    lat: -6.415770,
    lng: 106.739978
  },
  {
    nama: "UPTD Puskesmas Bojongsari",
    kategori: "Fasilitas Kesehatan",
    keterangan: "Jl. Village III, Pd. Petir, Kec. Bojongsari, Kota Depok",
    foto: "/uploads/survey/puskesmas_bojongsari.jpg",
    lat: -6.365278,
    lng: 106.730942
  },
  {
    nama: "Taman Kelurahan Duren Mekar",
    kategori: "Ruang Terbuka Hijau",
    keterangan: "Jl. H. Suhaemi No.55, Duren Mekar, Kec. Bojongsari, Kota Depok",
    foto: "/uploads/survey/taman_duren_mekar.jpg",
    lat: -6.415868,
    lng: 106.740617
  },
  {
    nama: "Kantor Kelurahan Curug",
    kategori: "Fasilitas Pemerintahan",
    keterangan: "Jalan Raya Curug, Curug, Kec. Bojongsari, Kota Depok",
    foto: "/uploads/survey/kelurahan_curug.jpg",
    lat: -6.392652,
    lng: 106.732700
  },
  {
    nama: "Taman Kelurahan Duren Seribu",
    kategori: "Ruang Terbuka Hijau",
    keterangan: "Jl. Sawangan Elok No.24, Duren Seribu, Kec. Bojongsari, Kota Depok (Fasilitas Olahraga & Lapangan)",
    foto: "/uploads/survey/taman_duren_seribu.jpg",
    lat: -6.427973,
    lng: 106.738038
  },
  {
    nama: "Posyandu Seruni RW 06",
    kategori: "Fasilitas Kesehatan",
    keterangan: "Jl. Delima No.6, RT.5/RW.2, Duren Seribu, Kec. Bojongsari, Kota Depok",
    foto: "/uploads/survey/posyandu_seruni.jpg",
    lat: -6.435547,
    lng: 106.745886
  },
  {
    nama: "Kantor Kelurahan Duren Mekar",
    kategori: "Fasilitas Pemerintahan",
    keterangan: "Jl. H. Suhaemi No.55, Duren Mekar, Kec. Bojongsari, Kota Depok",
    foto: "/uploads/survey/kelurahan_duren_mekar.jpg",
    lat: -6.416583,
    lng: 106.740562
  },
  {
    nama: "Masjid Jami' Miftahul Khoirot",
    kategori: "Fasilitas Peribadatan",
    keterangan: "Jl. Mandor Tadjir No.17, RT.1/RW.3, Pd. Petir, Kec. Bojongsari, Kota Depok",
    foto: "/uploads/survey/masjid_miftahul_khoirot.jpg",
    lat: -6.378686,
    lng: 106.736252
  },
  {
    nama: "KUA Bojongsari",
    kategori: "Fasilitas Pemerintahan",
    keterangan: "Jl. Rotan Blok No.76, RT.1/RW.6, Bojongsari Baru, Kec. Bojongsari, Kota Depok",
    foto: "/uploads/survey/kua_bojongsari.jpg",
    lat: -6.385066,
    lng: 106.743800
  }
];

// Contoh digitasi garis (Jalan & Rute di sekitar lokasi survei Bojongsari)
const sampleLines = [
  {
    nama: "Jl. Raya Bojongsari",
    kategori: "Jalan Utama / Arteri",
    keterangan: "Jalan protokol penghubung Sawangan dan Parung yang melewati Halte SDN Bojongsari",
    coords: [
      [106.7421, -6.3930],
      [106.7428, -6.3955],
      [106.7430, -6.3974],
      [106.7435, -6.4010],
      [106.7441, -6.4060]
    ]
  },
  {
    nama: "Jl. H. Suhaemi (Akses Kelurahan Duren Mekar)",
    kategori: "Jalan Kolektor",
    keterangan: "Akses jalan menuju Kantor Kelurahan & Taman Duren Mekar serta Masjid Nurul Jihad",
    coords: [
      [106.7385, -6.4140],
      [106.7399, -6.4157],
      [106.7406, -6.4162],
      [106.7415, -6.4170]
    ]
  },
  {
    nama: "Jl. Delima (Kawasan Duren Seribu)",
    kategori: "Jalan Lokal",
    keterangan: "Jalan akses menuju Puskesmas Duren Seribu & Posyandu Seruni",
    coords: [
      [106.7445, -6.4340],
      [106.7455, -6.4350],
      [106.7459, -6.4355],
      [106.7468, -6.4362]
    ]
  }
];

// Contoh digitasi poligon (Kawasan tapak lahan fasilitas survei di Bojongsari)
const samplePolygons = [
  {
    nama: "Kawasan Taman Alun-Alun & Hutan Kota Depok",
    kategori: "Ruang Terbuka Hijau",
    keterangan: "Area tapak dan danau Alun-Alun dan Hutan Kota Depok Wilayah Barat (Bojongsari)",
    coords: [
      [
        [106.7515, -6.3888],
        [106.7538, -6.3892],
        [106.7535, -6.3912],
        [106.7510, -6.3908],
        [106.7515, -6.3888]
      ]
    ]
  },
  {
    nama: "Kawasan Taman Kelurahan Duren Mekar",
    kategori: "Ruang Terbuka Hijau",
    keterangan: "Area fasilitas taman dan lapangan olahraga Duren Mekar",
    coords: [
      [
        [106.7403, -6.4156],
        [106.7410, -6.4156],
        [106.7410, -6.4162],
        [106.7403, -6.4162],
        [106.7403, -6.4156]
      ]
    ]
  },
  {
    nama: "Kawasan Puskesmas & Posyandu Duren Seribu",
    kategori: "Fasilitas Kesehatan",
    keterangan: "Tapak lahan fasilitas pelayanan kesehatan masyarakat Duren Seribu",
    coords: [
      [
        [106.7456, -6.4352],
        [106.7463, -6.4352],
        [106.7463, -6.4358],
        [106.7456, -6.4358],
        [106.7456, -6.4352]
      ]
    ]
  }
];

async function seedData() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'webgis_digitasi',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    await client.connect();
    console.log('✓ Terhubung ke database webgis_digitasi.');

    // 1. Insert Titik Hasil Survei (13 Titik)
    console.log('\n[1/3] Memasukkan 13 titik survei lapangan Kecamatan Bojongsari...');
    for (const pt of surveyPoints) {
      await client.query(`
        INSERT INTO digitasi_titik (nama, kategori, keterangan, foto, geom)
        VALUES (
          $1, $2, $3, $4,
          ST_SetSRID(ST_MakePoint($5, $6), 4326)
        )
        ON CONFLICT DO NOTHING;
      `, [pt.nama, pt.kategori, pt.keterangan, pt.foto, pt.lng, pt.lat]);
      console.log(`  + [Titik] ${pt.nama} (${pt.lat}, ${pt.lng})`);
    }

    // 2. Insert Garis Jalan (3 LineStrings)
    console.log('\n[2/3] Memasukkan garis jalan penghubung Bojongsari...');
    for (const ln of sampleLines) {
      const geojsonStr = JSON.stringify({
        type: 'LineString',
        coordinates: ln.coords
      });
      await client.query(`
        INSERT INTO digitasi_garis (nama, kategori, keterangan, panjang_meter, geom)
        VALUES (
          $1, $2, $3,
          ROUND(ST_Length(ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)::geography)::numeric, 2),
          ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)
        );
      `, [ln.nama, ln.kategori, ln.keterangan, geojsonStr]);
      console.log(`  + [Garis] ${ln.nama}`);
    }

    // 3. Insert Poligon Tapak Kawasan (3 Polygons)
    console.log('\n[3/3] Memasukkan poligon tapak kawasan fasilitas Bojongsari...');
    for (const pg of samplePolygons) {
      const geojsonStr = JSON.stringify({
        type: 'Polygon',
        coordinates: pg.coords
      });
      await client.query(`
        INSERT INTO digitasi_poligon (nama, kategori, keterangan, luas_m2, geom)
        VALUES (
          $1, $2, $3,
          ROUND(ST_Area(ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)::geography)::numeric, 2),
          ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)
        );
      `, [pg.nama, pg.kategori, pg.keterangan, geojsonStr]);
      console.log(`  + [Poligon] ${pg.nama}`);
    }

    console.log('\n🎉 Semua data survei lapangan Bojongsari berhasil dimasukkan ke PostGIS!');
  } catch (err) {
    console.error('✗ Error seeding data:', err.message);
  } finally {
    await client.end();
  }
}

seedData();


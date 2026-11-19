require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || '';
  const targetDb = process.env.DB_NAME || 'webgis_digitasi';

  console.log(`[1/3] Menghubungkan ke PostgreSQL di ${host}:${port} sebagai user '${user}'...`);

  // 1. Hubungkan ke database default 'postgres' untuk mengecek / membuat targetDb
  const defaultClient = new Client({
    host,
    port,
    database: 'postgres',
    user,
    password,
  });

  try {
    await defaultClient.connect();
    console.log('✓ Terhubung ke PostgreSQL server.');

    // Cek apakah database target sudah ada
    const checkDbRes = await defaultClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1;`,
      [targetDb]
    );

    if (checkDbRes.rows.length === 0) {
      console.log(`Database '${targetDb}' belum ada, sedang membuat database...`);
      // CREATE DATABASE tidak bisa dipanggil dengan parameterized query
      await defaultClient.query(`CREATE DATABASE "${targetDb}";`);
      console.log(`✓ Database '${targetDb}' berhasil dibuat.`);
    } else {
      console.log(`✓ Database '${targetDb}' sudah ada.`);
    }
  } catch (err) {
    console.error('✗ Gagal menghubungkan ke PostgreSQL server:', err.message);
    console.error('\nTips: Periksa apakah password di file .env sudah sesuai.');
    process.exit(1);
  } finally {
    await defaultClient.end();
  }

  // 2. Hubungkan ke targetDb untuk menjalankan schema.sql
  console.log(`\n[2/3] Menghubungkan ke database '${targetDb}'...`);
  const targetClient = new Client({
    host,
    port,
    database: targetDb,
    user,
    password,
  });

  try {
    await targetClient.connect();
    console.log(`✓ Berhasil terhubung ke database '${targetDb}'.`);

    console.log('\n[3/3] Memeriksa & mengaktifkan ekstensi PostGIS serta tabel spasial...');
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await targetClient.query(schemaSql);
    console.log('✓ Ekstensi PostGIS dan tabel spasial (titik, garis, poligon) siap digunakan!');

    // Verifikasi versi postgis
    const postgisVer = await targetClient.query('SELECT PostGIS_Version();');
    console.log(`✓ Versi PostGIS terpasang: ${postgisVer.rows[0].postgis_version}`);
  } catch (err) {
    if (err.message.includes('extension "postgis" is not available')) {
      console.error('\n✗ PERINGATAN: Ekstensi PostGIS belum terinstall di PostgreSQL Anda!');
      console.error('Silakan install PostGIS terlebih dahulu melalui Application Stack Builder atau installer PostGIS.');
    } else {
      console.error('✗ Error saat inisialisasi schema:', err.message);
    }
    process.exit(1);
  } finally {
    await targetClient.end();
  }

  console.log('\n=========================================');
  console.log('🎉 Inisialisasi Database Berhasil Selesai!');
  console.log('💡 Jalankan: npm run seed');
  console.log('   (Untuk otomatis memasukkan 13 titik survei lapangan Bojongsari beserta foto-fotonya!)');
  console.log('=========================================\n');
}

initDatabase();


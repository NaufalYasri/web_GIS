# 🗺️ WebGIS Digitasi Spasial (APSIG)
> Aplikasi Web Digitasi Terintegrasi Database Spasial **PostgreSQL / PostGIS** & **QGIS Desktop**.

Aplikasi ini memungkinkan pengguna melakukan digitasi data spasial kombinasi (**Titik / Point**, **Garis / Polyline**, dan **Poligon / Polygon**) langsung dari web browser menggunakan peta interaktif, menyimpannya secara terpusat ke database PostGIS, dan membukanya secara sinkron (dua arah) di QGIS Desktop.

---

## 🚀 Fitur Utama

- **Digitasi Kombinasi Lengkap**:
  - 📍 **Titik (Point)**: Simbol marker merah dengan koordinat lintang & bujur.
  - 🛣️ **Garis (LineString)**: Pengukuran panjang otomatis dalam meter/kilometer oleh PostGIS.
  - 🟩 **Poligon (Polygon)**: Perhitungan luas area otomatis dalam m²/hektar oleh PostGIS.
- **Peta Interaktif Modern**:
  - Pilihan basemap: OpenStreetMap, Esri World Imagery (Citra Satelit resolusi tinggi), dan CartoDB Positron.
  - Toolbar digitasi Leaflet-Geoman (Draw, Edit, Move, Delete).
  - Skala peta & HUD koordinat kursor langsung (real-time).
- **Manajemen Data & Pencarian**:
  - Filter layer (aktifkan/sembunyikan titik, garis, poligon).
  - Tab data dengan pencarian nama & kategori, serta tombol *Zoom to Feature*.
- **Integrasi Penuh ke QGIS Desktop**:
  - Data yang digambar di web langsung muncul di QGIS Desktop.
  - Mendukung auto-refresh interval di QGIS.

---

## 🛠️ Langkah Menjalankan Aplikasi

### 1. Pasang Ekstensi PostGIS di PostgreSQL (Jika Belum)
1. Buka menu Windows Start &rarr; cari **Application Stack Builder** (atau jalankan `C:\Program Files\PostgreSQL\17\bin\stackbuilder.exe`).
2. Pilih instalasi: `PostgreSQL 17 on port 5432`.
3. Buka menu **Spatial Extensions** &rarr; centang **PostGIS 3.x... Bundle**.
4. Klik **Next** sampai proses instalasi selesai.

### 2. Atur Password Database di File `.env`
Buka file `.env` di folder ini, lalu masukkan password superuser `postgres` kamu:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=webgis_digitasi
DB_USER=postgres
DB_PASSWORD=masukkan_password_postgres_kamu_disini
PORT=3000
```

### 3. Buat Database & Tabel Spasial Otomatis
Jalankan perintah berikut di terminal:
```bash
npm run init-db
```
*Script ini otomatis membuat database `webgis_digitasi`, mengaktifkan ekstensi `postgis`, dan membuat 3 tabel spasial: `digitasi_titik`, `digitasi_garis`, dan `digitasi_poligon`.*

### 4. Jalankan Server Web
```bash
npm start
```
Buka browser di: **[http://localhost:3000](http://localhost:3000)**

---

## 🖥️ Cara Menyambungkan ke QGIS Desktop

1. Buka **QGIS Desktop**.
2. Pada panel sebelah kiri (**Browser Panel**), cari item **PostGIS**.
3. **Klik kanan** pada PostGIS &rarr; pilih **New Connection...**
4. Isi parameter koneksi:
   - **Name**: `WebGIS Digitasi`
   - **Host**: `localhost`
   - **Port**: `5432`
   - **Database**: `webgis_digitasi`
   - **Authentication**: Pilih tab **Basic** &rarr; Masukkan User: `postgres` dan Password PostgreSQL Anda.
5. Klik tombol **Test Connection** (pastikan muncul tulisan *"Connection to WebGIS Digitasi was successful"*), lalu klik **OK**.
6. Pada Browser Panel QGIS, buka folder:
   **PostGIS &rarr; WebGIS Digitasi &rarr; public**
7. Anda akan melihat 3 layer:
   - `digitasi_titik`
   - `digitasi_garis`
   - `digitasi_poligon`
8. **Drag & Drop** ketiga layer tersebut ke Layers Panel QGIS.

### 💡 Tips Auto-Refresh Real-Time di QGIS:
Agar peta di QGIS otomatis terupdate ketika ada yang menggambar di web:
1. Klik kanan salah satu layer di QGIS (misal `digitasi_poligon`) &rarr; pilih **Properties**.
2. Masuk ke tab **Rendering** (di sebelah kiri).
3. Centang opsi **Refresh layer at interval (seconds)** dan ketik **2** detik.
4. Klik **OK**. Ulangi untuk layer lainnya jika diinginkan.


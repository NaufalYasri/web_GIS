-- Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Tabel Digitasi Titik (Point)
CREATE TABLE IF NOT EXISTS digitasi_titik (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    kategori VARCHAR(100),
    keterangan TEXT,
    foto VARCHAR(255),
    geom GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index Spasial untuk Titik
CREATE INDEX IF NOT EXISTS idx_titik_geom ON digitasi_titik USING GIST (geom);

-- 2. Tabel Digitasi Garis (LineString)
CREATE TABLE IF NOT EXISTS digitasi_garis (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    kategori VARCHAR(100),
    panjang_meter DOUBLE PRECISION,
    keterangan TEXT,
    foto VARCHAR(255),
    geom GEOMETRY(LineString, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index Spasial untuk Garis
CREATE INDEX IF NOT EXISTS idx_garis_geom ON digitasi_garis USING GIST (geom);

-- 3. Tabel Digitasi Poligon (Polygon)
CREATE TABLE IF NOT EXISTS digitasi_poligon (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    kategori VARCHAR(100),
    luas_m2 DOUBLE PRECISION,
    keterangan TEXT,
    foto VARCHAR(255),
    geom GEOMETRY(Polygon, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index Spasial untuk Poligon
CREATE INDEX IF NOT EXISTS idx_poligon_geom ON digitasi_poligon USING GIST (geom);

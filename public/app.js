/**
 * WebGIS Digitasi Spasial
 * APSIG - Integrasi PostGIS & QGIS
 */

// ==========================================
// 1. STATE & VARIABEL GLOBAL
// ==========================================
let map;
let layerTitik;
let layerGaris;
let layerPoligon;

let rawFeatures = {
  titik: [],
  garis: [],
  poligon: [],
};

let currentDrawnLayer = null; // Menyimpan layer saat proses menggambar
let activeFilter = 'all';
let searchQuery = '';

// ==========================================
// 2. INISIALISASI PETA & BASEMAP
// ==========================================
function initMap() {
  // Koordinat default: Kecamatan Bojongsari, Kota Depok (Lokasi Hasil Survei)
  map = L.map('map', {
    zoomControl: false,
  }).setView([-6.401, 106.742], 13);

  // Pindahkan zoom control ke kanan atas
  L.control.zoom({ position: 'topright' }).addTo(map);

  // Basemap Providers
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
  });

  const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles © Esri & GIS User Community',
  });

  const cartoLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    attribution: '© CartoDB',
  });

  // Default basemap: OpenStreetMap
  osm.addTo(map);

  // Layer switcher basemap di kanan atas
  const baseMaps = {
    'OpenStreetMap (Standar)': osm,
    'Satelit (Esri World Imagery)': esriSatellite,
    'CartoDB Positron (Terang)': cartoLight,
  };
  L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

  // Skala Peta
  L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

  // Layer groups untuk data PostGIS
  layerTitik = L.geoJSON(null, {
    pointToLayer: createPointMarker,
    onEachFeature: bindFeaturePopup,
  }).addTo(map);

  layerGaris = L.geoJSON(null, {
    style: {
      color: '#f59e0b',
      weight: 4,
      opacity: 0.9,
    },
    onEachFeature: bindFeaturePopup,
  }).addTo(map);

  layerPoligon = L.geoJSON(null, {
    style: {
      color: '#10b981',
      weight: 2.5,
      opacity: 0.9,
      fillColor: '#10b981',
      fillOpacity: 0.35,
    },
    onEachFeature: bindFeaturePopup,
  }).addTo(map);

  // Event HUD Koordinat & Zoom
  map.on('mousemove', (e) => {
    document.getElementById('hud-coords').innerText =
      `Lat: ${e.latlng.lat.toFixed(6)}, Lng: ${e.latlng.lng.toFixed(6)}`;
  });

  map.on('zoomend', () => {
    document.getElementById('hud-zoom').innerText = `Zoom: ${map.getZoom()}`;
  });

  // Inisialisasi Toolbar Digitasi Leaflet-Geoman
  initGeoman();
}

// Custom Marker Titik
function createPointMarker(feature, latlng) {
  return L.circleMarker(latlng, {
    radius: 7,
    fillColor: '#ef4444',
    color: '#ffffff',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.9,
  });
}

// Binding Popup & Info Objek
function bindFeaturePopup(feature, layer) {
  const props = feature.properties || {};
  const layerType = props.layer || 'Objek';

  let metricInfo = '';
  if (layerType === 'garis' && props.panjang_meter) {
    const km = (props.panjang_meter / 1000).toFixed(2);
    metricInfo = `<div><strong>Panjang:</strong> ${props.panjang_meter.toLocaleString('id-ID')} m (${km} km)</div>`;
  } else if (layerType === 'poligon' && props.luas_m2) {
    const ha = (props.luas_m2 / 10000).toFixed(2);
    metricInfo = `<div><strong>Luas:</strong> ${props.luas_m2.toLocaleString('id-ID')} m² (${ha} ha)</div>`;
  }

  const createdDate = props.created_at
    ? new Date(props.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : '-';

  const photoHtml = props.foto
    ? `
      <div class="popup-photo-wrap">
        <a href="${props.foto}" target="_blank" title="Klik untuk perbesar foto">
          <img src="${props.foto}" alt="${escapeHtml(props.nama)}" class="popup-photo" loading="lazy">
        </a>
      </div>
    `
    : '';

  const popupContent = `
    <div class="custom-popup">
      ${photoHtml}
      <div class="popup-header">
        <h4>${escapeHtml(props.nama || 'Tanpa Nama')}</h4>
        <span class="geom-badge ${layerType}">${layerType}</span>
      </div>
      <div class="popup-body">
        <div><strong>Kategori:</strong> ${escapeHtml(props.kategori || 'Umum')}</div>
        ${metricInfo}
        ${props.keterangan ? `<div><strong>Alamat / Info:</strong> ${escapeHtml(props.keterangan)}</div>` : ''}
        <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 4px;">
          <i class="fa-regular fa-clock"></i> ${createdDate}
        </div>
      </div>
      <div class="popup-footer">
        <button class="popup-delete-btn" onclick="deleteFeature('${layerType}', ${props.id})">
          <i class="fa-solid fa-trash-can"></i> Hapus
        </button>
      </div>
    </div>
  `;

  layer.bindPopup(popupContent, { maxWidth: 300 });
}

// ==========================================
// 3. LEAFLET-GEOMAN CONFIG
// ==========================================
function initGeoman() {
  map.pm.addControls({
    position: 'topleft',
    drawMarker: true,
    drawCircleMarker: false,
    drawPolyline: true,
    drawRectangle: true,
    drawPolygon: true,
    drawCircle: false,
    editMode: true,
    dragMode: false,
    cutPolygon: false,
    removalMode: true,
  });

  // Kustomisasi teks tooltip toolbar Geoman
  map.pm.setLang('id');

  // Event saat selesai menggambar objek baru
  map.on('pm:create', (e) => {
    currentDrawnLayer = e.layer;
    const geom = currentDrawnLayer.toGeoJSON().geometry;

    openSaveModal(geom);
  });

  // Event saat objek dihapus melalui tombol delete toolbar geoman
  map.on('pm:remove', (e) => {
    const feature = e.layer.feature;
    if (feature && feature.properties) {
      deleteFeature(feature.properties.layer, feature.properties.id);
    }
  });
}

// ==========================================
// 4. MODAL SIMPAN DIGITASI
// ==========================================
function openSaveModal(geometry) {
  const modal = document.getElementById('modal-save-feature');
  const badge = document.getElementById('modal-geom-badge');
  const metaType = document.getElementById('meta-type');
  const metricLabel = document.getElementById('meta-metric-label');
  const metricVal = document.getElementById('meta-metric-val');

  // Reset form
  document.getElementById('input-nama').value = '';
  document.getElementById('input-kategori').value = '';
  document.getElementById('input-keterangan').value = '';

  let typeName = 'Poligon';
  let badgeClass = 'poligon';

  if (geometry.type === 'Point') {
    typeName = 'Titik (Point)';
    badgeClass = 'titik';
    const coords = geometry.coordinates;
    metricLabel.innerText = 'Koordinat:';
    metricVal.innerText = `${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}`;
  } else if (geometry.type === 'LineString') {
    typeName = 'Garis (Line)';
    badgeClass = 'garis';
    metricLabel.innerText = 'Tipe:';
    metricVal.innerText = `${geometry.coordinates.length} titik simpul`;
  } else if (geometry.type === 'Polygon') {
    typeName = 'Poligon (Polygon)';
    badgeClass = 'poligon';
    metricLabel.innerText = 'Tipe:';
    metricVal.innerText = `${geometry.coordinates[0].length} titik sudut`;
  }

  badge.className = `geom-badge ${badgeClass}`;
  badge.innerText = badgeClass;
  metaType.innerText = typeName;

  modal.classList.add('show');
  setTimeout(() => document.getElementById('input-nama').focus(), 100);
}

function closeSaveModal() {
  const modal = document.getElementById('modal-save-feature');
  modal.classList.remove('show');

  // Jika pembatalan terjadi dan layer belum tersimpan, hapus dari peta
  if (currentDrawnLayer) {
    map.removeLayer(currentDrawnLayer);
    currentDrawnLayer = null;
  }
}

// Submit Form Simpan
document.getElementById('form-save-feature').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentDrawnLayer) return;

  const nama = document.getElementById('input-nama').value.trim();
  const kategori = document.getElementById('input-kategori').value.trim();
  const keterangan = document.getElementById('input-keterangan').value.trim();

  const geojson = currentDrawnLayer.toGeoJSON();

  const payload = {
    type: geojson.geometry.type,
    geometry: geojson.geometry,
    properties: {
      nama,
      kategori,
      keterangan,
    },
  };

  const btnConfirm = document.getElementById('btn-confirm-save');
  btnConfirm.disabled = true;
  btnConfirm.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

  try {
    const res = await fetch('/api/features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Gagal menyimpan ke PostGIS');
    }

    showToast('Objek berhasil disimpan ke PostGIS!', 'success');
    closeSaveModal();

    // Muat ulang data terbaru dari database
    await loadAllFeatures();
  } catch (err) {
    console.error(err);
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    btnConfirm.disabled = false;
    btnConfirm.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan ke PostGIS';
  }
});

// Event Listener Modal Buttons
document.getElementById('btn-cancel-modal').addEventListener('click', closeSaveModal);
document.getElementById('btn-cancel-save').addEventListener('click', closeSaveModal);

// ==========================================
// 5. FETCH & LOAD DATA DARI POSTGIS
// ==========================================
async function loadAllFeatures() {
  try {
    const res = await fetch('/api/features');
    if (!res.ok) throw new Error('Gagal mengambil data dari database.');

    const data = await res.json();

    // Simpan raw data untuk filtering di daftar objek
    rawFeatures.titik = (data.titik && data.titik.features) || [];
    rawFeatures.garis = (data.garis && data.garis.features) || [];
    rawFeatures.poligon = (data.poligon && data.poligon.features) || [];

    // Clear layers
    layerTitik.clearLayers();
    layerGaris.clearLayers();
    layerPoligon.clearLayers();

    // Tambahkan data ke masing-masing layer Leaflet
    if (data.titik && data.titik.features.length > 0) {
      layerTitik.addData(data.titik);
    }
    if (data.garis && data.garis.features.length > 0) {
      layerGaris.addData(data.garis);
    }
    if (data.poligon && data.poligon.features.length > 0) {
      layerPoligon.addData(data.poligon);
    }

    // Update Counter di Header & Sidebar
    updateStatsUI();

    // Render list objek di sidebar
    renderFeatureList();
  } catch (err) {
    console.error('Error load features:', err);
    showToast('Gagal memuat data dari PostGIS', 'error');
  }
}

// Update Angka Statistik
function updateStatsUI() {
  const countTitik = rawFeatures.titik.length;
  const countGaris = rawFeatures.garis.length;
  const countPoligon = rawFeatures.poligon.length;
  const total = countTitik + countGaris + countPoligon;

  document.getElementById('count-titik').innerText = countTitik;
  document.getElementById('count-garis').innerText = countGaris;
  document.getElementById('count-poligon').innerText = countPoligon;

  document.getElementById('badge-count-titik').innerText = countTitik;
  document.getElementById('badge-count-garis').innerText = countGaris;
  document.getElementById('badge-count-poligon').innerText = countPoligon;

  document.getElementById('tab-total-count').innerText = total;
}

// Render Daftar Objek di Tab "Data"
function renderFeatureList() {
  const container = document.getElementById('feature-list-container');
  container.innerHTML = '';

  let list = [];

  if (activeFilter === 'all' || activeFilter === 'titik') {
    list = list.concat(rawFeatures.titik);
  }
  if (activeFilter === 'all' || activeFilter === 'garis') {
    list = list.concat(rawFeatures.garis);
  }
  if (activeFilter === 'all' || activeFilter === 'poligon') {
    list = list.concat(rawFeatures.poligon);
  }

  // Filter Search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter((f) => {
      const nama = (f.properties.nama || '').toLowerCase();
      const kat = (f.properties.kategori || '').toLowerCase();
      return nama.includes(q) || kat.includes(q);
    });
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-map"></i>
        <p>Tidak ada objek yang sesuai.</p>
        <small>Silakan coba kata kunci lain atau lakukan digitasi baru.</small>
      </div>
    `;
    return;
  }

  list.forEach((f) => {
    const props = f.properties || {};
    const layer = props.layer;
    const card = document.createElement('div');
    card.className = 'feature-card';

    let metricText = '';
    if (layer === 'garis' && props.panjang_meter) {
      metricText = `${props.panjang_meter.toLocaleString('id-ID')} m`;
    } else if (layer === 'poligon' && props.luas_m2) {
      metricText = `${props.luas_m2.toLocaleString('id-ID')} m²`;
    }

    let thumbHtml = '';
    if (props.foto) {
      thumbHtml = `
        <div class="card-thumb">
          <img src="${props.foto}" alt="${escapeHtml(props.nama)}" loading="lazy">
        </div>
      `;
    }

    card.innerHTML = `
      <div class="card-layout">
        ${thumbHtml}
        <div class="card-content">
          <div class="card-top">
            <span class="card-title" title="${escapeHtml(props.nama)}">${escapeHtml(props.nama || 'Tanpa Nama')}</span>
            <span class="card-badge badge-${layer}">${layer}</span>
          </div>
          <div class="card-meta">
            <span><i class="fa-solid fa-tag"></i> ${escapeHtml(props.kategori || 'Umum')}</span>
            ${metricText ? `<span>${metricText}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="card-actions">
        <button class="card-btn zoom-btn">
          <i class="fa-solid fa-crosshairs"></i> Lihat di Peta
        </button>
        <button class="card-btn delete" onclick="deleteFeature('${layer}', ${props.id}); event.stopPropagation();">
          <i class="fa-solid fa-trash-can"></i> Hapus
        </button>
      </div>
    `;

    // Klik card untuk zoom ke objek
    card.addEventListener('click', () => {
      zoomToFeature(f);
    });

    container.appendChild(card);
  });
}

// Zoom ke fitur tertentu
function zoomToFeature(feature) {
  const geojsonLayer = L.geoJSON(feature);
  const bounds = geojsonLayer.getBounds();

  if (feature.geometry.type === 'Point') {
    map.flyTo(bounds.getCenter(), 16);
  } else {
    map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 17 });
  }

  // Buka popup layer yang bersangkutan
  let targetGroup = layerTitik;
  if (feature.properties.layer === 'garis') targetGroup = layerGaris;
  if (feature.properties.layer === 'poligon') targetGroup = layerPoligon;

  targetGroup.eachLayer((l) => {
    if (l.feature && l.feature.properties && l.feature.properties.id === feature.properties.id) {
      setTimeout(() => l.openPopup(), 400);
    }
  });
}

// ==========================================
// 6. HAPUS FITUR
// ==========================================
async function deleteFeature(layer, id) {
  if (!confirm(`Apakah Anda yakin ingin menghapus objek ${layer} ini dari PostGIS?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/features/${layer}/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) throw new Error('Gagal menghapus objek.');

    showToast(`Objek ${layer} berhasil dihapus dari PostGIS.`, 'info');
    map.closePopup();
    await loadAllFeatures();
  } catch (err) {
    console.error(err);
    showToast(`Error: ${err.message}`, 'error');
  }
}
window.deleteFeature = deleteFeature;

// ==========================================
// 7. CHECK POSTGIS CONNECTION HEALTH
// ==========================================
async function checkDatabaseHealth() {
  const connIndicator = document.getElementById('conn-status');
  const connText = document.getElementById('conn-text');
  const dot = connIndicator.querySelector('.status-indicator');

  try {
    const res = await fetch('/api/health');
    const data = await res.json();

    if (res.ok && data.status === 'connected') {
      dot.className = 'status-indicator connected';
      connText.innerText = 'PostGIS Terhubung';
      connIndicator.title = `PostGIS: ${data.postgis}\nDatabase: ${data.database}`;
    } else {
      dot.className = 'status-indicator error';
      connText.innerText = 'PostGIS Terputus';
      connIndicator.title = data.message || 'Gagal koneksi database';
    }
  } catch (err) {
    dot.className = 'status-indicator error';
    connText.innerText = 'Koneksi Gagal';
  }
}

// ==========================================
// 8. EVENT LISTENERS UI
// ==========================================

// Toggle Sidebar
document.getElementById('toggle-sidebar-btn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
  setTimeout(() => map.invalidateSize(), 300);
});

// Refresh Data Button
document.getElementById('btn-refresh').addEventListener('click', async () => {
  showToast('Memperbarui data dari database...', 'info');
  await checkDatabaseHealth();
  await loadAllFeatures();
});

// Toggle Layer Visibility
document.getElementById('toggle-layer-titik').addEventListener('change', (e) => {
  if (e.target.checked) map.addLayer(layerTitik);
  else map.removeLayer(layerTitik);
});

document.getElementById('toggle-layer-garis').addEventListener('change', (e) => {
  if (e.target.checked) map.addLayer(layerGaris);
  else map.removeLayer(layerGaris);
});

document.getElementById('toggle-layer-poligon').addEventListener('change', (e) => {
  if (e.target.checked) map.addLayer(layerPoligon);
  else map.removeLayer(layerPoligon);
});

// Sidebar Tab Switching
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));

    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    document.getElementById(tabId).classList.add('active');
  });
});

// Filter Pills in Data Tab
document.querySelectorAll('.filter-pills .pill').forEach((pill) => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.filter-pills .pill').forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');
    activeFilter = pill.getAttribute('data-filter');
    renderFeatureList();
  });
});

// Search input
document.getElementById('input-search').addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderFeatureList();
});

// QGIS Guide Modal
const modalQgis = document.getElementById('modal-qgis-guide');
document.getElementById('btn-qgis-guide').addEventListener('click', () => {
  modalQgis.classList.add('show');
});
document.getElementById('btn-close-qgis-guide').addEventListener('click', () => {
  modalQgis.classList.remove('show');
});
document.getElementById('btn-dismiss-qgis-guide').addEventListener('click', () => {
  modalQgis.classList.remove('show');
});

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-exclamation';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Escape HTML helper
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.toString().replace(/[&<>"']/g, (m) => map[m]);
}

// ==========================================
// 9. STARTUP BOOTSTRAP
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await checkDatabaseHealth();
  await loadAllFeatures();
});


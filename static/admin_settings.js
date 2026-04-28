// ════════════════════════════════════════════════════════
// IdentiFace Admin JS  —  Settings page
// ════════════════════════════════════════════════════════

const _loginTimestamp = Date.now();

// ════════════════════════════════════════════════════════
// MAP
// ════════════════════════════════════════════════════════
let map, marker, circle;

function initMap() {
    const mapEl = document.getElementById('q-map');
    if (!mapEl || typeof L === 'undefined') return;

    let defaultLat    = parseFloat(mapEl.dataset.lat);
    let defaultLng    = parseFloat(mapEl.dataset.lng);
    let defaultRadius = parseFloat(mapEl.dataset.radius);

    if (isNaN(defaultLat))    defaultLat    = 28.6139;
    if (isNaN(defaultLng))    defaultLng    = 77.2090;
    if (isNaN(defaultRadius)) defaultRadius = 20;

    map = L.map('q-map').setView([defaultLat, defaultLng], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map)
        .bindPopup('Drag to set office location');

    circle = L.circle([defaultLat, defaultLng], {
        color: '#6366f1', fillColor: '#6366f1',
        fillOpacity: 0.12, radius: defaultRadius
    }).addTo(map);

    marker.on('dragend', function (e) {
        const pos = e.target.getLatLng();
        setCoordinates(pos.lat.toFixed(6), pos.lng.toFixed(6));
    });

    map.on('click', function (e) {
        const pos = e.latlng;
        marker.setLatLng(pos);
        circle.setLatLng(pos);
        map.panTo(pos);
        setCoordinates(pos.lat.toFixed(6), pos.lng.toFixed(6));
    });
}

function setCoordinates(lat, lng) {
    document.getElementById('office_lat').value = lat;
    document.getElementById('office_lng').value = lng;
    document.getElementById('map-lat-display').textContent = lat;
    document.getElementById('map-lng-display').textContent = lng;
    const r = parseFloat(document.getElementById('radius').value) || 50;
    if (circle) { circle.setLatLng([lat, lng]); circle.setRadius(r); }
    if (marker) marker.setLatLng([lat, lng]);
    document.getElementById('map-radius-display').textContent = r + 'm';
}

function updateMap() {
    const lat = parseFloat(document.getElementById('office_lat').value);
    const lng = parseFloat(document.getElementById('office_lng').value);
    if (!isNaN(lat) && !isNaN(lng) && map) {
        setCoordinates(lat.toFixed(6), lng.toFixed(6));
        map.setView([lat, lng], 16);
    }
}

function useMyLocation() {
    const btn = document.getElementById('use-location-btn');
    if (!btn) return;
    const icon = btn.querySelector('i');
    const span = btn.querySelector('span');

    if (!navigator.geolocation) { showToast('Geolocation not supported', 'error'); return; }

    btn.disabled = true;
    icon.className = 'fas fa-spinner fa-spin';
    span.textContent = 'Locating...';

    navigator.geolocation.getCurrentPosition(
        pos => {
            const lat = pos.coords.latitude.toFixed(6);
            const lng = pos.coords.longitude.toFixed(6);
            setCoordinates(lat, lng);
            if (map) { map.setView([lat, lng], 17); marker.openPopup(); }
            showToast('Location updated successfully', 'success');
            btn.disabled = false;
            icon.className = 'fas fa-location-crosshairs';
            span.textContent = 'Use My Location';
        },
        err => {
            const msg = { 1: 'Permission denied', 2: 'Location unavailable', 3: 'Request timed out' }[err.code] || 'Could not get location';
            showToast(msg, 'error');
            btn.disabled = false;
            icon.className = 'fas fa-location-crosshairs';
            span.textContent = 'Use My Location';
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

// ════════════════════════════════════════════════════════
// DB STATS
// ════════════════════════════════════════════════════════
function fetchDbStats() {
    const body = document.getElementById('db-stats-body');
    if (!body) return;

    fetch('/get_database_stats')
        .then(r => r.json())
        .then(data => {
            const max = data.total_attendance_records || 1;
            body.innerHTML = `
                <div class="q-db-stat">
                    <span class="q-db-key">Total records</span>
                    <div class="q-db-bar-wrap"><div class="q-db-bar" style="width:100%;"></div></div>
                    <span class="q-db-val">${data.total_attendance_records}</span>
                </div>
                <div class="q-db-stat">
                    <span class="q-db-key">Today's records</span>
                    <div class="q-db-bar-wrap"><div class="q-db-bar" style="width:${Math.round(data.today_attendance_count / max * 100)}%;background:#059669;"></div></div>
                    <span class="q-db-val">${data.today_attendance_count}</span>
                </div>
                <div class="q-db-stat">
                    <span class="q-db-key">Unique persons</span>
                    <div class="q-db-bar-wrap"><div class="q-db-bar" style="width:${Math.round(data.unique_persons / max * 100)}%;background:#7c3aed;"></div></div>
                    <span class="q-db-val">${data.unique_persons}</span>
                </div>
                <div class="q-db-stat">
                    <span class="q-db-key">Known faces in DB</span>
                    <div class="q-db-bar-wrap"><div class="q-db-bar" style="width:${Math.round(data.known_faces_in_csv / max * 100)}%;background:#0891b2;"></div></div>
                    <span class="q-db-val">${data.known_faces_in_csv}</span>
                </div>`;
        }).catch(() => {});
}

// ════════════════════════════════════════════════════════
// LOGIN PAGE LOGIC
// ════════════════════════════════════════════════════════
function togglePw() {
    const inp = document.getElementById('password');
    const ic  = document.getElementById('pw-icon');
    if (!inp || !ic) return;
    const show = inp.type === 'password';
    inp.type     = show ? 'text' : 'password';
    ic.className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
}

function initLoginSpinner() {
    const btn = document.getElementById('login-btn');
    if (!btn) return;
    const form = btn.closest('form');
    if (form) {
        form.addEventListener('submit', () => {
            btn.disabled  = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in…';
        });
    }
}

// ════════════════════════════════════════════════════════
// DOM READY
// ════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    fetchDbStats();
});
// ════════════════════════════════════════════════════════
// IdentiFace Admin JS  —  All functions
// ════════════════════════════════════════════════════════
// ── Session expiry state ──────────────────────────────
let _sessionExpired  = false;
let _lastGoodPresent = null;
let _lastGoodOnsite  = null;
let _lastGoodRemote  = null;
let _lastGoodPending = null;

async function adminFetch(url) {
    const r = await fetch(url);
    if (r.status === 401) {
        handleSessionExpiry();
        return null;
    }
    return r;
}

function handleSessionExpiry() {
    if (_sessionExpired) return;
    _sessionExpired = true;

    const bar = document.getElementById('q-minibar') || document.querySelector('.q-minibar');
    if (bar) {
        const banner = document.createElement('div');
        banner.id = 'session-expired-banner';
        banner.style.cssText = `
            flex:1; margin:0 12px 0 0; padding:8px 14px;
            background:rgba(239,68,68,.12); border:1px solid rgba(239,68,68,.3);
            border-radius:8px; font-size:12.5px; color:#ef4444;
            display:flex; align-items:center; gap:10px;
        `;
        banner.innerHTML = `
            <i class="fas fa-lock"></i>
            <span style="flex:1;">Session expired — data shown is from your last refresh.</span>
            <a href="/admin/login" style="font-weight:700;color:#ef4444;
               border:1px solid rgba(239,68,68,.4); padding:3px 10px;
               border-radius:6px; text-decoration:none; white-space:nowrap;">
               Log in again →
            </a>`;
        bar.prepend(banner);
    }
}

// ── Theme ─────────────────────────────────────────────


// ── Toast ─────────────────────────────────────────────


// ── Time formatter ────────────────────────────────────
function formatDbTime(rawStr, isUtc = false) {
    if (!rawStr) return '—';
    try {
        // Append Z only for UTC-stored timestamps so JS converts to local time
        const iso = rawStr.replace(' ', 'T') + (isUtc ? 'Z' : '');
        const d   = new Date(iso);
        if (isNaN(d)) return rawStr;
        return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) +
               ' ' + d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true });
    } catch { return rawStr; }
}

// ── Avatar ────────────────────────────────────────────
const AV_COLORS = [
    {bg:'#ede9fe',color:'#5b21b6'},{bg:'#dbeafe',color:'#1e40af'},
    {bg:'#dcfce7',color:'#166534'},{bg:'#fef3c7',color:'#92400e'},
    {bg:'#ffe4e6',color:'#9f1239'},{bg:'#cffafe',color:'#155e75'},
];
function avColor(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AV_COLORS.length;
    return AV_COLORS[h];
}
function avHtml(name) {
    const c = avColor(name);
    return `<div class="q-av" style="background:${c.bg};color:${c.color};">${(name||'?')[0].toUpperCase()}</div>`;
}

// ── Pill helpers ──────────────────────────────────────
function typePill(type) {
    if (!type || type === '—') return '<span style="color:var(--text-400)">—</span>';
    const cls = type === 'onsite' ? 'pill-onsite' : 'pill-remote';
    return `<span class="q-pill ${cls}">${type}</span>`;
}
function emptyState(icon, title, sub) {
    return `<div class="q-empty">
        <div class="q-empty-icon"><i class="fas fa-${icon}" style="font-size:24px;color:var(--text-400);"></i></div>
        <div class="q-empty-title">${title}</div>
        <div class="q-empty-sub">${sub}</div>
    </div>`;
}
function getStatusConfig(status) {
    const map = {
        pending:  { cls:'pill-pending',  label:'Pending'  },
        approved: { cls:'pill-approved', label:'Approved' },
        active:   { cls:'pill-active',   label:'Active'   },
        rejected: { cls:'pill-rejected', label:'Rejected' },
    };
    return map[status] || { cls:'', label: status };
}

// ── Badge helpers ─────────────────────────────────────

// ── Admin profile card ────────────────────────────────
const _loginTimestamp = Date.now();







// ── Alert banners ─────────────────────────────────────


// ── Navigation ────────────────────────────────────────
const ALL_TABS = ['today','all','range','registrations','biometrics','heatmap','analytics'];

function switchTab(name) {
    document.querySelectorAll('.q-tab').forEach(t =>
        t.classList.toggle('active', t.dataset.tab === name));
    ALL_TABS.forEach(n => {
        const el = document.getElementById('tab-' + n);
        if (el) el.style.display = n === name ? 'block' : 'none';
    });
    document.querySelectorAll('.q-sidebar-item[data-tab]').forEach(item =>
        item.classList.toggle('active', item.dataset.tab === name));

    // Scroll tabs module into view whenever a tab is switched
    const bar = document.getElementById('q-tabs-bar');
    if (bar) bar.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (name === 'all')            fetchAllAttendance();
    if (name === 'biometrics')     fetchBiometricRequests();
    if (name === 'registrations')  fetchRegistrations();
    if (name === 'analytics')      initAnalytics();
    if (name === 'heatmap')        initHeatmapNames();
}

function toggleFeed(enabled) {
    const area  = document.getElementById('feed-area');
    const badge = document.getElementById('feed-live-badge');
    const label = document.getElementById('feed-toggle-label');
    if (!area) return;
    if (enabled) {
        area.innerHTML = '';
        const img = document.createElement('img');
        img.src = '/video_feed?t=' + Date.now();
        img.alt = 'Live Feed';
        img.style.cssText = 'width:100%;display:block;';
        img.onerror = () => {
            area.innerHTML = '<div class="q-video-placeholder"><div class="q-video-placeholder-icon"><i class="fas fa-exclamation-triangle" style="color:#d97706;"></i></div><div class="q-video-placeholder-text">Could not connect to camera<br>Check server is running</div></div>';
            if (badge) badge.style.display = 'none';
            if (label) label.textContent = 'Enable feed';
            const toggle = document.getElementById('feed-toggle');
            if (toggle) toggle.checked = false;
        };
        area.appendChild(img);
        if (badge) badge.style.display = 'inline-flex';
        if (label) label.textContent = 'Disable feed';
    } else {
        area.innerHTML = '<div class="q-video-placeholder"><div class="q-video-placeholder-icon"><i class="fas fa-video-slash"></i></div><div class="q-video-placeholder-text">Live feed is disabled<br>Toggle to enable the camera stream</div></div>';
        if (badge) badge.style.display = 'none';
        if (label) label.textContent = 'Enable feed';
    }
}

// ════════════════════════════════════════════════════════
// SPARKLINES
// ════════════════════════════════════════════════════════

let _allRecordsCache = null;
let _allRecordsCacheTime = 0;

async function getAllRecordsCached() {
    const now = Date.now();
    if (_allRecordsCache && (now - _allRecordsCacheTime) < 90000) return _allRecordsCache;
    try {
        const r = await fetch('/admin/api/attendance/all');
        _allRecordsCache = await r.json();
        _allRecordsCacheTime = now;
    } catch(e) { _allRecordsCache = []; }
    return _allRecordsCache;
}

function buildSparkPoints(values) {
    if (!values || values.length === 0) return { line: '', area: '' };
    const max = Math.max(...values, 1);
    const n = values.length;
    const pts = values.map((v, i) => {
        const x = n === 1 ? 50 : (i / (n - 1)) * 98 + 1;
        const y = 30 - (v / max) * 26;
        return [x, y];
    });
    const line = pts.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${pts[0][0].toFixed(1)},31 ` +
        pts.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ') +
        ` ${pts[pts.length-1][0].toFixed(1)},31`;
    return { line, area };
}

function renderSparkline(lineId, areaId, values) {
    const { line, area } = buildSparkPoints(values);
    const lineEl = document.getElementById(lineId);
    const areaEl = document.getElementById(areaId);
    if (lineEl) lineEl.setAttribute('points', line);
    if (areaEl) areaEl.setAttribute('points', area);
}

async function fetchSparklineData() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    }
    const fromDate = days[0];
    const toDate   = days[6];   // today

    // Fetch both in parallel — range gives history, today gives type breakdown
    let rangeRecs = [], todayRecs = [];
    try {
        const [rr, tr] = await Promise.all([
            fetch(`/admin/api/attendance/range?from=${fromDate}&to=${toDate}`).then(r => r.ok ? r.json() : []),
            fetch('/admin/api/attendance/today').then(r => r.ok ? r.json() : []),
        ]);
        rangeRecs = Array.isArray(rr) ? rr : [];
        todayRecs = Array.isArray(tr) ? tr : [];
    } catch(e) {}

    // Merge: range gives date+count for all 7 days; today gives Type for today
    // Build a map of today's records keyed by name so we can look up Type
    const todayTypeMap = {};
    todayRecs.forEach(r => { if (r.Name) todayTypeMap[r.Name] = (r.Type || '').toLowerCase(); });

    const totalByDay  = {};
    const onsiteByDay = {};
    const remoteByDay = {};
    days.forEach(d => { totalByDay[d] = 0; onsiteByDay[d] = 0; remoteByDay[d] = 0; });

    // Use range records for total + historical type if available
    rangeRecs.forEach(r => {
        const d = r.Date || r.date;
        // Type comes from range if app.py is updated, else fall back to today map for today
        const t = (r.Type || r.type || (d === toDate ? todayTypeMap[r.Name] : '') || '').toLowerCase();
        if (d && totalByDay.hasOwnProperty(d)) {
            totalByDay[d]++;
            if (t === 'onsite') onsiteByDay[d]++;
            if (t === 'remote') remoteByDay[d]++;
        }
    });

    // If range returned nothing at all, fall back to today only
    if (rangeRecs.length === 0 && todayRecs.length > 0) {
        todayRecs.forEach(r => {
            const t = (r.Type || '').toLowerCase();
            totalByDay[toDate]++;
            if (t === 'onsite') onsiteByDay[toDate]++;
            if (t === 'remote') remoteByDay[toDate]++;
        });
    }

    const totalVals  = days.map(d => totalByDay[d]);
    const onsiteVals = days.map(d => onsiteByDay[d]);
    const remoteVals = days.map(d => remoteByDay[d]);

    if (Math.max(...totalVals) === 0) return;

    // Accent tile sparkline
    const { line: tl, area: ta } = buildSparkPoints(totalVals);
    const lineEl = document.getElementById('bento-spark-line');
    const areaEl = document.getElementById('bento-spark-area');
    if (lineEl) lineEl.setAttribute('points', tl);
    if (areaEl) areaEl.setAttribute('points', ta);

    // Row-2 small sparklines
    renderSparkline('spark-present', 'spark-present-area', totalVals);
    renderSparkline('spark-onsite',  'spark-onsite-area',  onsiteVals);
    renderSparkline('spark-remote',  'spark-remote-area',  remoteVals);

    // Trend text
    const diff = totalVals[6] - totalVals[5];
    const sub  = document.getElementById('stat-present-sub');
    if (sub) {
        if (diff > 0)      sub.textContent = `↑ +${diff} vs yesterday`;
        else if (diff < 0) sub.textContent = `↓ ${diff} vs yesterday`;
        else               sub.textContent = `= same as yesterday`;
    }
}

// ════════════════════════════════════════════════════════
// PERIOD SWITCHER
// ════════════════════════════════════════════════════════

let _currentPeriod          = 'today';
let _currentAnalyticsPeriod = 'today';
function setPeriod(p) {
    _currentPeriod = p;
    document.querySelectorAll('#period-switcher .q-period-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.period === p));
    fetchStatCards();
}
function setAnalyticsPeriod(p) {
    _currentAnalyticsPeriod = p;
    document.querySelectorAll('[data-apd]').forEach(b =>
        b.classList.toggle('active', b.dataset.apd === p));
    initAnalytics();
}
// Returns { from, to, label } for a given period key
function getPeriodDates(p) {
    const now = new Date();
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const today = fmt(now);
    if (p === 'today') {
        return { from: today, to: today, label: 'today', shortLabel: 'Today' };
    }
    if (p === 'week') {
        const mon = new Date(now);
        mon.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
        return { from: fmt(mon), to: today, label: 'this week', shortLabel: 'This week' };
    }
    if (p === 'month') {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: fmt(first), to: today, label: 'this month', shortLabel: 'This month' };
    }
    return { from: today, to: today, label: 'today', shortLabel: 'Today' };
}

// ── Progress rings ────────────────────────────────────
// circumference of r=17 circle = 2π×17 ≈ 106.8 ≈ 107
const RING_CIRC = 107;

function setRing(id, pctId, pct, labelOverride) {
    // console.log('setRing:', id, 'pct=', pct, 'RING_CIRC=', RING_CIRC);
    const ring = document.getElementById(id);
    const lbl  = document.getElementById(pctId);
    if (!ring || !lbl) return;
    const fill = Math.round((Math.min(pct , 100)/100) * RING_CIRC);
    // Animate by setting stroke-dasharray
    ring.style.transition = 'stroke-dasharray .7s cubic-bezier(.4,0,.2,1)';
    ring.style.strokeDasharray = `${fill} ${RING_CIRC}`;
    lbl.textContent = labelOverride !== undefined ? labelOverride : (pct + '%');
}

function updateRings(present, onsite, remote, pending, roster, period) {
    // ── RESET all rings to 0 ──
    document.querySelectorAll('.q-ring-progress').forEach(el => {
        el.style.transition = 'none';
        el.setAttribute('stroke-dasharray', `0 ${RING_CIRC}`);  // ← match your approach
    });
    console.log('updateRings called:', { present, onsite, remote, pending, roster, period });
    const pd = getPeriodDates(period);

    // ── Calculate percentages BEFORE the rAF ──
    let presentPct, presentLabel;
    if (period === 'today' && roster > 0) {
        presentPct   = Math.round(present / roster * 100);
        presentLabel = `${presentPct}%`;
    } else {
        presentLabel = present;
        presentPct   = roster > 0 ? Math.round(present / roster * 100) : Math.min(present * 10, 100);
    }
    const onsitePct  = present > 0 ? Math.round(onsite  / present * 100) : 0;
    const remotePct  = present > 0 ? Math.round(remote  / present * 100) : 0;
    const pendingPct = Math.min(100, Math.round(pending / 10 * 100));

    // ── Animate rings AFTER browser paints the reset ──
    requestAnimationFrame(() => requestAnimationFrame(() => {
        setRing('ring-present', 'ring-present-pct', presentPct, presentLabel);
        setRing('ring-onsite',  'ring-onsite-pct',  onsitePct);
        setRing('ring-remote',  'ring-remote-pct',  remotePct);
        setRing('ring-pending', 'ring-pending-pct',
            pending > 0 ? pendingPct : 0,
            pending > 0 ? pending    : '✓');
    }));

    // ── Sub-labels (no animation needed, update immediately) ──
    const s = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    s('stat-onsite-sub',  present > 0 ? `${onsitePct}% of ${pd.shortLabel.toLowerCase()}` : pd.shortLabel);
    s('stat-remote-sub',  present > 0 ? `${remotePct}% of ${pd.shortLabel.toLowerCase()}` : pd.shortLabel);
    s('stat-pending-sub', pending > 0 ? '⏳ awaiting review' : '✓ none pending');
    s('bento-date-label', pd.shortLabel);
}


async function fetchStatCards() {
    const pd = getPeriodDates(_currentPeriod);

    // ── CHANGE 1: swap Promise.all fetch() calls with adminFetch ──
    const bioRes = await adminFetch('/admin/biometrics/pending');
    const regRes = await adminFetch('/admin/registrations/pending');
    if (!bioRes || !regRes) return;  // session expired — banner shown, tiles keep last values

    // ── CHANGE 2: parse from the response objects ──
    const bio = await bioRes.json().catch(() => []);
    const reg = await regRes.json().catch(() => []);

    const bioPend   = bio.filter(r => r.status === 'pending').length;
    const regPend   = reg.filter(r => r.status === 'pending').length;
    const totalPend = bioPend + regPend;

    // Fetch attendance for selected period — unchanged
    let records = [];
    if (_currentPeriod === 'today') {
        records = await fetch('/admin/api/attendance/today').then(r => r.json()).catch(() => []);
    } else {
        records = await fetch(`/admin/api/attendance/range?from=${pd.from}&to=${pd.to}`)
            .then(r => r.json()).catch(() => []);
    }
    if (!Array.isArray(records)) records = [];

    const present = records.length;
    const onsite  = records.filter(r => (r.Type || r.type || '').toLowerCase() === 'onsite').length;
    const remote  = records.filter(r => (r.Type || r.type || '').toLowerCase() === 'remote').length;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('stat-present', present);
    set('stat-onsite',  onsite);
    set('stat-remote',  remote);
    set('stat-pending', totalPend);

    const dot = document.getElementById('notif-dot');
    if (dot) dot.style.display = totalPend > 0 ? 'block' : 'none';

    updateAlertBanners(bioPend, regPend);
    updateBadge('biometrics-pending-badge', bioPend);
    updateBadge('registrations-pending-badge', regPend);
    updateBadge('sb-bio-badge', bioPend);
    updateBadge('sb-reg-badge', regPend);

    const all = await getAllRecordsCached().catch(() => []);
    const roster = Array.isArray(all) ? new Set(all.map(r => r.Name)).size : 0;
    updateRings(present, onsite, remote, totalPend, roster, _currentPeriod);

    // ── CHANGE 3: cache last good values — always at the very end ──
    _lastGoodPresent = present;
    _lastGoodOnsite  = onsite;
    _lastGoodRemote  = remote;
    _lastGoodPending = totalPend;
}

// ── Realtime log ──────────────────────────────────────
function fetchRealtimeLog() {
    fetch('/admin/api/attendance/today')
        .then(r => r.json())
        .then(data => {
            const body = document.getElementById('realtime-log-body');
            if (!body) return;
            if (!data.length) {
                body.innerHTML = emptyState('clipboard-list', 'No records yet', "Today's recognitions will appear here");
                return;
            }
            body.innerHTML = data.map((r, i) => `
                <div class="q-log-row" style="animation-delay:${i * 0.04}s;">
                    ${avHtml(r.Name)}
                    <div>
                        <div class="q-log-name">${r.Name}</div>
                        <div class="q-log-sub">${r.Time || '—'}</div>
                    </div>
                    <div style="margin-left:auto;">${typePill(r.Type)}</div>
                </div>`).join('');
        }).catch(() => {});
}

// ── Today bento log list ──────────────────────────────
let _todayData      = [];
let _monthlyStats   = {};
let _activeFilter   = 'all';

function fetchTodayAttendance() {
    fetch('/admin/api/attendance/today')
        .then(r => r.json())
        .then(data => {
            _todayData = Array.isArray(data) ? data : [];
            const body = document.getElementById('bento-log-body');
            const cnt  = document.getElementById('bento-today-count');
            if (cnt) cnt.textContent = _todayData.length;

            if (!body) return;
            if (!_todayData.length) {
                body.innerHTML = emptyState('calendar-day', 'No attendance today', 'No one has marked attendance yet');
                return;
            }
            body.innerHTML = _todayData.map((r, i) => `
                <div class="q-log-row" style="animation-delay:${i * 0.03}s;cursor:pointer;"
                     onclick="openPersonHeatmap('${r.Name}')">
                    ${avHtml(r.Name)}
                    <div style="flex:1;min-width:0;">
                        <div class="q-log-name">${r.Name}</div>
                        <div class="q-log-sub">${r.Time || '—'}</div>
                    </div>
                    <div style="margin-left:auto;">${typePill(r.Type)}</div>
                </div>`).join('');

            // update bento avatar row
            const avRow = document.getElementById('bento-avatar-row');
            if (avRow) {
                const show = _todayData.slice(0, 6);
                avRow.innerHTML = show.map(r => {
                    const c = avColor(r.Name);
                    const ini = r.Name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
                    return `<div class="q-bento-av" style="background:${c.bg};color:${c.color};" title="${r.Name}">${ini}</div>`;
                }).join('') + (_todayData.length > 6
                    ? `<div class="q-bento-av" style="background:var(--bg-surface-2);color:var(--text-500);">+${_todayData.length - 6}</div>`
                    : '');
            }
        }).catch(() => {
            const body = document.getElementById('bento-log-body');
            if (body) body.innerHTML = emptyState('exclamation-circle', 'Failed to load', 'Check server connection');
        });
}

// dead-code stubs — keep so nothing throws if called
function filterCards() {}
function renderTodayCards() {}
function loadMonthlyStats() {}
function buildMonthlyBar() { return ''; }
function openPersonHeatmap(name) {
    const inp = document.getElementById('heatmap-search-input');
    if (inp) inp.value = name;
    switchTab('heatmap');
    loadHeatmap(name, getCurrentMonthStr());
}

// ── All records ───────────────────────────────────────
function fetchAllAttendance() {
    const tbody = document.getElementById('all-attendance-body');
    if (tbody) tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Loading...</td></tr>';
    fetch('/admin/api/attendance/all')
        .then(r => r.json())
        .then(data => {
            if (!tbody) return;
            if (!data.length) {
                tbody.innerHTML = `<tr class="empty-row"><td colspan="5">${emptyState('inbox','No records','The attendance database is empty')}</td></tr>`;
                return;
            }
            tbody.innerHTML = data.map((r, i) => `
                <tr>
                    <td style="color:var(--text-400);">${i+1}</td>
                    <td><div style="display:flex;align-items:center;gap:8px;">${avHtml(r.Name)}<span>${r.Name}</span></div></td>
                    <td>${r.Date || '—'}</td>
                    <td style="font-variant-numeric:tabular-nums;">${r.Time || '—'}</td>
                    <td>${typePill(r.Type)}</td>
                </tr>`).join('');
        }).catch(() => {
            if (tbody) tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Failed to load</td></tr>';
        });
}

// ── Date range ────────────────────────────────────────
function fetchRangeAttendance() {
    const from  = document.getElementById('fromDate').value;
    const to    = document.getElementById('toDate').value;
    const tbody = document.getElementById('range-attendance-body');
    if (!from || !to) { showToast('Please select both dates', 'error'); return; }
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4">Loading...</td></tr>';
    fetch(`/admin/api/attendance/range?from=${from}&to=${to}`)
        .then(r => r.json())
        .then(data => {
            if (!data.length) {
                tbody.innerHTML = `<tr class="empty-row"><td colspan="4">${emptyState('search','No records found','No attendance in this date range')}</td></tr>`;
                return;
            }
            tbody.innerHTML = data.map((r, i) => `
                <tr>
                    <td style="color:var(--text-400);">${i+1}</td>
                    <td><div style="display:flex;align-items:center;gap:8px;">${avHtml(r.Name)}<span>${r.Name}</span></div></td>
                    <td>${r.Date || '—'}</td>
                    <td>${r.Time || '—'}</td>
                </tr>`).join('');
        }).catch(() => {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="4">Failed to load</td></tr>';
        });
}

// ── Registrations ─────────────────────────────────────
function fetchRegistrations() {
    const body = document.getElementById('registrations-body');
    if (!body) return;
    body.innerHTML = '<div class="q-empty"><div class="q-empty-title">Loading...</div></div>';
    fetch('/admin/registrations/pending')
        .then(r => r.json())
        .then(data => {
            updateBadge('registrations-pending-badge', data.filter(r => r.status === 'pending').length);
            updateBadge('sb-reg-badge', data.filter(r => r.status === 'pending').length);
            if (!data.length) {
                body.innerHTML = emptyState('user-plus', 'No registration requests', 'New user registrations will appear here');
                return;
            }
            body.innerHTML = data.map(req => {
                const cfg = getStatusConfig(req.status);
                const isPending = req.status === 'pending';
                return `<div class="q-bio-card" id="reg-card-${req.id}">
                    <div class="q-bio-placeholder"><i class="fas fa-user"></i></div>
                    <div class="q-bio-info">
                        <div class="q-bio-name">${req.name}</div>
                        <div class="q-bio-meta"><i class="fas fa-envelope" style="color:var(--text-400)"></i>${req.email}</div>
                        <div class="q-bio-meta"><i class="fas fa-key" style="color:var(--text-400)"></i>Password: ••••••••</div>
                        <div class="q-bio-meta"><i class="fas fa-clock" style="color:var(--text-400)"></i>${formatDbTime(req.created_at, false)}</div>
                        <span class="q-pill ${cfg.cls}" style="font-size:11px;">${cfg.label}</span>
                    </div>
                    <div class="q-bio-actions">
                        ${isPending
                            ? `<button class="q-btn q-btn-success q-btn-sm" onclick="approveRegistration(${req.id})"><i class="fas fa-check"></i> Approve</button>
                               <button class="q-btn q-btn-danger q-btn-sm"  onclick="rejectRegistration(${req.id})"><i class="fas fa-times"></i> Reject</button>`
                            : `<span style="font-size:12px;color:var(--text-400)">Reviewed</span>`}
                    </div>
                </div>`;
            }).join('');
        }).catch(err => {
            body.innerHTML = `<div class="q-alert q-alert-warn" style="margin:16px;">Failed to load: ${err}</div>`;
        });
}

function approveRegistration(id) {
    if (!confirm('Approve this user? They will be able to log in immediately.')) return;
    fetch('/admin/registrations/approve', {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id})
    }).then(r => r.json()).then(data => {
        if (data.success) {
            showToast('User approved — they can now log in', 'success');
            updateCardInPlace('reg-card-' + id, 'active');
            adjustBadge('registrations-pending-badge', -1);
            adjustBadge('sb-reg-badge', -1);
            checkGlobalAlerts();
        } else showToast(data.error || 'Could not approve', 'error');
    }).catch(() => showToast('Network error', 'error'));
}

function rejectRegistration(id) {
    if (!confirm('Reject this registration request?')) return;
    fetch('/admin/registrations/reject', {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id})
    }).then(r => r.json()).then(data => {
        if (data.success) {
            showToast('Registration rejected', 'warning');
            updateCardInPlace('reg-card-' + id, 'rejected');
            adjustBadge('registrations-pending-badge', -1);
            adjustBadge('sb-reg-badge', -1);
            checkGlobalAlerts();
        } else showToast(data.error || 'Could not reject', 'error');
    }).catch(() => showToast('Network error', 'error'));
}

// ── Biometrics ────────────────────────────────────────
function fetchBiometricRequests() {
    const body = document.getElementById('biometrics-body');
    if (!body) return;
    body.innerHTML = '<div class="q-empty"><div class="q-empty-title">Loading...</div></div>';
    fetch('/admin/biometrics/pending')
        .then(r => r.json())
        .then(data => {
            updateBadge('biometrics-pending-badge', data.filter(r => r.status === 'pending').length);
            updateBadge('sb-bio-badge', data.filter(r => r.status === 'pending').length);
            if (!data.length) {
                body.innerHTML = emptyState('fingerprint', 'No biometric requests', 'Face registration requests will appear here');
                return;
            }
            body.innerHTML = data.map(req => {
                const cfg = getStatusConfig(req.status);
                const isPending = req.status === 'pending';
                const photoUrl = req.status === 'approved'
                                ? `/approved_photo/${encodeURIComponent(req.name)}`
                                : req.photo
                                ? `/pending_photo/${encodeURIComponent(req.name)}/${req.photo}`
                                : `/pending_photo/${encodeURIComponent(req.name)}`;
                return `<div class="q-bio-card" id="bio-card-${req.id}">
                    <img src="${photoUrl}" class="q-bio-photo"
                         onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" alt="${req.name}" style="cursor:pointer;" onclick="window.open('${photoUrl}', '_blank')">
                    <div class="q-bio-placeholder" style="display:none;"><i class="fas fa-user"></i></div>
                    <div class="q-bio-info">
                        <div class="q-bio-name">${req.name}</div>
                        <div class="q-bio-meta"><i class="fas fa-clock" style="color:var(--text-400)"></i>${formatDbTime(req.timestamp, false)}</div>
                        <span class="q-pill ${cfg.cls}" style="font-size:11px;">${cfg.label}</span>
                    </div>
                    <div class="q-bio-actions">
                        ${isPending
                            ? `<button class="q-btn q-btn-success q-btn-sm" onclick="approveBiometrics('${req.name}',${req.id})"><i class="fas fa-check"></i> Approve</button>
                               <button class="q-btn q-btn-danger q-btn-sm"  onclick="rejectBiometrics('${req.name}',${req.id})"><i class="fas fa-times"></i> Reject</button>`
                            : `<span style="font-size:12px;color:var(--text-400)">Reviewed</span>`}
                    </div>
                </div>`;
            }).join('');
        }).catch(err => {
            body.innerHTML = `<div class="q-alert q-alert-warn" style="margin:16px;">Failed to load: ${err}</div>`;
        });
}

function approveBiometrics(name, id) {
    if (!confirm(`Approve face registration for "${name}"?`)) return;
    fetch('/admin/biometrics/approve', {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name})
    }).then(r => r.json()).then(data => {
        if (data.success) {
            showToast(`${name} approved — face will be registered within 60s`, 'success');
            updateCardInPlace('bio-card-' + id, 'approved');
            adjustBadge('biometrics-pending-badge', -1);
            adjustBadge('sb-bio-badge', -1);
            checkGlobalAlerts();
            fetchBiometricRequests();
        } else showToast(data.error || 'Could not approve', 'error');
    }).catch(() => showToast('Network error', 'error'));
}

function rejectBiometrics(name, id) {
    if (!confirm(`Reject biometric request from "${name}"? Photo will be deleted.`)) return;
    fetch('/admin/biometrics/reject', {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name})
    }).then(r => r.json()).then(data => {
        if (data.success) {
            showToast(`${name}'s request rejected`, 'warning');
            updateCardInPlace('bio-card-' + id, 'rejected');
            adjustBadge('biometrics-pending-badge', -1);
            adjustBadge('sb-bio-badge', -1);
            checkGlobalAlerts();
            fetchBiometricRequests();
        } else showToast(data.error || 'Could not reject', 'error');
    }).catch(() => showToast('Network error', 'error'));
}

// ── Card in-place update ──────────────────────────────
function updateCardInPlace(cardId, newStatus) {
    const card = document.getElementById(cardId);
    if (!card) return;
    const cfg = getStatusConfig(newStatus);
    const badge = card.querySelector('.q-pill');
    if (badge) { badge.className = `q-pill ${cfg.cls}`; badge.textContent = cfg.label; }
    const actions = card.querySelector('.q-bio-actions');
    if (actions) actions.innerHTML = '<span style="font-size:12px;color:var(--text-400)">Reviewed</span>';
}

// ════════════════════════════════════════════════════════
// HEATMAP
// ════════════════════════════════════════════════════════

let _hmNames = [];
let _hmCurrentName = '';
let _hmCurrentMonth = '';

async function initHeatmapNames() {
    if (_hmNames.length) return; // already loaded
    try {
        const records = await getAllRecordsCached();
        if (Array.isArray(records)) {
            const nameSet = new Set(records.map(r => r.Name).filter(Boolean));
            _hmNames = Array.from(nameSet).sort();
        }
    } catch(e) { _hmNames = []; }
}

function onHeatmapSearch(value) {
    const sug = document.getElementById('heatmap-suggestions');
    if (!sug) return;
    const q = value.trim().toLowerCase();
    if (!q) { sug.style.display = 'none'; return; }
    const matches = _hmNames.filter(n => n.toLowerCase().includes(q)).slice(0, 6);
    if (!matches.length) { sug.style.display = 'none'; return; }
    sug.innerHTML = matches.map(n =>
        `<div class="q-heatmap-suggestion" onclick="selectHeatmapName('${n}')">
            ${avHtml(n)}
            <span>${n}</span>
         </div>`
    ).join('');
    sug.style.display = 'block';
}

function selectHeatmapName(name) {
    const inp = document.getElementById('heatmap-search-input');
    if (inp) inp.value = name;
    const sug = document.getElementById('heatmap-suggestions');
    if (sug) sug.style.display = 'none';
    loadHeatmap(name, _hmCurrentMonth || getCurrentMonthStr());
}

function searchHeatmap() {
    const inp = document.getElementById('heatmap-search-input');
    const sug = document.getElementById('heatmap-suggestions');
    if (sug) sug.style.display = 'none';
    const name = (inp ? inp.value : '').trim();
    if (!name) { showToast('Please enter an employee name', 'error'); return; }
    loadHeatmap(name, _hmCurrentMonth || getCurrentMonthStr());
}

function getCurrentMonthStr() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
}

function changeHeatmapMonth(delta) {
    if (!_hmCurrentMonth || !_hmCurrentName) return;
    const [y, m] = _hmCurrentMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    loadHeatmap(_hmCurrentName, newMonth);
}

async function loadHeatmap(name, month) {
    _hmCurrentName  = name;
    _hmCurrentMonth = month;
    const result = document.getElementById('heatmap-result');
    if (!result) return;
    result.innerHTML = `<div class="q-empty"><div class="q-empty-title" style="color:var(--text-400)">Loading…</div></div>`;

    try {
        const r = await fetch(`/attendance/heatmap?name=${encodeURIComponent(name)}&month=${month}`);
        const data = await r.json();
        if (data.error) { showToast(data.error, 'error'); return; }
        renderHeatmapUI(name, month, data.days || {});
    } catch(e) {
        result.innerHTML = `<div class="q-alert q-alert-warn" style="margin:0;">Failed to load heatmap</div>`;
    }
}

function renderHeatmapUI(name, month, daysData) {
    const [year, mon] = month.split('-').map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();
    const firstDayOfWeek = new Date(year, mon - 1, 1).getDay(); // 0=Sun
    const _now = new Date();
    const todayStr = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;

    const MONTHS = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];

    let onsite = 0, remote = 0, absent = 0;

    // Empty offset cells
    let cells = '';
    for (let i = 0; i < firstDayOfWeek; i++) {
        cells += '<div class="q-hm-cell hm-empty"></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(mon).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isFuture  = dateStr > todayStr;
        const isToday  = dateStr === todayStr;
        const typeVal   = daysData[dateStr];
        let cls;
        if (isFuture) {
            cls = 'hm-future';
        } else if (isToday && !typeVal) {
            cls = 'hm-today';
        } else if (typeVal === 'onsite') {
            cls = 'hm-onsite'; onsite++;
        } else if (typeVal === 'remote') {
            cls = 'hm-remote'; remote++;
        } else {
            cls = 'hm-absent'; absent++;
        }
        const tooltip = isFuture ? `${dateStr}: upcoming` : isToday && !typeVal ? `${dateStr}: not yet marked` : `${dateStr}: ${typeVal || 'absent'}`;
        cells += `<div class="q-hm-cell ${cls}" title="${tooltip}"><span class="q-hm-day-num">${d}</span></div>`;
    }

    const result = document.getElementById('heatmap-result');
    if (!result) return;

    result.innerHTML = `
    <div class="q-hm-container">
        <!-- Header row: name + month nav -->
        <div class="q-hm-top">
            <div style="display:flex;align-items:center;gap:10px;">
                ${avHtml(name)}
                <div>
                    <div class="q-hm-who">${name}</div>
                    <div style="font-size:11px;color:var(--text-400);">Attendance heatmap</div>
                </div>
            </div>
            <div class="q-hm-month-nav">
                <button onclick="changeHeatmapMonth(-1)"><i class="fas fa-chevron-left"></i></button>
                <span class="q-hm-month-label">${MONTHS[mon-1]} ${year}</span>
                <button onclick="changeHeatmapMonth(1)"><i class="fas fa-chevron-right"></i></button>
            </div>
        </div>

        <!-- Body: calendar left, stats right -->
        <div class="q-hm-body">

            <!-- LEFT: calendar grid -->
            <div class="q-hm-left">
                <div class="q-hm-weekdays">
                    ${['Su','Mo','Tu','We','Th','Fr','Sa'].map(d =>
                        `<div class="q-hm-weekday">${d}</div>`).join('')}
                </div>
                <div class="q-hm-grid">${cells}</div>
                <div class="q-hm-legend">
                    <div class="q-hm-legend-item"><div class="q-hm-legend-dot" style="background:#7C3AED;"></div>Onsite</div>
                    <div class="q-hm-legend-item"><div class="q-hm-legend-dot" style="background:#007F80;"></div>Remote</div>
                    <div class="q-hm-legend-item"><div class="q-hm-legend-dot" style="background:#FFB300;opacity:.6;"></div>Absent</div>
                    <div class="q-hm-legend-item"><div class="q-hm-legend-dot hm-today-dot"></div>Today</div>
                    <div class="q-hm-legend-item"><div class="q-hm-legend-dot" style="background:var(--border-subtle);"></div>Future</div>
                </div>
            </div>

            <!-- RIGHT: stat tiles stacked vertically -->
            <div class="q-hm-right">
                <div class="q-hm-stat">
                    <div class="q-hm-stat-icon" style="background:#ede9fe;">
                        <i class="fas fa-building" style="color:#7C3AED;"></i>
                    </div>
                    <div class="q-hm-stat-val" style="color:#7C3AED;">${onsite}</div>
                    <div class="q-hm-stat-label">Onsite</div>
                    <div class="q-hm-stat-bar"><div class="q-hm-stat-bar-fill" style="background:#7C3AED;width:${onsite + remote + absent > 0 ? Math.round(onsite/(onsite+remote+absent)*100) : 0}%;"></div></div>
                </div>
                <div class="q-hm-stat">
                    <div class="q-hm-stat-icon" style="background:#ccfbf1;">
                        <i class="fas fa-laptop-house" style="color:#007F80;"></i>
                    </div>
                    <div class="q-hm-stat-val" style="color:#007F80;">${remote}</div>
                    <div class="q-hm-stat-label">Remote</div>
                    <div class="q-hm-stat-bar"><div class="q-hm-stat-bar-fill" style="background:#007F80;width:${onsite + remote + absent > 0 ? Math.round(remote/(onsite+remote+absent)*100) : 0}%;"></div></div>
                </div>
                <div class="q-hm-stat">
                    <div class="q-hm-stat-icon" style="background:#fff8e1;">
                        <i class="fas fa-calendar-times" style="color:#FFB300;"></i>
                    </div>
                    <div class="q-hm-stat-val" style="color:#c97f00;">${absent}</div>
                    <div class="q-hm-stat-label">Absent</div>
                    <div class="q-hm-stat-bar"><div class="q-hm-stat-bar-fill" style="background:#FFB300;width:${onsite + remote + absent > 0 ? Math.round(absent/(onsite+remote+absent)*100) : 0}%;"></div></div>
                </div>
            </div>

        </div>
    </div>`;
}

// ════════════════════════════════════════════════════════
// ANALYTICS
// ════════════════════════════════════════════════════════

let _barChart    = null;
let _donutChart  = null;
let _lineChart   = null;

function isDarkMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
}

function getChartTheme() {
    const dark = isDarkMode();
    return {
        text:   dark ? '#94a3b8' : '#6b7280',
        grid:   dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
        bg:     dark ? '#131720' : '#ffffff',
        font:   'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    };
}

function destroyCharts() {
    if (_barChart)   { _barChart.destroy();   _barChart   = null; }
    if (_donutChart) { _donutChart.destroy(); _donutChart = null; }
    if (_lineChart)  { _lineChart.destroy();  _lineChart  = null; }
}

async function initAnalytics() {
    if (typeof Chart === 'undefined') return; // Chart.js not loaded yet
    destroyCharts();

    const p   = _currentAnalyticsPeriod;
    const pd  = getPeriodDates(p);
    const now = new Date();
    const fmtLocal = d =>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    // Update descriptive labels
    const periodLabels = { today: 'today', week: 'this week', month: 'this month' };
    const s = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    s('analytics-period-label', `Showing data for ${periodLabels[p]}`);
    // Fetch records for the selected period
    let records = [];
    if (p === 'today') {
        records = await fetch('/admin/api/attendance/today').then(r =>r.json()).catch(() => []);
    } else {
        records = await fetch(`/admin/api/attendance/range?from=${pd.from}&to=${pd.to}`).then(r => r.json()).catch(() => []);
    }
    if (!Array.isArray(records)) records = [];

     records = records.map(r => ({
        Date: r.Date || r.date || pd.to,
        Type: (r.Type || r.type || '').toLowerCase(),
        Name: r.Name || r.name || '',
     }));
        
    const theme = getChartTheme();
    
    Chart.defaults.font.family = theme.font;
    Chart.defaults.font.size   = 11;
    Chart.defaults.color       = theme.text;
    
    // ── Build bar chart data ──────────────────────────
    let barLabels = [], onsiteData = [], remoteData = [];
    if (p === 'today') {
        // Single grouped bar for today
        const onsite = records.filter(r => r.Type === 'onsite').length;
        const remote = records.filter(r => r.Type === 'remote').length;
        barLabels  = ['Today'];
        onsiteData = [onsite];
        remoteData = [remote];
        s('chart-bar-title',  'Today\'s attendance');
        s('chart-bar-sub',    'Onsite and remote for today');
        s('chart-line-title', 'Hourly pattern');
        s('chart-line-sub',   'Attendance distribution today');
    } else if (p === 'week') {
        const DAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now); d.setDate(now.getDate() - i);
            const ds = fmtLocal(d);
            barLabels.push(i === 0 ? 'Today' : DAY[d.getDay()]);
            onsiteData.push(records.filter(r => r.Date === ds && r.Type === 'onsite').length);
            remoteData.push(records.filter(r => r.Date === ds && r.Type === 'remote').length);
        }
        s('chart-bar-title',  'Daily attendance — this week');
        s('chart-bar-sub',    'Onsite and remote per day');
        s('chart-line-title', 'Weekly attendance trend');
        s('chart-line-sub',   'Total attendance per day this week');
    } else {
        // Month — group by week number within month
        const weeksMap = {};
        records.forEach(r => {
            const d = new Date(r.Date);
            const wk = Math.ceil(d.getDate() / 7);
            const key = `Week ${wk}`;
            if (!weeksMap[key]) weeksMap[key] = { onsite: 0, remote: 0 };
            if (r.Type === 'onsite') weeksMap[key].onsite++;
            else if (r.Type === 'remote') weeksMap[key].remote++;
        });
        const wkKeys = Object.keys(weeksMap).sort();
        barLabels  = wkKeys;
        onsiteData = wkKeys.map(k => weeksMap[k].onsite);
        remoteData = wkKeys.map(k => weeksMap[k].remote);
        s('chart-bar-title',  'Weekly breakdown — this month');
        s('chart-bar-sub',    'Onsite and remote grouped by week');
        s('chart-line-title', 'Monthly attendance trend');
        s('chart-line-sub',   'Total attendance per week this month');
    }

    // ── Bar chart ──
    const barCtx = document.getElementById('chart-bar');
    if (barCtx) {
        _barChart = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: barLabels,
                datasets: [
                    {
                        label: 'Onsite',
                        data: onsiteData,
                        backgroundColor: '#4f46e5',
                        borderRadius: 4,
                        borderSkipped: false,
                    },
                    {
                        label: 'Remote',
                        data: remoteData,
                        backgroundColor: '#0f766e',
                        borderRadius: 4,
                        borderSkipped: false,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 10, padding: 12, color: theme.text } },
                    tooltip: { mode: 'index', intersect: false },
                },
                scales: {
                    x: { stacked: true, grid: { display: false }, ticks: { color: theme.text } },
                    y: { stacked: true, beginAtZero: true, grid: { color: theme.grid }, ticks: { precision: 0, color: theme.text } },
                },
            },
        });
    }

    // ── Donut chart ──
    const donutCtx = document.getElementById('chart-donut');
    if (donutCtx) {
        const dOnsite = records.filter(r => r.Type === 'onsite').length;
        const dRemote = records.filter(r => r.Type === 'remote').length;
        const total = dOnsite + dRemote;
        s('chart-donut-sub', `Type breakdown for ${periodLabels[p]}`);
        _donutChart = new Chart(donutCtx, {
            type: 'doughnut',
            data: {
                labels: ['Onsite', 'Remote'],
                datasets: [{
                    data: total > 0 ? [dOnsite, dRemote] : [1, 1],
                    backgroundColor: ['#4f46e5', '#0f766e'],
                    borderWidth: 2,
                    borderColor: theme.bg,
                    hoverOffset: 6,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { boxWidth: 12, padding: 14, color: theme.text }
                    },
                    tooltip: {
                        callbacks: {
                            label(ctx) {
                                if (total === 0) return ' No data';
                                // const pct = Math.round(ctx.raw / total * 100);
                                return ` ${ctx.label}: ${ctx.raw} (${Math.round(ctx.raw/total*100)}%)`;
                            }}},
                },
            },
        });
    }

    // ── Line chart  ──
    const lineCtx = document.getElementById('chart-line');
    if (lineCtx) {
        let lineLabels = [], lineTotals = [];
        if (p === 'today') {
            lineLabels  = barLabels;
            lineTotals  = onsiteData.map((v,i) => v + remoteData[i]);
        } else if (p === 'week'){
            lineLabels  = barLabels;
            lineTotals  = onsiteData.map((v,i) => v + remoteData[i]);
        } else {
            lineLabels  = barLabels;
            lineTotals  = onsiteData.map((v,i) => v + remoteData[i]);
        }
        
        _lineChart = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: lineLabels,
                datasets: [{
                    label: 'Total attendance',
                    data: lineTotals,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79,70,229,0.1)',
                    borderWidth: 2,
                    tension: 0.35,
                    fill: true,
                    pointBackgroundColor: '#4f46e5',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false },
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: theme.text } },
                    y: { beginAtZero: true, grid: { color: theme.grid }, ticks: { precision: 0, color: theme.text } },
                },
            },
        });
    }
}

// ════════════════════════════════════════════════════════
// LOGIN PAGE LOGIC
// ════════════════════════════════════════════════════════
function togglePw() {
    const inp = document.getElementById('password');
    const ic  = document.getElementById('pw-icon');
    if (!inp || !ic) return;
    const show = inp.type === 'password';
    inp.type   = show ? 'text' : 'password';
    ic.className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
}

function initLoginSpinner() {
    const btn = document.getElementById('login-btn');
    if (!btn) return;
    // Look for the closest form parent
    const form = btn.closest('form');
    if (form) {
        form.addEventListener('submit', () => {
            btn.disabled  = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in…';
        });
    }
}

// ════════════════════════════════════════════════════════
// SETTINGS PAGE LOGIC (Map & DB Stats)
// ════════════════════════════════════════════════════════
let map, marker, circle;

function initMap() {
    const mapEl = document.getElementById('q-map');
    if (!mapEl || typeof L === 'undefined') return;

    let defaultLat    = parseFloat(mapEl.dataset.lat) ;
    let defaultLng    = parseFloat(mapEl.dataset.lng) ;
    let defaultRadius = parseFloat(mapEl.dataset.radius) ;

    if (isNaN(defaultLat)) defaultLat = 28.6139;
    if (isNaN(defaultLng)) defaultLng = 77.2090;
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

    marker.on('dragend', function(e) {
        const pos = e.target.getLatLng();
        setCoordinates(pos.lat.toFixed(6), pos.lng.toFixed(6));
    });

    map.on('click', function(e) {
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
    if(circle) {
        circle.setLatLng([lat, lng]);
        circle.setRadius(r);
    }
    if(marker) marker.setLatLng([lat, lng]);
    document.getElementById('map-radius-display').textContent = r + 'm';
}

function updateMap() {
    const lat = parseFloat(document.getElementById('office_lat').value);
    const lng = parseFloat(document.getElementById('office_lng').value);
    const r   = parseFloat(document.getElementById('radius').value) || 50;
    if (!isNaN(lat) && !isNaN(lng) && map) {
        setCoordinates(lat.toFixed(6), lng.toFixed(6));
        map.setView([lat, lng], 16);
    }
}

function useMyLocation() {
    const btn  = document.getElementById('use-location-btn');
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
            if(map) { map.setView([lat, lng], 17); marker.openPopup(); }
            showToast('Location updated successfully', 'success');
            btn.disabled = false;
            icon.className = 'fas fa-location-crosshairs';
            span.textContent = 'Use My Location';
        },
        err => {
            const msg = {1:'Permission denied',2:'Location unavailable',3:'Request timed out'}[err.code] || 'Could not get location';
            showToast(msg, 'error');
            btn.disabled = false;
            icon.className = 'fas fa-location-crosshairs';
            span.textContent = 'Use My Location';
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function fetchDbStats() {
    const body = document.getElementById('db-stats-body');
    if (!body) return;
    
    fetch('/get_database_stats')
        .then(r => r.json())
        .then(data => {
            const max  = data.total_attendance_records || 1;
            body.innerHTML = `
                <div class="q-db-stat">
                    <span class="q-db-key">Total records</span>
                    <div class="q-db-bar-wrap"><div class="q-db-bar" style="width:100%;"></div></div>
                    <span class="q-db-val">${data.total_attendance_records}</span>
                </div>
                <div class="q-db-stat">
                    <span class="q-db-key">Today's records</span>
                    <div class="q-db-bar-wrap"><div class="q-db-bar" style="width:${Math.round(data.today_attendance_count/max*100)}%;background:#059669;"></div></div>
                    <span class="q-db-val">${data.today_attendance_count}</span>
                </div>
                <div class="q-db-stat">
                    <span class="q-db-key">Unique persons</span>
                    <div class="q-db-bar-wrap"><div class="q-db-bar" style="width:${Math.round(data.unique_persons/max*100)}%;background:#7c3aed;"></div></div>
                    <span class="q-db-val">${data.unique_persons}</span>
                </div>
                <div class="q-db-stat">
                    <span class="q-db-key">Known faces in DB</span>
                    <div class="q-db-bar-wrap"><div class="q-db-bar" style="width:${Math.round(data.known_faces_in_csv/max*100)}%;background:#0891b2;"></div></div>
                    <span class="q-db-val">${data.known_faces_in_csv}</span>
                </div>`;
        }).catch(() => {});
}

function checkGlobalAlerts() {
    // Only fetch if the alert boxes exist on the current page
    if (!document.getElementById('bio-alert-box')) return;
    
    Promise.all([
        fetch('/admin/biometrics/pending').then(r => r.json()),
        fetch('/admin/registrations/pending').then(r => r.json()),
    ]).then(([bio, reg]) => {
        const bioPend = Array.isArray(bio) ? bio.filter(r => r.status === 'pending').length : 0;
        const regPend = Array.isArray(reg) ? reg.filter(r => r.status === 'pending').length : 0;
        updateAlertBanners(bioPend, regPend);
        
        // Ensure sidebar badges update too
        updateBadge('sb-bio-badge', bioPend);
        updateBadge('sb-reg-badge', regPend);
        
        const dot = document.getElementById('notif-dot');
        if (dot) dot.style.display = (bioPend + regPend) > 0 ? 'block' : 'none';
    }).catch(() => {});
}

// ════════════════════════════════════════════════════════
// DOM READY
// ════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    // Restore theme
    const savedTheme = localStorage.getItem('admin-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeIcon = document.querySelector('#theme-toggle-btn i, #theme-icon');
    if (themeIcon) themeIcon.className = savedTheme === 'dark' ? 'fas fa-circle-half-stroke' : 'fas fa-circle-half-stroke';

    const dateEl = document.getElementById('topbar-date');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
    }

    checkGlobalAlerts();
    if (document.getElementById('bento-log-body')) {
    // Initial data load
        fetchTodayAttendance();
        fetchRealtimeLog();
        fetchStatCards();
        fetchBiometricRequests();
        fetchRegistrations();
        fetchSparklineData();

        // Wire date range button
        const rangeBtn = document.getElementById('fetchRangeBtn');
        if (rangeBtn) rangeBtn.addEventListener('click', fetchRangeAttendance);

        // Auto-refresh
        setInterval(fetchStatCards,    30000);
        setInterval(fetchRealtimeLog,  10000);
        setInterval(fetchSparklineData, 120000);

        // Session storage tab restore (from admin.html links)
        const openTab = sessionStorage.getItem('openTab');
        if (openTab) {
            sessionStorage.removeItem('openTab');
            switchTab(openTab);
            setTimeout(() => {
                const bar = document.getElementById('q-tabs-bar');
                if (bar) bar.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
    }

    // Close heatmap suggestions on outside click
    document.addEventListener('click', e => {
        const sug = document.getElementById('heatmap-suggestions');
        const inp = document.getElementById('heatmap-search-input');
        if (sug && inp && !inp.contains(e.target) && !sug.contains(e.target)) {
            sug.style.display = 'none';
        }
    });
}
});
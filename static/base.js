/* base.js — shared across all admin pages
 * Provides: theme, toast, avatar helpers, badge, profile card,
 *           alert banners, global alert polling.
 * Does NOT touch any dashboard tabs, map, or login logic.
 */

'use strict';

/* ─── Theme ──────────────────────────────────────────────────────────────── */

const THEME_KEY = 'admin-theme';

function toggleTheme() {
  const html     = document.documentElement;
  const current  = html.getAttribute('data-theme') || 'light';
  const newTheme = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem(THEME_KEY, newTheme);

  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

/* ─── Toast ──────────────────────────────────────────────────────────────── */

function showToast(message, type = 'info', duration = 3500) {
  const wrap = document.getElementById('toast-wrap');
  if (!wrap) return;

  const toast = document.createElement('div');
  toast.className = `q-toast q-toast--${type}`;
  toast.textContent = message;
  wrap.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('q-toast--visible'));

  setTimeout(() => {
    toast.classList.remove('q-toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, duration);
}

/* ─── Avatar helpers ─────────────────────────────────────────────────────── */

function avColor(name = '') {
  const palette = [
    '#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c',
    '#3498db','#9b59b6','#e91e63','#00bcd4','#8bc34a',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function avHtml(name = '', size = 36) {
  const initials = name.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
  const bg = avColor(name);
  return `<span class="q-avatar" style="width:${size}px;height:${size}px;background:${bg};
    border-radius:50%;display:inline-flex;align-items:center;justify-content:center;
    color:#fff;font-size:${Math.round(size * 0.38)}px;font-weight:600;flex-shrink:0;">
    ${initials}
  </span>`;
}

/* ─── Notification badge ─────────────────────────────────────────────────── */

function updateBadge(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  if (count > 0) {
    el.textContent = count > 99 ? '99+' : count;
    el.hidden = false;
  } else {
    el.hidden = true;
  }
}

function adjustBadge(id, delta) {
  const el = document.getElementById(id);
  if (!el) return;
  const current = parseInt(el.textContent, 10) || 0;
  updateBadge(id, Math.max(0, current + delta));
}

/* ─── Profile card ───────────────────────────────────────────────────────── */

let _profileLoaded = false;

function toggleProfileCard(e) {
  if (e) e.stopPropagation();
  const card    = document.getElementById('admin-profile-card');
  const chevron = document.getElementById('profile-chevron');
  if (!card) return;
  const isOpen = card.style.display === 'none' || card.style.display === '';
  if (isOpen) {
    card.style.display = 'block';
    if (chevron) chevron.style.transform = 'rotate(180deg)';
    populateProfileCard();
  } else {
    card.style.display = 'none';
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  }
}

function populateProfileCard() {
    const el = document.getElementById('profile-login-time');
    if (el) el.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    fetch('/get_database_stats')
        .then(r => r.json())
        .then(d => {
            const tr = document.getElementById('profile-total-records');
            const kf = document.getElementById('profile-known-faces');
            if (tr) tr.textContent = d.total_attendance_records ?? '—';
            if (kf) kf.textContent = d.known_faces_in_csv ?? '—';
        })
        .catch(() => {});
}

document.addEventListener('click', (e) => {
  const card    = document.getElementById('admin-profile-card');
  const trigger = document.getElementById('admin-profile-trigger');
  if (!card || !card.classList.contains('q-profile-card--open')) return;
  if (!card.contains(e.target) && (!trigger || !trigger.contains(e.target))) {
    card.classList.remove('q-profile-card--open');
  }
});

/* ─── Alert banners ──────────────────────────────────────────────────────── */

function updateAlertBanners(bioPend, regPend) {
    const bioBox = document.getElementById('bio-alert-box');
    const regBox = document.getElementById('reg-alert-box');
    if (bioBox) {
        bioBox.style.display = bioPend > 0 ? 'flex' : 'none';
        if (bioPend > 0) {
            const msg = document.getElementById('bio-alert-msg');
            if (msg) msg.textContent =
                `${bioPend} employee${bioPend > 1 ? 's are' : ' is'} waiting for face registration approval.`;
        }
    }
    if (regBox) {
        regBox.style.display = regPend > 0 ? 'flex' : 'none';
        if (regPend > 0) {
            const msg = document.getElementById('reg-alert-msg');
            if (msg) msg.textContent =
                `${regPend} user${regPend > 1 ? 's are' : ' is'} awaiting account approval.`;
        }
    }
}

/* ─── Global alert polling ───────────────────────────────────────────────── */

function checkGlobalAlerts() {
    if (!document.getElementById('bio-alert-box')) return;
    Promise.all([
        fetch('/admin/biometrics/pending').then(r => r.json()),
        fetch('/admin/registrations/pending').then(r => r.json()),
    ]).then(([bio, reg]) => {
        const bioPend = Array.isArray(bio) ? bio.filter(r => r.status === 'pending').length : 0;
        const regPend = Array.isArray(reg) ? reg.filter(r => r.status === 'pending').length : 0;
        updateAlertBanners(bioPend, regPend);
        updateBadge('sb-bio-badge', bioPend);
        updateBadge('sb-reg-badge', regPend);
        const dot = document.getElementById('notif-dot');
        if (dot) dot.style.display = (bioPend + regPend) > 0 ? 'block' : 'none';
    }).catch(() => {});
}

/* ─── DOMContentLoaded bootstrap ────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {

  /* 1. Restore theme (no FOUC — the inline IIFE in <head> already set
        data-theme before first paint; this just syncs the icon) */
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = saved === 'dark' ? '☀️' : '🌙';
  }

  /* 2. Display today's date wherever base.html puts a [data-today] element */
  const dateEl = document.querySelector('[data-today]');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  /* 3. Initial alert check + poll every 60 s */
  checkGlobalAlerts();
  setInterval(checkGlobalAlerts, 60_000);

});



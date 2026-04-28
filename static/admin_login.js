// ════════════════════════════════════════════════════════
// IdentiFace Admin JS  —  Login page
// ════════════════════════════════════════════════════════

// ── Theme ─────────────────────────────────────────────
function toggleTheme() {
    const isDark   = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('admin-theme', newTheme);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.className = 'fas fa-circle-half-stroke';
}

// ── Toast ─────────────────────────────────────────────
function showToast(message, type = 'default') {
    const wrap = document.getElementById('toast-wrap');
    if (!wrap) return;
    const t = document.createElement('div');
    t.className = `q-toast ${type}`;
    const icon = type === 'success' ? 'check-circle'
               : type === 'error'   ? 'times-circle'
               : type === 'warning' ? 'exclamation-circle'
               :                      'info-circle';
    t.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    wrap.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

// ── Password toggle ─────────────────────────────────────
function togglePw() {
    const inp = document.getElementById('password');
    const ic  = document.getElementById('pw-icon');
    if (!inp || !ic) return;
    const show   = inp.type === 'password';
    inp.type     = show ? 'text' : 'password';
    ic.className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
}

// ── Login button spinner ─────────────────────────────────
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
    const savedTheme = localStorage.getItem('admin-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeIcon = document.querySelector('#theme-toggle-btn i, #theme-icon');
    if (themeIcon) themeIcon.className = 'fas fa-circle-half-stroke';

    initLoginSpinner();
});
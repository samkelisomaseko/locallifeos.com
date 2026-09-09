// ═══════════════════════════════════════════════════════════════
// Auth UI module — wired to real API (Phase 2)
// ═══════════════════════════════════════════════════════════════
// NOTE: The `UI Modularization Plan` is defined in `plan.md`.
//       See `plan.md#auth-app.js` for the full breakdown of
//       what was simplified and how it maps to the new system.

const API_BASE = window.location.port === '5173'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : window.location.origin;

// ── API helpers ──────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data;
}

// ── Viewport sizing ──────────────────────────────────────────────
function setVh() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}
window.addEventListener('resize', setVh);
setVh();

// ── DOM helpers ──────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }
function show(id) { $(id)?.classList.add('active'); }
function hide(id) { $(id)?.classList.remove('active'); }

let currentView = 'auth';
function navigate(view) {
  if (view === currentView) return;
  const views = ['auth', 'login', 'signup', 'forgot', 'dashboard', 'profile', 'settings'];
  views.forEach(v => hide(`view-${v}`));
  show(`view-${view}`);
  currentView = view;
}

// ── Session restore (check real API) ─────────────────────────────
async function restoreSession() {
  try {
    const { user } = await apiFetch('/api/v1/auth/me');
    hide('auth-login');
    show('auth-dashboard');
    $('user-email').textContent = user.email;
    $('user-role').textContent = user.role;
    show('auth-role');
  } catch {
    hide('auth-dashboard');
    hide('auth-role');
    show('auth-login');
  }
}

// ── Login ────────────────────────────────────────────────────────
$('login-btn').addEventListener('click', async () => {
  const email = $('login-email').value.trim();
  const password = $('login-password').value;

  if (!email || !password) {
    setAlert('login-alert', 'Please enter both email and password.', 'error');
    return;
  }

  $('login-btn').disabled = true;
  try {
    const { user } = await apiFetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    hide('auth-login');
    show('auth-dashboard');
    $('user-email').textContent = user.email;
    $('user-role').textContent = user.role;
    show('auth-role');
    setAlert('login-alert', '', 'success');
  } catch (err) {
    setAlert('login-alert', err.message, 'error');
  } finally {
    $('login-btn').disabled = false;
  }
});

$('login-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('login-btn').click();
});

// ── Signup ───────────────────────────────────────────────────────
$('signup-btn').addEventListener('click', async () => {
  const name = $('signup-name').value.trim();
  const email = $('signup-email').value.trim();
  const password = $('signup-password').value;

  if (!name || !email || !password) {
    setAlert('signup-alert', 'Please fill in all fields.', 'error');
    return;
  }
  if (password.length < 8) {
    setAlert('signup-alert', 'Password must be at least 8 characters.', 'error');
    return;
  }

  $('signup-btn').disabled = true;
  try {
    await apiFetch('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    setAlert('signup-alert', 'Account created! You can now log in.', 'success');
    setTimeout(() => navigate('login'), 1200);
  } catch (err) {
    setAlert('signup-alert', err.message, 'error');
  } finally {
    $('signup-btn').disabled = false;
  }
});

// ── Logout ───────────────────────────────────────────────────────
$('logout-btn').addEventListener('click', async () => {
  await apiFetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
  hide('auth-dashboard');
  hide('auth-role');
  show('auth-login');
  $('login-email').value = '';
  $('login-password').value = '';
});

// ── Forgot password ──────────────────────────────────────────────
$('forgot-btn').addEventListener('click', async () => {
  const email = $('forgot-email').value.trim();
  if (!email) {
    setAlert('forgot-alert', 'Please enter your email.', 'error');
    return;
  }
  $('forgot-btn').disabled = true;
  try {
    const result = await apiFetch('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    const msg = result._dev_token
      ? `Reset successful. Your temporary password is: ${result._dev_token}`
      : 'If an account exists with that email, a reset link has been sent.';
    setAlert('forgot-alert', msg, 'success');
  } catch (err) {
    setAlert('forgot-alert', err.message, 'error');
  } finally {
    $('forgot-btn').disabled = false;
  }
});

// ── Nav links ────────────────────────────────────────────────────
$('nav-profile')?.addEventListener('click', () => navigate('profile'));
$('nav-settings')?.addEventListener('click', () => navigate('settings'));
$('nav-back-profile')?.addEventListener('click', () => navigate('dashboard'));
$('nav-back-settings')?.addEventListener('click', () => navigate('dashboard'));

// ── View routing ─────────────────────────────────────────────────
function setAlert(id, msg, type) {
  const el = $(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert ${type}`;
}

// ── Init ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  restoreSession();
});

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

// ── Modal helpers (global; the markup calls these, nothing defines them)
function openModal(id) { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }
window.openModal = openModal;
window.closeModal = closeModal;
function openForgotPasswordModal() { openModal('forgotPasswordModal'); }
window.openForgotPasswordModal = openForgotPasswordModal;

// ── Screen switching (real DOM ids: loginScreen / signupScreen / dashboard)
// NOTE: login/logout are slow (password hashing over the network takes
// seconds), so a late restoreSession failure must never clobber a session
// that completed after it started. window.__llos_authed guards that race.
function showLoginScreen() {
  if (window.__llos_authed) return;
  document.querySelector('.app-container')?.classList.add('hidden');
  const auth = $('authContainer');
  if (auth) auth.style.display = '';
  $('signupScreen')?.classList.remove('active');
  $('loginScreen')?.classList.add('active');
}
function showSignupScreen() {
  document.querySelector('.app-container')?.classList.add('hidden');
  const auth = $('authContainer');
  if (auth) auth.style.display = '';
  $('loginScreen')?.classList.remove('active');
  $('signupScreen')?.classList.add('active');
}
function enterApp() {
  window.__llos_authed = true;
  const auth = $('authContainer');
  if (auth) auth.style.display = 'none';
  const app = document.querySelector('.app-container');
  if (app) { app.classList.remove('hidden'); app.style.display = ''; }
}
window.showLoginScreen = showLoginScreen;
window.showSignupScreen = showSignupScreen;

// ── Session restore (check real API) ─────────────────────────────
async function restoreSession() {
  try {
    await apiFetch('/api/v1/auth/me');
    enterApp();
  } catch {
    showLoginScreen();
  }
}

// ── Login (called by the Login button: handleLoginAttempt()) ─────
async function handleLoginAttempt() {
  const emailEl = $('loginEmail');
  const passEl = $('loginPassword');
  const email = emailEl?.value.trim() ?? '';
  const password = passEl?.value ?? '';
  if (!email || !password) {
    showToast('Please enter both email and password.', 'error');
    return;
  }
  try {
    await apiFetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    enterApp();
    if (passEl) passEl.value = '';
  } catch (err) {
    showToast(err.message, 'error');
  }
}
window.handleLoginAttempt = handleLoginAttempt;
$('loginPassword')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLoginAttempt();
});

// ── Signup (called by the Sign Up button: handleSignupAttempt()) ──
async function handleSignupAttempt() {
  const name = $('signupName')?.value.trim() ?? '';
  const email = $('signupEmail')?.value.trim() ?? '';
  const password = $('signupPassword')?.value ?? '';
  const confirm = $('signupConfirmPassword')?.value ?? '';
  if (!name || !email || !password) {
    showToast('Please fill in all fields.', 'error');
    return;
  }
  if (password.length < 8) {
    showToast('Password must be at least 8 characters.', 'error');
    return;
  }
  if (password !== confirm) {
    showToast('Passwords do not match.', 'error');
    return;
  }
  try {
    await apiFetch('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    showToast('Account created — welcome in!', 'success');
    enterApp();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
window.handleSignupAttempt = handleSignupAttempt;

// ── Forgot password (called by the modal: handlePasswordRecovery())
async function handlePasswordRecovery() {
  const email = $('recoveryEmail')?.value.trim() ?? '';
  if (!email.includes('@')) {
    showToast('Please enter a valid email address.', 'error');
    return;
  }
  try {
    await apiFetch('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    showToast('If an account exists for that email, it can now be recovered. Check server logs for the temporary password.', 'success');
    closeModal('forgotPasswordModal');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
window.handlePasswordRecovery = handlePasswordRecovery;

// ── Logout ───────────────────────────────────────────────────────
async function logout() {
  window.__llos_authed = false;
  await apiFetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
  showLoginScreen();
}
window.logout = logout;

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

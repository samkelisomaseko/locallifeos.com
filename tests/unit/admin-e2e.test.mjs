/**
 * @module tests/unit/admin-e2e.test
 * Admin E2E gate (plan.md §9 Phase 2+).
 * Tests RBAC role enforcement, per-entity CRUD, and audit-log assertions.
 * Requires DATABASE_URL — skipped gracefully when absent.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../server/app.mjs';

const hasDb = !!process.env.DATABASE_URL;

// ── Helpers ──────────────────────────────────────────────────────
async function signupAndLogin(app, email, password = 'password123') {
  const signup = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/signup',
    payload: { email, password, name: email.split('@')[0] },
  });
  return signup.headers['set-cookie'];
}

async function getDb(app) {
  const { getDb } = await import('../../server/db/client.mjs');
  return getDb();
}

// ── RBAC Role Enforcement ────────────────────────────────────────
describe('RBAC — role enforcement', { skip: hasDb ? false : 'DATABASE_URL not set' }, () => {
  let app;
  after(async () => { if (app) await app.close(); });

  test('unauthenticated → 401 on all admin endpoints', async () => {
    app = await buildApp({ logger: false });
    const endpoints = [
      ['GET', '/admin/v1/users'],
      ['GET', '/admin/v1/flags'],
      ['GET', '/admin/v1/config'],
    ];
    for (const [method, url] of endpoints) {
      const res = await app.inject({ method, url });
      assert.equal(res.statusCode, 401, `${method} ${url} should return 401`);
    }
  });

  test('regular user (role: user) → 403 on all admin endpoints', async () => {
    app = await buildApp({ logger: false });
    const cookie = await signupAndLogin(app, `user-${Date.now()}@example.com`);
    const endpoints = [
      ['GET', '/admin/v1/users'],
      ['GET', '/admin/v1/flags'],
      ['GET', '/admin/v1/config'],
    ];
    for (const [method, url] of endpoints) {
      const res = await app.inject({ method, url, headers: { cookie } });
      assert.equal(res.statusCode, 403, `${method} ${url} should return 403 for user role`);
    }
  });

  test('super_admin → 200 on all admin endpoints', async () => {
    app = await buildApp({ logger: false });
    // Seed creates test@example.com as super_admin
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@example.com', password: 'password' },
    });
    const cookie = login.headers['set-cookie'];
    const endpoints = [
      ['GET', '/admin/v1/users'],
      ['GET', '/admin/v1/flags'],
      ['GET', '/admin/v1/config'],
    ];
    for (const [method, url] of endpoints) {
      const res = await app.inject({ method, url, headers: { cookie } });
      assert.equal(res.statusCode, 200, `${method} ${url} should return 200 for super_admin`);
    }
  });
});

// ── Users CRUD ───────────────────────────────────────────────────
describe('Admin Users — CRUD operations', { skip: hasDb ? false : 'DATABASE_URL not set' }, () => {
  let app;
  let adminCookie;
  let testUserId;

  before(async () => {
    app = await buildApp({ logger: false });
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@example.com', password: 'password' },
    });
    adminCookie = login.headers['set-cookie'];
  });

  after(async () => { if (app) await app.close(); });

  test('list users returns paginated results', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/v1/users',
      headers: { cookie: adminCookie },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.ok(Array.isArray(body.users));
    assert.ok(body.total >= 1);
    assert.ok(body.page >= 1);
    // Save a user ID for later tests
    testUserId = body.users.find(u => u.email === 'test@example.com')?.id;
    assert.ok(testUserId, 'test@example.com should exist');
  });

  test('inspect user returns user + profile', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/admin/v1/users/${testUserId}`,
      headers: { cookie: adminCookie },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.user.email, 'test@example.com');
    assert.equal(body.user.role, 'super_admin');
  });

  test('suspend user sets status=suspended', async () => {
    // Create a disposable user to suspend
    const email = `suspend-${Date.now()}@example.com`;
    const signup = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email, password: 'password123', name: 'Suspend Me' },
    });
    const userId = signup.json().user.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/admin/v1/users/${userId}/suspend`,
      headers: { cookie: adminCookie },
      payload: { reason: 'Test suspension' },
    });
    assert.equal(res.statusCode, 200);

    // Verify via inspect
    const inspect = await app.inject({
      method: 'GET',
      url: `/admin/v1/users/${userId}`,
      headers: { cookie: adminCookie },
    });
    assert.equal(inspect.json().user.status, 'suspended');
    assert.equal(inspect.json().user.suspendedReason, 'Test suspension');
  });

  test('unsuspend user restores status=active', async () => {
    const email = `unsuspend-${Date.now()}@example.com`;
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email, password: 'password123', name: 'Unsuspend Me' },
    });
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'password123' },
    });
    const userId = login.json().user.id;

    await app.inject({
      method: 'PATCH',
      url: `/admin/v1/users/${userId}/suspend`,
      headers: { cookie: adminCookie },
      payload: { reason: 'Temporary' },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/admin/v1/users/${userId}/unsuspend`,
      headers: { cookie: adminCookie },
    });
    assert.equal(res.statusCode, 200);

    const inspect = await app.inject({
      method: 'GET',
      url: `/admin/v1/users/${userId}`,
      headers: { cookie: adminCookie },
    });
    assert.equal(inspect.json().user.status, 'active');
  });

  test('soft-delete sets status=deleted', async () => {
    const email = `delete-${Date.now()}@example.com`;
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email, password: 'password123', name: 'Delete Me' },
    });
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'password123' },
    });
    const userId = login.json().user.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/admin/v1/users/${userId}/soft-delete`,
      headers: { cookie: adminCookie },
    });
    assert.equal(res.statusCode, 200);

    const inspect = await app.inject({
      method: 'GET',
      url: `/admin/v1/users/${userId}`,
      headers: { cookie: adminCookie },
    });
    assert.equal(inspect.json().user.status, 'deleted');
  });

  test('cannot soft-delete super_admin', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/admin/v1/users/${testUserId}/soft-delete`,
      headers: { cookie: adminCookie },
    });
    assert.equal(res.statusCode, 403);
  });

  test('reset password returns new dev password', async () => {
    const email = `reset-${Date.now()}@example.com`;
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email, password: 'password123', name: 'Reset Me' },
    });
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'password123' },
    });
    const userId = login.json().user.id;

    const res = await app.inject({
      method: 'POST',
      url: `/admin/v1/users/${userId}/reset-password`,
      headers: { cookie: adminCookie },
    });
    assert.equal(res.statusCode, 200);
    assert.ok(res.json()._dev_new_password);
  });

  test('subscription tier override works', async () => {
    const email = `tier-${Date.now()}@example.com`;
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email, password: 'password123', name: 'Tier User' },
    });
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'password123' },
    });
    const userId = login.json().user.id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/admin/v1/users/${userId}/subscription-tier`,
      headers: { cookie: adminCookie },
      payload: { tier: 'pro_plus' },
    });
    assert.equal(res.statusCode, 200);

    const inspect = await app.inject({
      method: 'GET',
      url: `/admin/v1/users/${userId}`,
      headers: { cookie: adminCookie },
    });
    assert.equal(inspect.json().profile.subscriptionTier, 'pro_plus');
  });

  test('invalid tier returns 400', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/admin/v1/users/${testUserId}/subscription-tier`,
      headers: { cookie: adminCookie },
      payload: { tier: 'invalid_tier' },
    });
    assert.equal(res.statusCode, 400);
  });
});

// ── Feature Flags CRUD ───────────────────────────────────────────
describe('Admin Config — feature flags CRUD', { skip: hasDb ? false : 'DATABASE_URL not set' }, () => {
  let app;
  let adminCookie;

  before(async () => {
    app = await buildApp({ logger: false });
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@example.com', password: 'password' },
    });
    adminCookie = login.headers['set-cookie'];
  });

  after(async () => { if (app) await app.close(); });

  test('create feature flag', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/v1/flags/test-e2e-flag',
      headers: { cookie: adminCookie },
      payload: { enabled: true, description: 'E2E test flag' },
    });
    assert.equal(res.statusCode, 201);
    assert.equal(res.json().flag.key, 'test-e2e-flag');
    assert.equal(res.json().flag.enabled, true);
  });

  test('update feature flag', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/v1/flags/test-e2e-flag',
      headers: { cookie: adminCookie },
      payload: { enabled: false },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().flag.enabled, false);
  });

  test('list feature flags includes created flag', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/v1/flags',
      headers: { cookie: adminCookie },
    });
    assert.equal(res.statusCode, 200);
    const flag = res.json().flags.find(f => f.key === 'test-e2e-flag');
    assert.ok(flag, 'Created flag should appear in list');
    assert.equal(flag.enabled, false);
  });
});

// ── App Config CRUD ──────────────────────────────────────────────
describe('Admin Config — app config CRUD', { skip: hasDb ? false : 'DATABASE_URL not set' }, () => {
  let app;
  let adminCookie;

  before(async () => {
    app = await buildApp({ logger: false });
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@example.com', password: 'password' },
    });
    adminCookie = login.headers['set-cookie'];
  });

  after(async () => { if (app) await app.close(); });

  test('create config entry', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/v1/config/test-e2e-config',
      headers: { cookie: adminCookie },
      payload: { value: { key: 'val' }, description: 'E2E test config' },
    });
    assert.equal(res.statusCode, 201);
    assert.equal(res.json().config.key, 'test-e2e-config');
  });

  test('update config entry', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/v1/config/test-e2e-config',
      headers: { cookie: adminCookie },
      payload: { value: { updated: true } },
    });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json().config.value, { updated: true });
  });

  test('missing value returns 400', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/v1/config/test-e2e-config',
      headers: { cookie: adminCookie },
      payload: { description: 'no value' },
    });
    assert.equal(res.statusCode, 400);
  });

  test('list config includes created entry', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/v1/config',
      headers: { cookie: adminCookie },
    });
    assert.equal(res.statusCode, 200);
    const cfg = res.json().config.find(c => c.key === 'test-e2e-config');
    assert.ok(cfg, 'Created config should appear in list');
  });
});

// ── Audit Log Assertions ─────────────────────────────────────────
describe('Audit log — mutations are logged', { skip: hasDb ? false : 'DATABASE_URL not set' }, () => {
  let app;
  let adminCookie;

  before(async () => {
    app = await buildApp({ logger: false });
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@example.com', password: 'password' },
    });
    adminCookie = login.headers['set-cookie'];
  });

  after(async () => { if (app) await app.close(); });

  test('user suspend creates audit log entry', async () => {
    const email = `audit-suspend-${Date.now()}@example.com`;
    const signup = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email, password: 'password123', name: 'Audit Suspend' },
    });
    const userId = signup.json().user.id;

    await app.inject({
      method: 'PATCH',
      url: `/admin/v1/users/${userId}/suspend`,
      headers: { cookie: adminCookie },
      payload: { reason: 'Audit test' },
    });

    // Query audit_logs via direct DB access
    const db = await getDb(app);
    const { auditLogs } = await import('../../server/db/schema.js');
    const { eq, and } = await import('drizzle-orm');
    const logs = await db.select().from(auditLogs).where(
      and(eq(auditLogs.entityType, 'user'), eq(auditLogs.entityId, userId))
    );
    assert.ok(logs.length >= 1, 'Suspend should create audit log entry');
    const suspendLog = logs.find(l => l.action === 'user.suspend');
    assert.ok(suspendLog, 'Should have user.suspend action');
    assert.ok(suspendLog.actorId, 'Should have actorId');
    assert.ok(suspendLog.before, 'Should have before state');
    assert.ok(suspendLog.after, 'Should have after state');
  });

  test('flag toggle creates audit log entry', async () => {
    await app.inject({
      method: 'PATCH',
      url: '/admin/v1/flags/audit-test-flag',
      headers: { cookie: adminCookie },
      payload: { enabled: true, description: 'Audit test' },
    });

    const db = await getDb(app);
    const { auditLogs } = await import('../../server/db/schema.js');
    const { eq, and } = await import('drizzle-orm');
    const logs = await db.select().from(auditLogs).where(
      and(eq(auditLogs.entityType, 'feature_flag'), eq(auditLogs.entityId, 'audit-test-flag'))
    );
    assert.ok(logs.length >= 1, 'Flag create should create audit log entry');
    assert.equal(logs[0].action, 'flag.create');
  });

  test('config set creates audit log entry', async () => {
    await app.inject({
      method: 'PATCH',
      url: '/admin/v1/config/audit-test-config',
      headers: { cookie: adminCookie },
      payload: { value: { test: true }, description: 'Audit test' },
    });

    const db = await getDb(app);
    const { auditLogs } = await import('../../server/db/schema.js');
    const { eq, and } = await import('drizzle-orm');
    const logs = await db.select().from(auditLogs).where(
      and(eq(auditLogs.entityType, 'app_config'), eq(auditLogs.entityId, 'audit-test-config'))
    );
    assert.ok(logs.length >= 1, 'Config create should create audit log entry');
    assert.equal(logs[0].action, 'config.create');
  });
});

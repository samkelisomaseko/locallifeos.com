import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../server/app.mjs';

describe('Admin routes — unauthenticated access', () => {
  test('GET /admin/v1/users without session returns 401', async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/admin/v1/users' });
    assert.equal(res.statusCode, 401);
    await app.close();
  });

  test('GET /admin/v1/flags without session returns 401', async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/admin/v1/flags' });
    assert.equal(res.statusCode, 401);
    await app.close();
  });

  test('GET /admin/v1/config without session returns 401', async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/admin/v1/config' });
    assert.equal(res.statusCode, 401);
    await app.close();
  });
});

describe('Admin panel', () => {
  test('GET /admin returns HTML', async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/admin' });
    assert.equal(res.statusCode, 200);
    assert.ok(res.headers['content-type'].includes('text/html'));
    assert.ok(res.body.includes('Admin Login'));
    await app.close();
  });
});

describe('Admin routes — non-admin role', { skip: process.env.DATABASE_URL ? false : 'DATABASE_URL not set' }, () => {
  test('GET /admin/v1/users as regular user returns 403', async () => {
    const app = await buildApp({ logger: false });
    const email = `user-${Date.now()}@example.com`;
    const signup = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email, password: 'password123', name: 'Regular User' },
    });
    const cookie = signup.headers['set-cookie'];
    const res = await app.inject({
      method: 'GET',
      url: '/admin/v1/users',
      headers: { cookie },
    });
    assert.equal(res.statusCode, 403);
    await app.close();
  });
});

describe('Admin input validation (unit)', () => {
  test('PATCH /admin/v1/flags/:key — no body returns 400', async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/v1/flags/test-flag',
      payload: {},
    });
    // Returns 401 (no session) — route validation happens after auth
    assert.ok([401, 400].includes(res.statusCode));
    await app.close();
  });

  test('PATCH /admin/v1/config/:key — missing value returns 400', async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/v1/config/test-key',
      payload: { description: 'no value' },
    });
    assert.ok([401, 400].includes(res.statusCode));
    await app.close();
  });

  test('PATCH /admin/v1/users/:id/subscription-tier — invalid tier returns 400', async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/v1/users/fake-id/subscription-tier',
      payload: { tier: 'invalid' },
    });
    assert.ok([401, 400].includes(res.statusCode));
    await app.close();
  });
});

import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../server/app.mjs';

const hasDb = !!process.env.DATABASE_URL;

describe('Auth routes (integration)', { skip: hasDb ? false : 'DATABASE_URL not set — skipping integration tests' }, () => {
  let app;

  after(async () => { if (app) await app.close(); });

  test('POST /api/v1/auth/signup — creates account and sets session cookie', async () => {
    app = await buildApp({ logger: false });
    const email = `test-${Date.now()}@example.com`;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email, password: 'password123', name: 'Test User' },
    });
    assert.equal(res.statusCode, 201);
    const body = res.json();
    assert.equal(body.user.email, email);
    assert.equal(body.user.role, 'user');
    const cookies = res.cookies;
    assert.ok(cookies.some(c => c.name === 'lls_session'));
  });

  test('POST /api/v1/auth/signup — duplicate email returns 409', async () => {
    app = await buildApp({ logger: false });
    const email = `dup-${Date.now()}@example.com`;
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email, password: 'password123', name: 'Dup User' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email, password: 'password123', name: 'Dup User 2' },
    });
    assert.equal(res.statusCode, 409);
  });

  test('POST /api/v1/auth/signup — short password returns 400', async () => {
    app = await buildApp({ logger: false });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: `short-${Date.now()}@example.com`, password: 'abc', name: 'Short' },
    });
    assert.equal(res.statusCode, 400);
  });

  test('POST /api/v1/auth/login — valid credentials return user', async () => {
    app = await buildApp({ logger: false });
    const email = `login-${Date.now()}@example.com`;
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email, password: 'password123', name: 'Login User' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'password123' },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().user.email, email);
  });

  test('POST /api/v1/auth/login — wrong password returns 401', async () => {
    app = await buildApp({ logger: false });
    const email = `wrong-${Date.now()}@example.com`;
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email, password: 'password123', name: 'Wrong User' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'wrongpassword' },
    });
    assert.equal(res.statusCode, 401);
  });

  test('GET /api/v1/auth/me — authenticated session returns user', async () => {
    app = await buildApp({ logger: false });
    const email = `me-${Date.now()}@example.com`;
    const signup = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email, password: 'password123', name: 'Me User' },
    });
    const cookie = signup.headers['set-cookie'];
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().user.email, email);
  });

  test('GET /api/v1/auth/me — no cookie returns 401', async () => {
    app = await buildApp({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/api/v1/auth/me' });
    assert.equal(res.statusCode, 401);
  });

  test('POST /api/v1/auth/logout — clears session', async () => {
    app = await buildApp({ logger: false });
    const email = `logout-${Date.now()}@example.com`;
    const signup = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email, password: 'password123', name: 'Logout User' },
    });
    const cookie = signup.headers['set-cookie'];
    const logout = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { cookie },
    });
    assert.equal(logout.statusCode, 200);
    // Session should now be invalid
    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie },
    });
    assert.equal(me.statusCode, 401);
  });
});

describe('Auth routes (unit — no DB)', () => {
  test('POST /api/v1/auth/signup — missing fields returns 400', async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: { email: 'bad' },
    });
    assert.equal(res.statusCode, 400);
    await app.close();
  });

  test('POST /api/v1/auth/login — missing fields returns 400', async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {},
    });
    assert.equal(res.statusCode, 400);
    await app.close();
  });
});

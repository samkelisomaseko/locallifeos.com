import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../server/app.mjs';

describe('API scaffold', () => {
  test('GET /api/v1/health returns ok without exposing db status', async () => {
    delete process.env.DATABASE_URL;
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, 'locallifeos-api');
    assert.equal(body.db, undefined); // public endpoint must not expose db status
    await app.close();
  });

  test('GET /api/v1/health/detail exposes db status', async () => {
    delete process.env.DATABASE_URL;
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/api/v1/health/detail' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.ok, true);
    assert.match(body.db, /^down:/);
    await app.close();
  });

  test('unknown /api/v1 route returns JSON 404 (not HTML)', async () => {
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/api/v1/nope' });
    assert.equal(res.statusCode, 404);
    assert.equal(res.headers['content-type'].includes('application/json'), true);
    await app.close();
  });

  test('CORS allows the configured app origin only', async () => {
    process.env.APP_ORIGIN = 'http://localhost:5173';
    const app = await buildApp({ logger: false });
    const good = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/health',
      headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'GET' },
    });
    assert.equal(good.statusCode, 204);
    const bad = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/health',
      headers: { origin: 'http://evil.example', 'access-control-request-method': 'GET' },
    });
    assert.notEqual(bad.headers['access-control-allow-origin'], 'http://evil.example');
    await app.close();
  });
});

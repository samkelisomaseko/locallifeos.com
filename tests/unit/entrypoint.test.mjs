import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import os from 'node:os';
import { buildApp } from '../../server/app.mjs';

const INDEX_MARKER = 'ENTRYPOINT-TEST-INDEX-abc123';
const ASSET_MARKER = 'ENTRYPOINT-TEST-ASSET-xyz789';

describe('unified entrypoint (static + API)', () => {
  let dir;
  let app;

  before(async () => {
    delete process.env.DATABASE_URL;
    dir = await mkdtemp(join(os.tmpdir(), 'llo-entrypoint-'));
    await mkdir(join(dir, 'assets'), { recursive: true });
    await writeFile(
      join(dir, 'index.html'),
      `<!doctype html><html><body>${INDEX_MARKER}</body></html>`,
    );
    await writeFile(join(dir, 'assets', 'app-abc123.js'), `// ${ASSET_MARKER}`);
    app = await buildApp({ serveStatic: true, staticDir: dir });
  });

  after(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  test('GET / returns index.html with html content-type and no-cache', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.equal(res.headers['cache-control'], 'no-cache');
    assert.match(res.body, new RegExp(INDEX_MARKER));
  });

  test('GET /assets/... serves file with immutable cache', async () => {
    const res = await app.inject({ method: 'GET', url: '/assets/app-abc123.js' });
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'], /javascript/);
    assert.match(res.headers['cache-control'], /immutable/);
    assert.match(res.body, new RegExp(ASSET_MARKER));
  });

  test('unknown /app-route falls back to index.html', async () => {
    const res = await app.inject({ method: 'GET', url: '/app-route' });
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.match(res.body, new RegExp(INDEX_MARKER));
  });

  test('/api/v1/health still returns JSON', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'], /application\/json/);
    assert.equal(res.json().ok, true);
  });

  test('unknown /api/* route returns JSON 404 (no SPA fallback)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/nope' });
    assert.equal(res.statusCode, 404);
    assert.match(res.headers['content-type'], /application\/json/);
  });

  test('unknown /admin/* sub-path returns 404 (no SPA fallback)', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/definitely-not-a-route' });
    assert.equal(res.statusCode, 404);
  });

  // light-my-request normalizes `/../x` to `/x` before it reaches the
  // handler (same as browsers do); that lands on the SPA fallback, which is
  // safe. The fully-encoded form reaches the handler intact and must 400.
  // In all cases the real package.json contents must never leak.
  for (const url of ['/../package.json', '/%2e%2e/package.json']) {
    test(`traversal ${url} never leaks file contents`, async () => {
      const res = await app.inject({ method: 'GET', url });
      const isFallback =
        res.statusCode === 200 && new RegExp(INDEX_MARKER).test(res.body);
      const isRejected = [400, 404].includes(res.statusCode);
      assert.ok(isFallback || isRejected, `expected SPA fallback or 400/404, got ${res.statusCode}`);
      assert.doesNotMatch(res.body, /drizzle-orm/);
      assert.doesNotMatch(res.body, /"private"/);
    });
  }

  test('traversal /%2E%2E%2Fpackage.json is rejected 400/404', async () => {
    const res = await app.inject({ method: 'GET', url: '/%2E%2E%2Fpackage.json' });
    assert.ok([400, 404].includes(res.statusCode), `expected 400/404, got ${res.statusCode}`);
    assert.doesNotMatch(res.body, /locallifeos/);
  });
});

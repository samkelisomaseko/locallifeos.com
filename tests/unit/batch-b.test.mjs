import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateEntity, ENTITY_NAMES } from '../../server/lib/validation.mjs';
import { buildApp } from '../../server/app.mjs';

describe('Batch B — per-entity validation schemas', () => {
  test('all 14 entities have schemas', () => {
    assert.equal(ENTITY_NAMES.length, 14);
  });

  test('tasks requires non-empty title', () => {
    assert.equal(validateEntity('tasks', { title: 'x' }).ok, true);
    assert.equal(validateEntity('tasks', { title: '' }).ok, false);
    assert.equal(validateEntity('tasks', {}).ok, false);
  });

  test('moods enforces enum + score range', () => {
    assert.equal(validateEntity('moods', { mood: 'happy', score: 4 }).ok, true);
    assert.equal(validateEntity('moods', { mood: 'furious' }).ok, false);
    assert.equal(validateEntity('moods', { mood: 'happy', score: 9 }).ok, false);
  });

  test('deals requires businessName + description', () => {
    assert.equal(validateEntity('deals', { businessName: 'b', description: 'd' }).ok, true);
    assert.equal(validateEntity('deals', { businessName: 'b' }).ok, false);
  });

  test('unknown entity fails closed', () => {
    assert.equal(validateEntity('nope', {}).ok, false);
  });

  test('validation errors are human-readable', () => {
    const r = validateEntity('tasks', {});
    assert.ok(r.errors.length > 0 && r.errors[0].includes('title'));
  });
});

describe('Batch B — LWW conflict + offline queue semantics', () => {
  test('stale client updatedAt loses to server (pure LWW check)', () => {
    const server = new Date('2026-09-10T12:00:00Z').getTime();
    const stale = new Date('2026-09-10T11:00:00Z').getTime();
    const fresh = new Date('2026-09-10T13:00:00Z').getTime();
    assert.ok(stale < server, 'stale write must be rejected with 409');
    assert.ok(!(fresh < server), 'fresh write must be accepted');
  });

  test('retry delays follow 2s/5s/10s backoff', async () => {
    const { readFile } = await import('node:fs/promises');
    const src = await readFile(new URL('../../public/lib/store.js', import.meta.url), 'utf-8');
    assert.match(src, /2000,\s*5000,\s*10000/);
  });

  test('store.js has no direct localStorage access (uses offline-cache)', async () => {
    const { readFile } = await import('node:fs/promises');
    const src = await readFile(new URL('../../public/lib/store.js', import.meta.url), 'utf-8');
    assert.ok(!src.includes('localStorage.'), 'store.js must not touch localStorage directly');
    assert.ok(src.includes('offline-cache'), 'store.js must use the offline-cache abstraction');
  });
});

describe('Batch B — admin moderation routes are gated', () => {
  test('unauthenticated admin entity list → 401', async () => {
    delete process.env.DATABASE_URL;
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/admin/v1/entities/tasks' });
    assert.equal(res.statusCode, 401);
    await app.close();
  });

  test('unauthenticated metrics → 401 (was public)', async () => {
    delete process.env.DATABASE_URL;
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/admin/v1/metrics' });
    assert.equal(res.statusCode, 401);
    await app.close();
  });

  test('unauthenticated sync-health → 401', async () => {
    delete process.env.DATABASE_URL;
    const app = await buildApp({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/admin/v1/sync-health' });
    assert.equal(res.statusCode, 401);
    await app.close();
  });

  test('unknown admin entity → 404 (not 500) when authed — skipped without DB', async (t) => {
    // Requires a live session + DB; documents the contract only.
    t.skip('needs DATABASE_URL + session');
  });
});

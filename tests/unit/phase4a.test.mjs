import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../server/app.mjs';
import {
  aliveUserIds,
  sweepExpired,
  isUserMuted,
  muteKey,
  readKey,
  isMutedInChannel,
  PRESENCE_TTL_MS,
  MODERATED_PLACEHOLDER,
} from '../../server/plugins/chat-realtime.mjs';

describe('Phase 4A — chat realtime routes are auth-gated (no DB)', () => {
  let app;
  test.before(async () => {
    delete process.env.DATABASE_URL;
    app = await buildApp();
  });
  test.after(async () => {
    await app.close();
  });

  const cases = [
    ['GET channel messages', { method: 'GET', url: '/api/v1/channels/abc/messages' }],
    ['POST channel read', { method: 'POST', url: '/api/v1/channels/abc/read', payload: {} }],
    ['GET channel unread', { method: 'GET', url: '/api/v1/channels/abc/unread' }],
    ['POST presence', { method: 'POST', url: '/api/v1/channels/abc/presence', payload: { status: 'online' } }],
    ['POST typing', { method: 'POST', url: '/api/v1/channels/abc/typing', payload: { isTyping: true } }],
    ['GET presence', { method: 'GET', url: '/api/v1/channels/abc/presence' }],
    ['DELETE admin message', { method: 'DELETE', url: '/admin/v1/chat/messages/abc' }],
    ['POST admin mute', { method: 'POST', url: '/admin/v1/chat/channels/abc/mute', payload: { userId: 'u1' } }],
    ['POST admin unmute', { method: 'POST', url: '/admin/v1/chat/channels/abc/unmute', payload: { userId: 'u1' } }],
  ];
  for (const [name, opts] of cases) {
    test(`unauthenticated ${name} → 401`, async () => {
      const res = await app.inject(opts);
      assert.equal(res.statusCode, 401, `${name} must require auth`);
    });
  }
});

describe('Phase 4A — presence TTL / expiry (pure)', () => {
  test('aliveUserIds keeps fresh entries, drops stale ones', () => {
    const now = 1_000_000;
    const entries = [
      ['fresh', now - 1_000],
      ['stale', now - PRESENCE_TTL_MS - 1],
    ];
    assert.deepEqual(aliveUserIds(entries, now), ['fresh']);
  });

  test('boundary age == TTL counts as alive', () => {
    const now = 1_000_000;
    assert.deepEqual(aliveUserIds([['edge', now - PRESENCE_TTL_MS]], now), ['edge']);
  });

  test('sweepExpired prunes Maps in place (raw ts + {status,ts} values)', () => {
    const now = 5_000_000;
    const m = new Map([
      ['a', now - 1_000],
      ['b', now - PRESENCE_TTL_MS - 5],
      ['c', { status: 'online', ts: now - 500 }],
      ['d', { status: 'away', ts: now - PRESENCE_TTL_MS - 500 }],
    ]);
    const out = sweepExpired(m, now);
    assert.equal(out, m, 'returns the same Map');
    assert.deepEqual([...m.keys()].sort(), ['a', 'c']);
  });

  test('TTL is 30s', () => {
    assert.equal(PRESENCE_TTL_MS, 30_000);
  });
});

describe('Phase 4A — mute helpers (pure)', () => {
  test('isUserMuted matches { userIds } and raw arrays', () => {
    assert.equal(isUserMuted({ userIds: ['u1', 'u2'] }, 'u1'), true);
    assert.equal(isUserMuted({ userIds: ['u1'] }, 'u9'), false);
    assert.equal(isUserMuted(['u1'], 'u1'), true);
    assert.equal(isUserMuted({ userIds: [] }, 'u1'), false);
    assert.equal(isUserMuted(null, 'u1'), false);
    assert.equal(isUserMuted({ userIds: ['u1'] }, null), false);
  });

  test('mute/read key prefixes', () => {
    assert.equal(muteKey('c1'), 'muted.c1');
    assert.equal(readKey('c1'), 'channelRead.c1');
  });

  test('moderated placeholder constant', () => {
    assert.equal(MODERATED_PLACEHOLDER, '[removed by moderator]');
  });

  test('isMutedInChannel degrades open without DB', async () => {
    delete process.env.DATABASE_URL;
    assert.equal(await isMutedInChannel('c1', 'u1'), false);
  });

  test('muted-user POST /api/v1/messages → 403 — skipped without DB', async (t) => {
    // Requires DATABASE_URL + a session + a mute-list row in app_config.
    t.skip('needs DATABASE_URL + session');
  });
});

describe('Phase 4A — static wiring (no new deps, conventions)', () => {
  test('entities messages POST enforces the mute list', async () => {
    const { readFile } = await import('node:fs/promises');
    const src = await readFile(new URL('../../server/plugins/entities.mjs', import.meta.url), 'utf-8');
    assert.match(src, /isMutedInChannel/);
    assert.match(src, /403/);
  });

  test('admin-chat soft-hides with before/after audit', async () => {
    const { readFile } = await import('node:fs/promises');
    const src = await readFile(new URL('../../server/plugins/admin-chat.mjs', import.meta.url), 'utf-8');
    assert.match(src, /chat\.message_hide/);
    assert.match(src, /before/);
    assert.match(src, /requireRole/);
    assert.match(src, /super_admin.*admin.*moderator/);
  });

  test('no websocket dependency introduced', async () => {
    const { readFile } = await import('node:fs/promises');
    const pkg = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf-8'));
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    assert.ok(!('ws' in all || '@fastify/websocket' in all), 'WS wiring is a separate ticket');
  });
});

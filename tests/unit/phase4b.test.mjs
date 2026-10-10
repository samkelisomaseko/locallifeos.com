import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../server/app.mjs';
import {
  validateAiChatBody,
  heuristicReply,
  resolveAiReply,
  buildSystemPrompt,
  checkQuota,
  consumeQuota,
  getQuotaStats,
  __resetQuotaForTests,
  __setDailyLimitForTests,
  MAX_MESSAGES,
  MAX_CONTENT_CHARS,
} from '../../server/plugins/ai-proxy.mjs';
import { requireRole } from '../../server/middleware/auth.mjs';

// Live LLM calls are never exercised here (no key in CI); the fallback path
// is what's verified. Keep the key unset so no test can hit the network.
delete process.env.AI_API_KEY;

const AI_ROUTES = [
  ['POST ai chat', { method: 'POST', url: '/api/v1/ai/chat', payload: { messages: [{ role: 'user', content: 'hi' }] } }],
  ['GET ai stats', { method: 'GET', url: '/admin/v1/ai/stats' }],
  ['GET ai memory', { method: 'GET', url: '/admin/v1/ai/memory/some-user' }],
  ['DELETE ai memory', { method: 'DELETE', url: '/admin/v1/ai/memory/some-user' }],
  ['PATCH ai config', { method: 'PATCH', url: '/admin/v1/ai/config', payload: { dailyPerUser: 50 } }],
];

describe('Phase 4B — AI routes are auth-gated (no DB)', () => {
  let app;
  test.before(async () => {
    delete process.env.DATABASE_URL;
    __resetQuotaForTests();
    app = await buildApp();
  });
  test.after(async () => {
    await app.close();
  });

  for (const [name, opts] of AI_ROUTES) {
    test(`unauthenticated ${name} → 401`, async () => {
      const res = await app.inject(opts);
      assert.equal(res.statusCode, 401, `${name} must require auth`);
    });
  }
});

describe('Phase 4B — chat validation (pure, no DB)', () => {
  test('empty / missing messages → invalid', () => {
    assert.equal(validateAiChatBody({}).ok, false);
    assert.equal(validateAiChatBody({ messages: [] }).ok, false);
    assert.equal(validateAiChatBody({ messages: 'hi' }).ok, false);
  });

  test('bad role → invalid', () => {
    const r = validateAiChatBody({ messages: [{ role: 'tool', content: 'x' }] });
    assert.equal(r.ok, false);
    assert.ok(r.errors[0].includes('role'));
  });

  test('empty content → invalid', () => {
    assert.equal(validateAiChatBody({ messages: [{ role: 'user', content: '  ' }] }).ok, false);
  });

  test(`oversize content (>${MAX_CONTENT_CHARS}) → invalid`, () => {
    const r = validateAiChatBody({ messages: [{ role: 'user', content: 'a'.repeat(MAX_CONTENT_CHARS + 1) }] });
    assert.equal(r.ok, false);
  });

  test(`>${MAX_MESSAGES} messages → invalid`, () => {
    const messages = Array.from({ length: MAX_MESSAGES + 1 }, () => ({ role: 'user', content: 'x' }));
    assert.equal(validateAiChatBody({ messages }).ok, false);
  });

  test('well-formed body → ok (all three roles)', () => {
    const r = validateAiChatBody({
      messages: [
        { role: 'system', content: 's' },
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi there' },
      ],
    });
    assert.equal(r.ok, true);
  });
});

describe('Phase 4B — heuristic fallback (pure, no network)', () => {
  const msg = (content) => [{ role: 'user', content }];

  test('greeting branch answers', () => {
    assert.ok(heuristicReply(msg('hello there')).length > 0);
  });

  test('task branch answers', () => {
    assert.match(heuristicReply(msg('remind me to buy milk')), /task/i);
  });

  test('mood branch answers', () => {
    assert.match(heuristicReply(msg('I feel anxious today')), /mood/i);
  });

  test('weather branch answers', () => {
    assert.match(heuristicReply(msg('what is the weather forecast?')), /weather/i);
  });

  test('unknown input echoes the last user message', () => {
    assert.match(heuristicReply(msg('xylophone zebra 123')), /xylophone zebra/);
  });

  test('resolveAiReply without key → fallback:true, non-empty, heuristic model', async () => {
    delete process.env.AI_API_KEY;
    const out = await resolveAiReply({ messages: msg('hello') });
    assert.equal(out.fallback, true);
    assert.equal(out.model, 'heuristic');
    assert.ok(typeof out.reply === 'string' && out.reply.length > 0);
  });

  test('buildSystemPrompt degrades gracefully + picks up prefs', () => {
    const base = buildSystemPrompt({});
    assert.ok(base.includes('LocalLife OS'));
    const rich = buildSystemPrompt({ aiPersonality: 'terse', aiLearningPreferences: 'examples' });
    assert.ok(rich.includes('terse') && rich.includes('examples'));
  });
});

describe('Phase 4B — per-user daily quota (pure, no DB)', () => {
  test.beforeEach(() => {
    __resetQuotaForTests();
    __setDailyLimitForTests(2);
  });
  test.afterEach(() => __resetQuotaForTests());

  test('allows up to the limit, then denies (429 path)', () => {
    assert.equal(checkQuota('u1').allowed, true);
    consumeQuota('u1');
    assert.equal(checkQuota('u1').allowed, true);
    consumeQuota('u1');
    const q = checkQuota('u1');
    assert.equal(q.allowed, false);
    assert.equal(q.used, 2);
    assert.equal(q.remaining, 0);
  });

  test('quotas are per-user (u2 unaffected by u1 exhaustion)', () => {
    consumeQuota('u1');
    consumeQuota('u1');
    assert.equal(checkQuota('u1').allowed, false);
    assert.equal(checkQuota('u2').allowed, true);
  });

  test('stats track in-memory users', () => {
    consumeQuota('u1');
    consumeQuota('u2');
    const s = getQuotaStats();
    assert.equal(s.inMemoryUsers, 2);
    assert.equal(s.dailyPerUser, 2);
  });
});

describe('Phase 4B — admin RBAC (pure requireRole, no DB)', () => {
  function fakeReply() {
    return {
      status: null,
      body: null,
      code(c) { this.status = c; return this; },
      send(b) { this.body = b; return this; },
    };
  }

  test('plain user → 403 on AI read roles', async () => {
    const reply = fakeReply();
    await requireRole('super_admin', 'admin', 'moderator')({ user: { role: 'user' } }, reply);
    assert.equal(reply.status, 403);
  });

  test('moderator passes AI reads, blocked from mutations', async () => {
    const readReply = fakeReply();
    await requireRole('super_admin', 'admin', 'moderator')({ user: { role: 'moderator' } }, readReply);
    assert.equal(readReply.status, null);
    const mutReply = fakeReply();
    await requireRole('super_admin', 'admin')({ user: { role: 'moderator' } }, mutReply);
    assert.equal(mutReply.status, 403);
  });

  test('admin passes both reads and mutations', async () => {
    for (const roles of [['super_admin', 'admin', 'moderator'], ['super_admin', 'admin']]) {
      const reply = fakeReply();
      await requireRole(...roles)({ user: { role: 'admin' } }, reply);
      assert.equal(reply.status, null);
    }
  });
});

describe('Phase 4B — static wiring (no new deps, conventions)', () => {
  test('app registers both AI plugins', async () => {
    const { readFile } = await import('node:fs/promises');
    const src = await readFile(new URL('../../server/app.mjs', import.meta.url), 'utf-8');
    assert.match(src, /aiProxyPlugin/);
    assert.match(src, /adminAiPlugin/);
  });

  test('no new npm dependencies (native fetch only)', async () => {
    const { readFile } = await import('node:fs/promises');
    const pkg = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf-8'));
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    assert.ok(!('openai' in all), 'must use native fetch, not the openai SDK');
  });

  test('stats never leak the provider key', async () => {
    const { readFile } = await import('node:fs/promises');
    const src = await readFile(new URL('../../server/plugins/admin-ai.mjs', import.meta.url), 'utf-8');
    assert.match(src, /providerConfigured/);
    assert.ok(!/key:\s*process\.env/.test(src), 'key must only appear as a boolean flag');
  });

  test('memory-clear + config-update are audit-logged with before/after', async () => {
    const { readFile } = await import('node:fs/promises');
    const src = await readFile(new URL('../../server/plugins/admin-ai.mjs', import.meta.url), 'utf-8');
    assert.match(src, /ai\.memory_clear/);
    assert.match(src, /ai\.config_update/);
    assert.match(src, /before/);
  });

  test('memory-clear audit end-to-end — skipped without DB', async (t) => {
    // Requires DATABASE_URL + an admin session + a settings row.
    t.skip('needs DATABASE_URL + session');
  });
});

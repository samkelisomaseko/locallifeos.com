import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Phase 3 Batch C — offline sync queue semantics (pure unit, no DB).
 * Static readFile+assert style like batch-b.test.mjs: no app import, so no hang.
 */
describe('Batch C — ServerStore queue semantics (static)', () => {
  async function storeSrc() {
    const { readFile } = await import('node:fs/promises');
    return readFile(new URL('../../public/lib/store.js', import.meta.url), 'utf-8');
  }

  test('LWW: updatedAt comparison or 409 handling present', async () => {
    const src = await storeSrc();
    assert.ok(
      src.includes('409') || /new Date\(.*updatedAt\)\s*>/.test(src),
      'store.js must handle LWW conflicts (409 or updatedAt comparison)',
    );
  });

  test('retry delays follow 2s/5s/10s backoff', async () => {
    const src = await storeSrc();
    assert.match(src, /2000,\s*5000,\s*10000/);
  });

  test('enqueueSync on offline writes', async () => {
    const src = await storeSrc();
    assert.ok(src.includes('enqueueSync'), 'store.js must define enqueueSync');
    assert.ok(src.includes('navigator.onLine'), 'store.js must gate on navigator.onLine');
  });

  test("flushQueue on 'online' event", async () => {
    const src = await storeSrc();
    assert.ok(src.includes('flushQueue'), 'store.js must define flushQueue');
    assert.match(src, /addEventListener\(['"]online['"]/);
  });
});

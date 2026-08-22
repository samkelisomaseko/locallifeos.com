import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadClassic } from './helpers/load-classic.mjs';

let ctx;
beforeEach(() => {
  ctx = loadClassic(['public/modules/db-pro.js']);
});

describe('DB_PRO (localStorage fallback backend)', () => {
  test('put/get roundtrip per store', async () => {
    await ctx.DB_PRO.put('posts', { id: 'p1', content: 'hello' });
    const got = await ctx.DB_PRO.get('posts', 'p1');
    assert.deepEqual(got, { id: 'p1', content: 'hello' });
    assert.equal(await ctx.DB_PRO.get('posts', 'missing'), null);
  });

  test('getAll returns only the requested store', async () => {
    await ctx.DB_PRO.put('posts', { id: 'a' });
    await ctx.DB_PRO.put('goals', { id: 'b' });
    const posts = await ctx.DB_PRO.getAll('posts');
    assert.equal(posts.length, 1);
    assert.equal(posts[0].id, 'a');
  });

  test('put upserts by id', async () => {
    await ctx.DB_PRO.put('posts', { id: 'x', content: 'v1' });
    await ctx.DB_PRO.put('posts', { id: 'x', content: 'v2' });
    const got = await ctx.DB_PRO.get('posts', 'x');
    assert.equal(got.content, 'v2');
    assert.equal((await ctx.DB_PRO.getAll('posts')).length, 1);
  });

  test('del removes a record and is a no-op for unknown ids', async () => {
    await ctx.DB_PRO.put('posts', { id: 'd1' });
    await ctx.DB_PRO.del('posts', 'd1');
    assert.equal(await ctx.DB_PRO.get('posts', 'd1'), null);
    await ctx.DB_PRO.del('posts', 'unknown'); // must not throw
    assert.equal((await ctx.DB_PRO.getAll('posts')).length, 0);
  });

  test('state persists in localStorage under the locallife-db namespace', async () => {
    await ctx.DB_PRO.put('nutritionLogs', { id: 'n1', name: 'Oats', kcal: 150 });
    const raw = JSON.parse(ctx.localStorage.getItem('locallife-db'));
    assert.equal(raw.nutritionLogs.n1.kcal, 150);
  });
});

describe('module globals exposed by db-pro.js', () => {
  test('exports DB_PRO, toast fallback, showCtxMenu and AI namespaces', () => {
    for (const key of ['DB_PRO', 'toast', 'showCtxMenu', 'LocalAI', 'AIMemory', 'AISuggestions', 'AIEmotion', 'AIAutomation']) {
      assert.notEqual(ctx.window[key], undefined, `window.${key} should be defined`);
    }
    assert.equal(typeof ctx.window.toast, 'function');
    assert.equal(typeof ctx.window.showCtxMenu, 'function');
  });
});

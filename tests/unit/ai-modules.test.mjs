import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadClassic } from './helpers/load-classic.mjs';

const FILES = ['public/modules/db-pro.js', 'public/modules/ai-super-core.js'];

let ctx;
beforeEach(() => {
  ctx = loadClassic(FILES);
  // AIUtil/AIMemory/AIEmotion are top-level consts in ai-super-core.js (not window props),
  // so pull references from inside the context scope.
  const refs = ctx.evaluate('{ AIUtil, AIMemory, AIEmotion }');
  ctx.AIUtil = refs.AIUtil;
  ctx.AIMemory = refs.AIMemory;
  ctx.AIEmotion = refs.AIEmotion;
});

describe('AIUtil', () => {
  test('clamp clamps within bounds and passes through in-range values', () => {
    const { clamp } = ctx.AIUtil ?? ctx.window.AIUtil;
    assert.equal(clamp(5, 0, 3), 3);
    assert.equal(clamp(-2, 0, 3), 0);
    assert.equal(clamp(2, 0, 3), 2);
    assert.equal(clamp(0, 0, 3), 0);
    assert.equal(clamp(3, 0, 3), 3);
  });

  test('humanTime formats as YYYY-MM-DD HH:mm in local time; empty -> empty', () => {
    const { humanTime } = ctx.AIUtil;
    const d = new Date(2026, 0, 5, 7, 9); // local Jan 5 2026, 07:09
    assert.equal(humanTime(d.toISOString()), '2026-01-05 07:09');
    assert.equal(humanTime(''), '');
    assert.equal(humanTime(null), '');
    assert.equal(humanTime(undefined), '');
  });

  test('uid uses prefix + random suffix, and is unique across calls', () => {
    const { uid } = ctx.AIUtil;
    const a = uid('task');
    const b = uid('task');
    assert.match(a, /^task_[a-z0-9]+$/);
    assert.notEqual(a, b);
    assert.match(uid(), /^id_[a-z0-9]+$/); // default prefix
  });

  test('safeJSON roundtrips values through localStorage and falls back cleanly', () => {
    const { safeJSON } = ctx.AIUtil;
    safeJSON.set('k1', { a: 1, b: [2, 3] });
    assert.deepEqual(safeJSON.get('k1', null), { a: 1, b: [2, 3] });
    assert.equal(safeJSON.get('missing', 'fallback'), 'fallback');
    // corrupted stored value -> fallback instead of throwing
    ctx.localStorage.setItem('bad', '{not json');
    assert.equal(safeJSON.get('bad', 'recovered'), 'recovered');
  });
});

describe('AIMemory (ai-super-core local instance)', () => {
  test('addTask assigns id/done:false and persists to localStorage', () => {
    const t = ctx.AIMemory.addTask({ title: 'Test task' });
    assert.match(t.id, /^task_/);
    assert.equal(t.done, false);
    const raw = JSON.parse(ctx.localStorage.getItem('ll.memory.v1'));
    assert.equal(raw.tasks.some((x) => x.id === t.id), true);
  });

  test('toggleTask flips done state', () => {
    const t = ctx.AIMemory.addTask({ title: 'Flip me' });
    ctx.AIMemory.toggleTask(t.id, true);
    assert.equal(ctx.AIMemory.all().tasks.find((x) => x.id === t.id).done, true);
    ctx.AIMemory.toggleTask(t.id); // default toggles
    assert.equal(ctx.AIMemory.all().tasks.find((x) => x.id === t.id).done, false);
  });

  test('forget removes an entity by type+id and reports miss correctly', () => {
    const p = ctx.AIMemory.addPlace({ name: 'Park' });
    assert.equal(ctx.AIMemory.forget('places', p.id), true);
    assert.equal(ctx.AIMemory.all().places.length, 0);
    assert.equal(ctx.AIMemory.forget('places', 'nope'), false);
    assert.equal(ctx.AIMemory.forget('unknownType', 'x'), false);
  });
});

describe('AIEmotion.analyze (lexicon scoring)', () => {
  test('positive words push score up and yield positive mood', () => {
    const r = ctx.AIEmotion.analyze('I feel great and happy today');
    assert.ok(r.score >= 2, `score=${r.score}`);
    assert.equal(r.mood, 'positive');
    assert.equal(r.label, 'positive');
  });

  test('negative words push score down and yield negative mood', () => {
    const r = ctx.AIEmotion.analyze('stressed anxious overwhelmed');
    assert.ok(r.score <= -2, `score=${r.score}`);
    assert.equal(r.mood, 'negative');
  });

  test('neutral text yields neutral mood with zero score', () => {
    const r = ctx.AIEmotion.analyze('the meeting is at three');
    assert.equal(r.score, 0);
    assert.equal(r.mood, 'neutral');
  });

  test('"thanks" heuristic adds +1; >=3 exclamations subtract 1', () => {
    assert.equal(ctx.AIEmotion.analyze('thanks').score, 1);
    // 'amazing' is NOT in the lexicon -> only the exclamation penalty applies
    assert.equal(ctx.AIEmotion.analyze('wow!!! amazing!!!').score, -1);
  });

  test('score clamps to [-3, 3]', () => {
    const neg = ctx.AIEmotion.analyze(
      'stressed angry sad annoyed frustrated worried panic tired',
    );
    const pos = ctx.AIEmotion.analyze(
      'great good happy love excited awesome relaxed chill fun thanks yay',
    );
    assert.equal(neg.score, -3);
    assert.equal(pos.score, 3);
  });
});

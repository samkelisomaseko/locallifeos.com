import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOAST_SRC = readFileSync(path.join(HERE, '../../public/lib/toast.js'), 'utf8');

function makeElement() {
  const classes = new Set();
  return {
    textContent: '',
    className: 'toast-notification',
    classList: {
      add: (...c) => c.forEach((x) => classes.add(x)),
      remove: (...c) => c.forEach((x) => classes.delete(x)),
      contains: (x) => classes.has(x),
    },
    _classes: classes,
  };
}

function loadToast({ element = makeElement(), timers = null } = {}) {
  const timeouts = [];
  const sandbox = {
    console,
    document: { getElementById: (id) => (id === 'toastNotification' ? element : null) },
    setTimeout: timers === 'capture'
      ? (fn, ms) => { timeouts.push({ fn, ms }); return timeouts.length; }
      : () => 0,
    clearTimeout() {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(TOAST_SRC, sandbox, { filename: 'toast.js' });
  return { sandbox, element, timeouts };
}

describe('toast: global showToast contract', () => {
  test('defines window.showToast as a function', () => {
    const { sandbox } = loadToast();
    assert.equal(typeof sandbox.showToast, 'function');
  });

  test('sets message text and reveals with .show', () => {
    const { sandbox, element } = loadToast();
    sandbox.showToast('Hello world', 'success');
    assert.equal(element.textContent, 'Hello world');
    assert.ok(element.className.includes('show'));
  });

  test('ai_info type adds the ai-info-toast variant class', () => {
    const { sandbox, element } = loadToast();
    sandbox.showToast('AI tip', 'ai_info');
    assert.ok(element.className.includes('ai-info-toast'));
    assert.ok(element.className.includes('show'));
  });

  test('plain types do not add the ai variant class', () => {
    const { sandbox, element } = loadToast();
    sandbox.showToast('Saved', 'success');
    assert.ok(!element.className.includes('ai-info-toast'));
  });

  test('malicious markup renders as inert text (XSS-safe)', () => {
    const { sandbox, element } = loadToast();
    const evil = `<img src=x onerror="steal()">'"` + '`';
    sandbox.showToast(evil, 'error');
    assert.equal(element.textContent, evil); // no parsing, no execution
  });

  test('benign text round-trips byte-identical', () => {
    const { sandbox, element } = loadToast();
    const msg = `Subscribed to Pro+ tier! Features unlocked. 100% & "ready"`;
    sandbox.showToast(msg, 'info');
    assert.equal(element.textContent, msg);
  });

  test('extra arguments (4th flag used at call sites) are ignored', () => {
    const { sandbox, element } = loadToast();
    sandbox.showToast('Channel name is required.', 'error', 2000, true);
    assert.equal(element.textContent, 'Channel name is required.');
  });

  test('hide timer removes .show after duration', () => {
    const { sandbox, element, timeouts } = loadToast({ timers: 'capture' });
    sandbox.showToast('Timed', 'info', 1500);
    assert.equal(timeouts.length, 1);
    assert.equal(timeouts[0].ms, 1500);
    timeouts[0].fn();
    assert.ok(!element.className.includes('show'));
  });

  test('missing toast element is a silent no-op, never throws', () => {
    const { sandbox } = loadToast({ element: null });
    sandbox.document.getElementById = () => null;
    assert.doesNotThrow(() => sandbox.showToast('hi', 'info'));
    assert.doesNotThrow(() => sandbox.showToast(null, 'error', -5, true));
  });
});

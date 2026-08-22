import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Loads classic browser scripts (public/modules/*.js) into a fresh vm context.
// `window` IS the sandbox object, so `window.X = ...` assignments become visible
// to later bare-identifier reads, mirroring browser global-scope semantics.
export function loadClassic(files, { sandboxExtras = {} } = {}) {
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };

  const elementStub = () => ({
    style: {},
    dataset: {},
    className: '',
    innerHTML: '',
    textContent: '',
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {},
    getAttribute: () => null,
    appendChild() {},
    remove() {},
    addEventListener() {},
    removeEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ width: 0, height: 0, left: 0, top: 0 }),
  });

  const documentStub = {
    readyState: 'loading',
    head: elementStub(),
    body: elementStub(),
    addEventListener() {},
    removeEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: elementStub,
  };

  const sandbox = {
    console,
    localStorage,
    document: documentStub,
    navigator: {},
    location: { href: 'http://localhost/' },
    innerWidth: 1440,
    innerHeight: 900,
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval: () => 0,
    clearInterval() {},
    requestAnimationFrame() {},
    confirm: () => true,
    alert() {},
    prompt: () => null,
    Blob: class Blob {},
    URL,
    crypto: globalThis.crypto,
    Date,
    JSON,
    Math,
    performance: globalThis.performance ?? { now: () => 0 },
    ...sandboxExtras,
  };
  sandbox.window = sandbox; // window assignments == bare globals
  sandbox.globalThis = sandbox;
  sandbox.MutationObserver = class {
    observe() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
  sandbox.IntersectionObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  };

  const context = vm.createContext(sandbox);
  // Evaluate expressions INSIDE the context (can see top-level const/let of loaded scripts)
  sandbox.evaluate = (code) => vm.runInContext(`(${code})`, context);
  for (const file of files) {
    vm.runInContext(readFileSync(file, 'utf8'), context, { filename: file });
  }
  return sandbox;
}

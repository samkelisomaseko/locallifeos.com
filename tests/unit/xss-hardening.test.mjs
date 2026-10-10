import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Feature 30 — client XSS hardening (pure unit, no DOM, no DB, no app import).
 * Loads public/lib/escape.js in a vm sandbox with a fake window object, so
 * the test exercises the REAL shipped code (no duplicated logic).
 */
describe('Feature 30 — LLOS_Escape (shares public/lib/escape.js)', () => {
  async function loadEscape() {
    const { readFile } = await import('node:fs/promises');
    const { runInNewContext } = await import('node:vm');
    const src = await readFile(new URL('../../public/lib/escape.js', import.meta.url), 'utf-8');
    return { src, load() {
      const window = {};
      runInNewContext(src, { window }, { filename: 'escape.js' });
      assert.ok(window.LLOS_Escape, 'escape.js must attach window.LLOS_Escape');
      return window.LLOS_Escape;
    } };
  }

  test('file defines the full entity map (no duplication in test)', async () => {
    const { src } = await loadEscape();
    for (const entity of ['&amp;', '&lt;', '&gt;', '&quot;', '&#39;', '&#96;']) {
      assert.ok(src.includes(entity), `escape.js must define entity ${entity}`);
    }
    assert.ok(src.includes('window.LLOS_Escape'), 'must attach window.LLOS_Escape');
    assert.ok(!/^\s*(import|export)\s/m.test(src), 'classic script: no import/export');
  });

  test('escapeHtml neutralizes a classic img-onerror payload', async () => {
    const { load } = await loadEscape();
    const { escapeHtml } = load();
    const out = escapeHtml('<img src=x onerror=alert(1)>');
    assert.ok(!out.includes('<') && !out.includes('>'), 'angle brackets must be inert');
    assert.equal(out, '&lt;img src=x onerror=alert(1)&gt;');
  });

  test('escapeHtml escapes quotes and backtick', async () => {
    const { load } = await loadEscape();
    const { escapeHtml } = load();
    assert.equal(escapeHtml(`'"\``), '&#39;&quot;&#96;');
    assert.equal(escapeHtml('a&b'), 'a&amp;b');
  });

  test('escapeAttr is safe for double-quoted attributes incl. backtick', async () => {
    const { load } = await loadEscape();
    const { escapeAttr } = load();
    const out = escapeAttr(`" onmouseover="alert(1)`);
    assert.ok(!out.includes('"'), 'double quotes must be inert in attr context');
    assert.equal(escapeAttr('a`b'), 'a&#96;b');
  });

  test('escapeJsSingle round-trips through HTML-attr decoding', async () => {
    const { load } = await loadEscape();
    const { escapeAttr, escapeJsSingle } = load();
    // Simulate: onclick="fn('USER')" with hostile USER. HTML-decode the attr
    // value, then check the JS single-quoted string stays intact.
    const user = `x');alert(1);//`;
    const html = escapeAttr(escapeJsSingle(user));
    assert.ok(!html.includes("'"), 'no raw single quote may reach the attribute');
    const decoded = html.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    assert.equal(decoded, `x\\');alert(1);//`, 'backslash escape must survive HTML decoding');
  });

  test('safeMediaUrl allow-lists http(s)/data:image/blob, drops javascript:', async () => {
    const { load } = await loadEscape();
    const { safeMediaUrl } = load();
    assert.equal(safeMediaUrl('https://example.com/a.png'), 'https://example.com/a.png');
    assert.equal(safeMediaUrl('http://example.com/a.png'), 'http://example.com/a.png');
    assert.ok(safeMediaUrl('data:image/png;base64,AAA').startsWith('data:image/'));
    assert.ok(safeMediaUrl('blob:https://x/y').startsWith('blob:'));
    assert.equal(safeMediaUrl('javascript:alert(1)'), '');
    assert.equal(safeMediaUrl('JaVaScRiPt:alert(1)'), '');
    assert.equal(safeMediaUrl('vbscript:msgbox(1)'), '');
    assert.equal(safeMediaUrl(''), '');
    assert.equal(safeMediaUrl(null), '');
    // Quotes in an allowed URL are still escaped for attr context.
    assert.ok(!safeMediaUrl('https://e.com/"onerror="x').includes('"'));
  });

  test('benign content renders identically (no visual change)', async () => {
    const { load } = await loadEscape();
    const { escapeHtml, escapeAttr } = load();
    const benign = [
      'Hello world 123',
      'Malandela\'s Restaurant — open 8:00–17:00',
      'Café Münchën 😄🎉',
      'Price: E150.00 (save 20%)',
      'user@example.com • +268 7601 2345',
    ];
    for (const s of benign) {
      // Escaping only neutralizes markup: HTML-decoding the output must give
      // back the exact original (i.e. plain text renders identically).
      const decode = (str) => str
        .replace(/&#96;/g, '`').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
        .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
      assert.equal(decode(escapeHtml(s)), s, `benign text must round-trip: ${s}`);
      assert.equal(decode(escapeAttr(s)), s, `benign attr must round-trip: ${s}`);
    }
    assert.equal(escapeHtml('plain'), 'plain');
    assert.equal(escapeAttr('plain'), 'plain');
  });

  test('non-string inputs stringify safely', async () => {
    const { load } = await loadEscape();
    const { escapeHtml, escapeAttr } = load();
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(42), '42');
    assert.equal(escapeHtml(0), '0');
    assert.equal(escapeAttr(null), '');
  });
});

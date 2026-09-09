import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, generateSessionToken, sha256, sessionExpiresAt } from '../../server/lib/crypto.mjs';

describe('server/lib/crypto', () => {
  test('hashPassword returns argon2id hash', async () => {
    const h = await hashPassword('testpassword');
    assert.match(h, /^\$argon2id\$/);
  });

  test('verifyPassword roundtrip — correct password returns true', async () => {
    const h = await hashPassword('mypassword');
    assert.equal(await verifyPassword('mypassword', h), true);
  });

  test('verifyPassword — wrong password returns false', async () => {
    const h = await hashPassword('mypassword');
    assert.equal(await verifyPassword('wrongpassword', h), false);
  });

  test('generateSessionToken returns base64url string', () => {
    const t = generateSessionToken();
    assert.equal(typeof t, 'string');
    assert.ok(t.length > 20);
    assert.match(t, /^[A-Za-z0-9_-]+$/);
  });

  test('generateSessionToken produces unique values', () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    assert.notEqual(a, b);
  });

  test('sha256 returns hex string', () => {
    const h = sha256('hello');
    assert.equal(h.length, 64);
    assert.match(h, /^[0-9a-f]{64}$/);
  });

  test('sha256 is deterministic', () => {
    assert.equal(sha256('test'), sha256('test'));
  });

  test('sessionExpiresAt returns future Date', () => {
    const exp = sessionExpiresAt();
    assert.ok(exp instanceof Date);
    assert.ok(exp > new Date());
  });
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { hash, verify } from '@node-rs/argon2';

// Proves the native Argon2id binding works on this machine (plan.md §4 auth choice).
describe('Argon2id password hashing', () => {
  test('hash + verify roundtrip; wrong password fails', async () => {
    const h = await hash('password');
    assert.notEqual(h, 'password');
    assert.match(h, /^\$argon2id\$/);
    assert.equal(await verify(h, 'password'), true);
    assert.equal(await verify(h, 'wrong-password'), false);
  });

  test('same password yields different hashes (unique salt)', async () => {
    const a = await hash('password');
    const b = await hash('password');
    assert.notEqual(a, b);
    assert.equal(await verify(a, 'password'), true);
    assert.equal(await verify(b, 'password'), true);
  });
});

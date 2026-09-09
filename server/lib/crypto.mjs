/**
 * @module server/lib/crypto
 * Password hashing (Argon2id) and session token helpers.
 * Sessions: opaque random token → SHA-256 hash stored in DB; raw token in HttpOnly cookie.
 */
import { hash, verify } from '@node-rs/argon2';
import { randomBytes, createHash } from 'node:crypto';

const SESSION_DAYS = 7;
const TOKEN_BYTES = 32;

export async function hashPassword(plaintext) {
  return hash(plaintext);
}

export async function verifyPassword(plaintext, storedHash) {
  return verify(storedHash, plaintext);
}

export function generateSessionToken() {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function sha256(input) {
  return createHash('sha256').update(input).digest('hex');
}

export function sessionExpiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_DAYS);
  return d;
}

export const SESSION_COOKIE = 'lls_session';
export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

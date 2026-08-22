import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

/**
 * Singleton Postgres client + Drizzle instance.
 * Lazy: constructing without DATABASE_URL throws only when queried,
 * so the API can boot (health endpoint) even before the DB is provisioned.
 */

let client;
let db;

export function getDb() {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not set — cannot create DB client');
    }
    // prepare: false is required for pooled providers like Neon (no prepared-statement reuse)
    client = postgres(url, { prepare: false, max: 5 });
    db = drizzle(client, { schema });
  }
  return db;
}

export async function closeDb() {
  if (client) await client.end();
  client = undefined;
  db = undefined;
}

export async function pingDb() {
  const result = { ok: false, error: null };
  try {
    await getDb()`select 1`;
    result.ok = true;
  } catch (e) {
    result.error = e.message;
  }
  return result;
}

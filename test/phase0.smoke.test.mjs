import { test } from 'node:test';
import assert from 'node:assert/strict';

test('placeholder suite — will grow with real unit tests in Phase 1+', () => {
  assert.equal(1 + 1, 2);
});

test('env example references both required keys', async () => {
  const { readFile } = await import('node:fs/promises');
  const example = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
  assert.match(example, /OPENWEATHER_API_KEY=/);
  assert.match(example, /VITE_GOOGLE_MAPS_API_KEY=/);
});
/**
 * @module server/server
 * Unified production entrypoint: serves dist/ static (SPA fallback) + the
 * full Fastify API (incl. /api/weather proxy via server/plugins/weather.mjs)
 * on a single PORT (default 4173).
 *
 * - server/api.mjs stays as the standalone API-only dev entry (PORT_API).
 * - server/serve.mjs (legacy plain-http static+weather) is left in place
 *   for backwards compat but is NOT used by this path (no double-register).
 */
import { stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app.mjs';

const serverRoot = dirname(fileURLToPath(import.meta.url));
const distDir = process.env.DIST_DIR
  ? join(process.cwd(), process.env.DIST_DIR)
  : join(serverRoot, '..', 'dist');
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? '0.0.0.0';

try {
  const info = await stat(join(distDir, 'index.html'));
  if (!info.isFile()) throw new Error('not a file');
} catch {
  console.error(
    `[server] dist/index.html not found at ${distDir}. Run \`npm run build\` first, or set DIST_DIR.`,
  );
  process.exit(1);
}

const app = await buildApp({
  prettyLogs: process.env.NODE_ENV !== 'production',
  serveStatic: true,
  staticDir: distDir,
});

await app.listen({ port, host });
console.log(
  `LocalLife OS unified server (API + static) at http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`,
);

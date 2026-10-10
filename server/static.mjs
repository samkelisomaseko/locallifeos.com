/**
 * @module server/static
 * Unified-entrypoint static serving (no new deps — plain node:fs streaming).
 * Serves dist/ with SPA fallback to index.html. Called at app ROOT level
 * (not via app.register) so setNotFoundHandler applies globally.
 *
 * Precedence: /api/*, /admin*, /uploads/* never reach here for registered
 * routes (Fastify matches those first); the not-found handler returns JSON
 * 404 for those prefixes and only serves files / SPA fallback otherwise.
 */
import { createReadStream, promises as fsp } from 'node:fs';
import { extname, join, normalize, resolve, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const JSON_404 = { error: 'Not found' };

export function resolveDistDir(explicit) {
  if (explicit) return resolve(explicit);
  if (process.env.DIST_DIR) return resolve(process.cwd(), process.env.DIST_DIR);
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
}

function contentType(filePath) {
  return MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
}

/**
 * Register dist/ static serving + SPA fallback on a root Fastify instance.
 * @param {import('fastify').FastifyInstance} app
 * @param {{ distDir?: string }} opts
 * @returns {Promise<string>} resolved dist dir
 */
export async function registerStatic(app, opts = {}) {
  const root = resolveDistDir(opts.distDir);
  const indexFile = join(root, 'index.html');

  async function sendFile(reply, filePath, cacheControl) {
    return reply
      .header('Content-Type', contentType(filePath))
      .header('Cache-Control', cacheControl)
      .send(createReadStream(filePath));
  }

  async function sendIndex(reply) {
    try {
      const info = await fsp.stat(indexFile);
      if (!info.isFile()) throw new Error('not a file');
    } catch {
      return reply
        .code(404)
        .type('application/json; charset=utf-8')
        .send({ error: 'Static build not found (missing dist/index.html)' });
    }
    return sendFile(reply, indexFile, 'no-cache');
  }

  app.setNotFoundHandler(async (req, reply) => {
    const rawUrl = req.raw.url || req.url || '/';
    const pathOnly = rawUrl.split('?')[0].split('#')[0];

    // API / admin / uploads namespaces never fall back to the SPA.
    if (
      pathOnly === '/api' || pathOnly.startsWith('/api/') ||
      pathOnly === '/admin' || pathOnly.startsWith('/admin/') ||
      pathOnly === '/uploads' || pathOnly.startsWith('/uploads/')
    ) {
      // Note: registered /admin (panel) and /uploads/* routes match before
      // this handler; only unknown sub-paths land here.
      return reply.code(404).type('application/json; charset=utf-8').send(JSON_404);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return reply.code(404).type('application/json; charset=utf-8').send(JSON_404);
    }

    let pathname;
    try {
      pathname = decodeURIComponent(pathOnly);
    } catch {
      return reply.code(400).type('application/json; charset=utf-8').send({ error: 'Bad request' });
    }
    if (pathname === '/') pathname = '/index.html';

    // Path containment: resolved file must stay inside dist/.
    const filePath = normalize(join(root, pathname));
    if (filePath !== root && !filePath.startsWith(root + sep)) {
      return reply.code(400).type('application/json; charset=utf-8').send({ error: 'Bad request' });
    }
    if (filePath === root) return sendIndex(reply);

    let isFile = false;
    try {
      isFile = (await fsp.stat(filePath)).isFile();
    } catch {
      isFile = false;
    }
    if (!isFile) return sendIndex(reply); // SPA fallback

    const cache = pathOnly.startsWith('/assets/')
      ? 'public, max-age=31536000, immutable'
      : pathname === '/index.html'
        ? 'no-cache'
        : 'public, max-age=3600';
    return sendFile(reply, filePath, cache);
  });

  return root;
}

/**
 * @module server/plugins/uploads
 * Local-disk uploads (stepping stone to S3).
 *
 * POST /api/v1/uploads (requireAuth) accepts JSON:
 *   { filename, contentType, dataBase64 }
 * Returns: { url: '/uploads/<userId>/<uuid>-<safe-name>' }
 *
 * GET /uploads/* serves files with a path-containment check.
 *
 * NOTE (S3 swap): replace the fs write in the POST handler with an
 * S3 PutObject (key = `<userId>/<uuid>-<safe-name>`, ContentType passthrough)
 * and return the CloudFront/S3 URL; replace the GET handler with a redirect
 * (or remove it and point clients at the CDN). Keep the 5MB + allow-list
 * validation in front of either backend.
 *
 * USAGE: profile avatarUrl, place/deal images — clients store the returned
 * `url` in `profiles.avatarUrl` / `places.imageUrl` / `deals.imageUrl`
 * style fields via the normal entity PUT routes. No public-UI changes here.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { requireAuth } from '../middleware/auth.mjs';

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_BYTES = 5 * 1024 * 1024;

const EXT_BY_TYPE = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export function sanitizeFilename(name) {
  const base = path.basename(String(name ?? 'upload'));
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) || 'upload';
}

export function uploadsDir() {
  return path.resolve(process.cwd(), 'uploads');
}

export default async function uploadsPlugin(app) {
  // ── POST /api/v1/uploads — JSON base64 (no new deps) ───────────
  app.post('/api/v1/uploads', { preHandler: [requireAuth] }, async (req, reply) => {
    const body = req.body ?? {};
    const { filename, contentType, dataBase64 } = body;
    if (!filename || !contentType || !dataBase64) {
      return reply.code(400).send({ error: 'filename, contentType, and dataBase64 are required.' });
    }
    if (!ALLOWED_TYPES.has(contentType)) {
      return reply.code(400).send({ error: `Unsupported content type. Allowed: ${[...ALLOWED_TYPES].join(', ')}` });
    }
    let buf;
    try {
      buf = Buffer.from(String(dataBase64), 'base64');
    } catch {
      return reply.code(400).send({ error: 'Invalid base64 data.' });
    }
    if (!buf.length || buf.length > MAX_BYTES) {
      return reply.code(400).send({ error: `File must be 1 byte–${MAX_BYTES} bytes (5MB max).` });
    }
    const safe = sanitizeFilename(filename);
    const ext = path.extname(safe).toLowerCase();
    const wantExt = EXT_BY_TYPE[contentType];
    const finalName = ext ? safe : `${safe}${wantExt}`;
    const key = `${randomUUID()}-${finalName}`;
    const userDir = path.join(uploadsDir(), req.user.id);
    await mkdir(userDir, { recursive: true });
    const dest = path.join(userDir, key);
    // Containment: resolved dest must stay under uploads dir.
    if (!dest.startsWith(uploadsDir() + path.sep)) {
      return reply.code(400).send({ error: 'Invalid filename.' });
    }
    await writeFile(dest, buf);
    return reply.code(201).send({ url: `/uploads/${req.user.id}/${key}` });
  });

  // ── GET /uploads/* — static serve with containment check ────────
  app.get('/uploads/*', async (req, reply) => {
    const rel = (req.params['*'] ?? '').split('/').filter(Boolean);
    if (rel.length !== 2) return reply.code(404).send({ error: 'Not found.' });
    const [userId, file] = rel.map(sanitizeFilename);
    if (file !== rel[1] || userId !== rel[0]) {
      return reply.code(400).send({ error: 'Invalid path.' });
    }
    const abs = path.join(uploadsDir(), userId, file);
    const root = uploadsDir() + path.sep;
    if (!abs.startsWith(root)) return reply.code(400).send({ error: 'Invalid path.' });
    try {
      const data = await readFile(abs);
      const ext = path.extname(file).toLowerCase();
      return reply.header('Content-Type', MIME_BY_EXT[ext] ?? 'application/octet-stream').send(data);
    } catch {
      return reply.code(404).send({ error: 'Not found.' });
    }
  });
}

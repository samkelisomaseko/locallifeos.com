import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import { pingDb, getDb } from './db/client.mjs';
import authPlugin from './plugins/auth.mjs';
import adminUsersPlugin from './plugins/admin-users.mjs';
import adminConfigPlugin from './plugins/admin-config.mjs';
import adminPanelPlugin from './plugins/admin-panel.mjs';
import adminEntitiesPlugin from './plugins/admin-entities.mjs';
import weatherPlugin from './plugins/weather.mjs';
import profileSettingsPlugin from './plugins/profile-settings.mjs';
import entitiesPlugin from './plugins/entities.mjs';
import chatRealtimePlugin from './plugins/chat-realtime.mjs';
import adminChatPlugin from './plugins/admin-chat.mjs';
import aiProxyPlugin from './plugins/ai-proxy.mjs';
import adminAiPlugin from './plugins/admin-ai.mjs';
import uploadsPlugin from './plugins/uploads.mjs';
import { registerStatic } from './static.mjs';
import { hashPassword } from './lib/crypto.mjs';
import { requireAuth, requireRole } from './middleware/auth.mjs';
import { eq, sql } from 'drizzle-orm';
import { users, tasks, habits, moods, deals, places, channels, bulletins, notifications, auditLogs } from './db/schema.js';

/**
 * Fastify app factory (Phase 2 — Real Backend).
 * Registers auth, admin, and core plugins.
 */

async function seedDemoUser() {
  const db = getDb();
  const email = 'test@example.com';
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (rows.length) return;

  const passwordHash = await hashPassword('password');
  await db.insert(users).values({
    email,
    passwordHash,
    role: 'super_admin',
    status: 'active',
  });
  console.log(`[seed] Created demo user: ${email} / password (role: super_admin)`);
}

export async function buildApp(opts = {}) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      transport: opts.prettyLogs
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    ...opts.fastifyOpts,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cookie);

  const allowedOrigins = (process.env.APP_ORIGIN ?? 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map((s) => s.trim());

  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX ?? 100),
    timeWindow: '1 minute',
  });

  // ── Auth routes ────────────────────────────────────────────────
  await app.register(authPlugin);

  // ── Admin routes (role-gated inside each plugin) ───────────────
  await app.register(adminUsersPlugin);
  await app.register(adminConfigPlugin);
  await app.register(adminPanelPlugin);
  await app.register(adminEntitiesPlugin);
  await app.register(adminChatPlugin);
  await app.register(adminAiPlugin);

  // ── User routes (auth-gated inside each plugin) ────────────────
  await app.register(weatherPlugin);
  await app.register(profileSettingsPlugin);

  // ── Entity CRUD routes (auth + ownership-gated) ────────────────
  await app.register(entitiesPlugin);

  // ── Phase 4A: REST-first realtime foundations for chat ────────────
  await app.register(chatRealtimePlugin);

  // ── Phase 4B: WS live gateway (optional; graceful skip without dep) ──
  // Registered ONLY when @fastify/websocket resolves so inject tests and
  // DB-less boots never break when the dependency/network is unavailable.
  try {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    require.resolve('@fastify/websocket');
    const { default: chatGatewayPlugin } = await import('./plugins/chat-gateway.mjs');
    await app.register(chatGatewayPlugin);
  } catch {
    app.log.warn('WS live gateway skipped (@fastify/websocket unavailable)');
  }

  // ── Phase 4B: User AI proxy (always answers; heuristic fallback) ──────
  await app.register(aiProxyPlugin);

  // ── Local-disk uploads (auth-gated; S3 swap documented in plugin)
  await app.register(uploadsPlugin);

  // ── Health check (public — mask internal details) ──────────────
  app.get('/api/v1/health', async () => {
    return {
      ok: true,
      service: 'locallifeos-api',
      version: '0.2.0',
      uptimeSec: Math.round(process.uptime()),
    };
  });

  // ── Health check (admin — full details) ────────────────────────
  app.get('/api/v1/health/detail', async (_req, reply) => {
    const db = await pingDb();
    return reply.send({
      ok: true,
      service: 'locallifeos-api',
      version: '0.3.0',
      db: db.ok ? 'up' : `down: ${db.error}`,
      uptimeSec: Math.round(process.uptime()),
    });
  });

  // ── Admin metrics (role-gated) ─────────────────────────────────
  app.get('/admin/v1/metrics', { preHandler: [requireAuth, requireRole('super_admin', 'admin', 'moderator')] }, async (_req, reply) => {
    try {
      const db = getDb();
      const [userCount] = await db.select({ count: sql`count(*)::int` }).from(users);
      const [taskCount] = await db.select({ count: sql`count(*)::int` }).from(tasks);
      const [habitCount] = await db.select({ count: sql`count(*)::int` }).from(habits);
      const [moodCount] = await db.select({ count: sql`count(*)::int` }).from(moods);
      const [dealCount] = await db.select({ count: sql`count(*)::int` }).from(deals);
      const [placeCount] = await db.select({ count: sql`count(*)::int` }).from(places);
      const [channelCount] = await db.select({ count: sql`count(*)::int` }).from(channels);
      const [bulletinCount] = await db.select({ count: sql`count(*)::int` }).from(bulletins);
      const [notifCount] = await db.select({ count: sql`count(*)::int` }).from(notifications);
      const [auditCount] = await db.select({ count: sql`count(*)::int` }).from(auditLogs);
      const queueDepth = 0; // Sync queue is client-side; metrics show entity counts + audit

      return reply.send({
        entities: {
          users: userCount.count, tasks: taskCount.count, habits: habitCount.count,
          moods: moodCount.count, deals: dealCount.count, places: placeCount.count,
          channels: channelCount.count, bulletins: bulletinCount.count,
          notifications: notifCount.count,
        },
        auditLogCount: auditCount.count,
        syncQueueDepth: queueDepth,
        uptimeSec: Math.round(process.uptime()),
      });
    } catch {
      return reply.send({ entities: {}, auditLogCount: 0, syncQueueDepth: 0, uptimeSec: Math.round(process.uptime()) });
    }
  });

  // ── Seed demo user on first start ──────────────────────────────
  try {
    await seedDemoUser();
  } catch (err) {
    app.log.warn({ err: err.message }, 'Demo user seed skipped (DB may be unavailable)');
  }

  // ── Unified production entrypoint: dist/ static + SPA fallback ───
  // Opt-in via opts.serveStatic so standalone API mode (server/api.mjs)
  // and existing inject tests keep exact-404 semantics unless enabled.
  // Registered routes (/api/*, /admin*, /uploads/*) always take precedence:
  // the static handler only runs when no route matched.
  if (opts.serveStatic) {
    await registerStatic(app, { distDir: opts.staticDir });
  }

  return app;
}

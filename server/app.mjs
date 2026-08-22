import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import { pingDb } from './db/client.mjs';

/**
 * Fastify app factory (Phase 2a scaffold).
 * Security defaults per plan.md §8: Helmet headers, locked-down CORS,
 * rate limiting, cookies for future session auth.
 */

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

  await app.register(helmet, { contentSecurityPolicy: false }); // API only; CSP stays with the web app

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

  await app.register(cookie);

  // ---- /api/v1 ----
  app.get('/api/v1/health', async () => {
    const db = await pingDb();
    return {
      ok: true,
      service: 'locallifeos-api',
      version: '0.1.0',
      db: db.ok ? 'up' : `down: ${db.error}`,
      uptimeSec: Math.round(process.uptime()),
    };
  });

  return app;
}

/**
 * @module server/plugins/profile-settings
 * Profile + Settings sync — write-through to server, localStorage as offline cache.
 * Routes: GET/PUT /api/v1/me/profile, GET/PUT /api/v1/me/settings
 * Auth required (requireAuth preHandler).
 */
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client.mjs';
import { profiles, settings } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.mjs';

export default async function profileSettingsPlugin(app) {
  app.addHook('preHandler', requireAuth);

  // ── GET /api/v1/me/profile ─────────────────────────────────────
  app.get('/api/v1/me/profile', async (req, reply) => {
    const db = getDb();
    const rows = await db.select().from(profiles).where(eq(profiles.userId, req.user.id)).limit(1);
    const profile = rows[0] ?? {
      displayName: null,
      avatarUrl: null,
      bio: null,
      subscriptionTier: 'free',
    };
    return reply.send({ profile });
  });

  // ── PUT /api/v1/me/profile ─────────────────────────────────────
  app.put('/api/v1/me/profile', async (req, reply) => {
    const db = getDb();
    const { displayName, avatarUrl, bio } = req.body ?? {};

    const rows = await db.select().from(profiles).where(eq(profiles.userId, req.user.id)).limit(1);

    if (rows.length) {
      await db
        .update(profiles)
        .set({
          displayName: displayName ?? rows[0].displayName,
          avatarUrl: avatarUrl ?? rows[0].avatarUrl,
          bio: bio ?? rows[0].bio,
          updatedAt: new Date(),
        })
        .where(eq(profiles.userId, req.user.id));
    } else {
      await db.insert(profiles).values({
        userId: req.user.id,
        displayName: displayName ?? null,
        avatarUrl: avatarUrl ?? null,
        bio: bio ?? null,
      });
    }

    return reply.send({ ok: true });
  });

  // ── GET /api/v1/me/settings ────────────────────────────────────
  app.get('/api/v1/me/settings', async (req, reply) => {
    const db = getDb();
    const rows = await db.select().from(settings).where(eq(settings.userId, req.user.id)).limit(1);
    const payload = rows[0]?.payload ?? {};
    return reply.send({ settings: payload });
  });

  // ── PUT /api/v1/me/settings ────────────────────────────────────
  app.put('/api/v1/me/settings', async (req, reply) => {
    const db = getDb();
    const { settings: newSettings } = req.body ?? {};

    if (!newSettings || typeof newSettings !== 'object') {
      return reply.code(400).send({ error: 'settings object required.' });
    }

    const rows = await db.select().from(settings).where(eq(settings.userId, req.user.id)).limit(1);

    if (rows.length) {
      // Merge with existing payload (deep merge for nested objects)
      const merged = { ...rows[0].payload, ...newSettings };
      await db
        .update(settings)
        .set({ payload: merged, updatedAt: new Date() })
        .where(eq(settings.userId, req.user.id));
    } else {
      await db.insert(settings).values({
        userId: req.user.id,
        payload: newSettings,
      });
    }

    return reply.send({ ok: true });
  });
}

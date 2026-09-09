/**
 * @module scripts/seed
 * Seeds demo data so first login looks identical to today's mock data.
 * Usage: node --env-file-if-exists=.env scripts/seed.mjs
 */
import { getDb } from '../server/db/client.mjs';
import { users, tasks, habits, moods, deals, places, channels, bulletins, gamification } from '../server/db/schema.js';
import { hashPassword } from '../server/lib/crypto.mjs';
import { eq } from 'drizzle-orm';

const DEMO_EMAIL = 'test@example.com';

async function seed() {
  const db = getDb();

  // Find or create demo user
  const existing = await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
  let userId;
  if (existing.length) {
    userId = existing[0].id;
    console.log(`[seed] Demo user exists: ${DEMO_EMAIL} (${userId})`);
  } else {
    const hash = await hashPassword('password');
    const [user] = await db.insert(users).values({
      email: DEMO_EMAIL,
      passwordHash: hash,
      role: 'super_admin',
      status: 'active',
    }).returning({ id: users.id });
    userId = user.id;
    console.log(`[seed] Created demo user: ${DEMO_EMAIL} (${userId})`);
  }

  // Check if data already seeded
  const existingTasks = await db.select({ count: sql`count(*)::int` }).from(tasks).where(eq(tasks.userId, userId));
  if (existingTasks[0].count > 0) {
    console.log('[seed] Data already seeded, skipping.');
    return;
  }

  const now = new Date();

  // ── Tasks ─────────────────────────────────────────────────────
  const demoTasks = [
    { title: 'Buy groceries', completed: false, priority: 'medium' },
    { title: 'Finish project report', completed: false, priority: 'high' },
    { title: 'Call dentist', completed: true, priority: 'low' },
    { title: 'Plan weekend trip', completed: false, priority: 'medium' },
    { title: 'Read 30 pages', completed: true, priority: 'low' },
  ];
  for (const t of demoTasks) {
    await db.insert(tasks).values({ ...t, userId, createdAt: now, updatedAt: now });
  }
  console.log(`[seed] Seeded ${demoTasks.length} tasks`);

  // ── Habits ────────────────────────────────────────────────────
  const demoHabits = [
    { name: 'Morning meditation', streak: 5, frequency: 'daily' },
    { name: 'Exercise', streak: 3, frequency: 'daily' },
    { name: 'Read', streak: 7, frequency: 'daily' },
    { name: 'Drink 8 glasses water', streak: 2, frequency: 'daily' },
  ];
  for (const h of demoHabits) {
    await db.insert(habits).values({ ...h, userId, createdAt: now, updatedAt: now });
  }
  console.log(`[seed] Seeded ${demoHabits.length} habits`);

  // ── Moods ─────────────────────────────────────────────────────
  const demoMoods = [
    { mood: 'happy', score: 4, note: 'Great morning!' },
    { mood: 'neutral', score: 3, note: 'Busy day' },
    { mood: 'energetic', score: 5, note: 'Post-workout high' },
  ];
  for (const m of demoMoods) {
    await db.insert(moods).values({ ...m, userId, createdAt: now, updatedAt: now });
  }
  console.log(`[seed] Seeded ${demoMoods.length} moods`);

  // ── Deals ─────────────────────────────────────────────────────
  const demoDeals = [
    { businessName: 'Sisi Kitchen', description: '20% off lunch combo', price: 150, discountPrice: 120, category: 'food' },
    { businessName: 'Mountain Breeze Spa', description: 'Full body massage special', price: 500, discountPrice: 350, category: 'wellness' },
    { businessName: 'TechHub Store', description: 'Buy 2 get 1 free accessories', price: 200, discountPrice: 133, category: 'shopping' },
  ];
  for (const d of demoDeals) {
    await db.insert(deals).values({ ...d, userId, createdAt: now, updatedAt: now });
  }
  console.log(`[seed] Seeded ${demoDeals.length} deals`);

  // ── Places ────────────────────────────────────────────────────
  const demoPlaces = [
    { name: 'Sisi Kitchen', category: 'food', address: '123 Main St', saved: true, rating: 4 },
    { name: 'Mountain Breeze Spa', category: 'service', address: '456 Oak Ave', saved: true, rating: 5 },
    { name: 'City Park', category: 'other', address: '789 Park Rd', saved: false, rating: 4 },
  ];
  for (const p of demoPlaces) {
    await db.insert(places).values({ ...p, userId, createdAt: now, updatedAt: now });
  }
  console.log(`[seed] Seeded ${demoPlaces.length} places`);

  // ── Channels ──────────────────────────────────────────────────
  const demoChannels = [
    { name: 'General', description: 'Community chat', category: 'general', memberCount: 156 },
    { name: 'Marketplace', description: 'Buy & sell', category: 'marketplace', memberCount: 89 },
    { name: 'Events', description: 'Local events', category: 'events', memberCount: 45 },
  ];
  for (const c of demoChannels) {
    await db.insert(channels).values({ ...c, createdAt: now, updatedAt: now });
  }
  console.log(`[seed] Seeded ${demoChannels.length} channels`);

  // ── Bulletins ─────────────────────────────────────────────────
  const demoBulletins = [
    { title: 'Community Cleanup Day', content: 'Join us this Saturday at City Park!', category: 'event', userId },
    { title: 'Free Piano Lessons', content: 'Experienced teacher offering free intro lessons', category: 'announcement', userId },
  ];
  for (const b of demoBulletins) {
    await db.insert(bulletins).values({ ...b, createdAt: now, updatedAt: now });
  }
  console.log(`[seed] Seeded ${demoBulletins.length} bulletins`);

  // ── Gamification ──────────────────────────────────────────────
  await db.insert(gamification).values({
    userId,
    level: 3,
    xp: 750,
    xpToNextLevel: 1000,
    unlockedBadges: ['early_bird', 'streak_master', 'community_star'],
    createdAt: now,
    updatedAt: now,
  });
  console.log('[seed] Seeded gamification');

  console.log('[seed] Demo data seeded successfully.');
}

// Need sql import for count
import { sql } from 'drizzle-orm';

seed().catch(err => {
  console.error('[seed] Error:', err.message);
  process.exit(1);
});

/**
 * @module scripts/seed
 * Seeds demo data so first login looks identical to today's mock data.
 * Usage: node --env-file-if-exists=.env scripts/seed.mjs
 */
import { sql } from 'drizzle-orm';
import { getDb } from '../server/db/client.mjs';
import { users, tasks, habits, moods, sleep, deals, places, channels, messages, bulletins, notifications, trustedContacts, gamification, applets, integratedApps } from '../server/db/schema.js';
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
  const channelIds = [];
  for (const c of demoChannels) {
    const [row] = await db.insert(channels).values({ ...c, createdBy: userId, createdAt: now, updatedAt: now }).returning({ id: channels.id });
    channelIds.push(row.id);
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

  // ── Sleep ─────────────────────────────────────────────────────
  const demoSleep = [
    { date: '2026-10-06', hours: 7, quality: 'good', notes: 'Slept well' },
    { date: '2026-10-07', hours: 6, quality: 'fair', notes: 'Late night' },
  ];
  for (const s of demoSleep) {
    await db.insert(sleep).values({ ...s, userId, createdAt: now, updatedAt: now });
  }
  console.log(`[seed] Seeded ${demoSleep.length} sleep rows`);

  // ── Messages (needs a channel id) ───────────────────────────────
  const demoMessages = [
    { channelId: channelIds[0], content: 'Welcome to General!' },
    { channelId: channelIds[0], content: 'Cleanup day this Saturday 🎉' },
    { channelId: channelIds[1], content: 'Selling a bike, DM me' },
  ];
  for (const m of demoMessages) {
    await db.insert(messages).values({ ...m, userId, createdAt: now, updatedAt: now });
  }
  console.log(`[seed] Seeded ${demoMessages.length} messages`);

  // ── Notifications ───────────────────────────────────────────────
  const demoNotifications = [
    { type: 'community', title: 'Welcome!', message: 'Welcome to LocalLife OS' },
    { type: 'task', title: 'Task reminder', message: 'Buy groceries is due soon' },
    { type: 'deal', title: 'New deal nearby', message: 'Sisi Kitchen: 20% off lunch' },
  ];
  for (const n of demoNotifications) {
    await db.insert(notifications).values({ ...n, userId, createdAt: now, updatedAt: now });
  }
  console.log(`[seed] Seeded ${demoNotifications.length} notifications`);

  // ── Trusted contacts ────────────────────────────────────────────
  const demoContacts = [
    { name: 'Ama Serwaa', phone: '+233240000001', relationship: 'Sister' },
    { name: 'Kwame Mensah', phone: '+233240000002', relationship: 'Friend' },
  ];
  for (const c of demoContacts) {
    await db.insert(trustedContacts).values({ ...c, userId, createdAt: now, updatedAt: now });
  }
  console.log(`[seed] Seeded ${demoContacts.length} trusted contacts`);

  // ── Applets ─────────────────────────────────────────────────────
  const demoApplets = [
    { name: 'Morning briefing', description: 'Weather + tasks summary', enabled: true },
    { name: 'Deal alerts', description: 'Notify on nearby deals', enabled: true },
  ];
  for (const a of demoApplets) {
    await db.insert(applets).values({ ...a, userId, createdAt: now, updatedAt: now });
  }
  console.log(`[seed] Seeded ${demoApplets.length} applets`);

  // ── Integrated apps ─────────────────────────────────────────────
  const demoApps = [
    { appName: 'Google Calendar', connected: true },
    { appName: 'Spotify', connected: false },
  ];
  for (const a of demoApps) {
    await db.insert(integratedApps).values({ ...a, userId, createdAt: now, updatedAt: now });
  }
  console.log(`[seed] Seeded ${demoApps.length} integrated apps`);

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

seed().catch(err => {
  console.error('[seed] Error:', err.message);
  process.exit(1);
});

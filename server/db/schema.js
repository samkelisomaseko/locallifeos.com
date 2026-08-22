import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  jsonb,
  timestamp,
  bigserial,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * LocalLife OS — core + system tables (Phase 2a).
 * Every user-facing table ships with admin CRUD + audit logging (Dual-Track, plan.md §0).
 * Schema changes ONLY via `drizzle generate` + `drizzle migrate` — never push.
 */

export const userRole = pgEnum('user_role', ['user', 'moderator', 'admin', 'super_admin']);
export const userStatus = pgEnum('user_status', ['active', 'suspended', 'deleted']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: userRole('role').notNull().default('user'),
    status: userStatus('status').notNull().default('active'),
    suspendedReason: text('suspended_reason'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_email_unique').on(t.email)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Only the SHA-256 of the opaque session token is stored — never the raw token.
    tokenHash: text('token_hash').notNull(),
    userAgent: text('user_agent'),
    ip: text('ip'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('sessions_token_hash_unique').on(t.tokenHash),
    index('sessions_user_id_idx').on(t.userId),
  ],
);

export const profiles = pgTable('profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  subscriptionTier: text('subscription_tier').notNull().default('free'), // free | pro | pro_plus
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable('settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Theme accent, darkMode, notification/dashboard prefs, AI personality — mirrors
  // the app's existing localStorage settings bag so the client can write through.
  payload: jsonb('payload').notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(), // e.g. 'user.suspend', 'flag.update'
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    before: jsonb('before'),
    after: jsonb('after'),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_logs_entity_idx').on(t.entityType, t.entityId),
    index('audit_logs_actor_idx').on(t.actorId),
  ],
);

export const featureFlags = pgTable('feature_flags', {
  key: text('key').primaryKey(),
  enabled: boolean('enabled').notNull().default(false),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const appConfig = pgTable('app_config', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull().default({}),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

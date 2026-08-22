import { defineConfig } from 'drizzle-kit';

// Reads DATABASE_URL from the environment (npm scripts run with --env-file-if-exists=.env).
// Workflow per AGENTS.md: `npm run db:generate` then `npm run db:migrate` — NEVER push.
export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.js',
  out: './server/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
});

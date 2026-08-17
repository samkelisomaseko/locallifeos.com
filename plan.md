# LocalLife OS — Production-Readiness Master Plan

> **Last updated:** 2026-08-17
> **Owner:** Shamase
> **Guiding rule (non-negotiable):** *Keep 100% of the current UI & UX.* Every refactor preserves the exact screens, components, DOM ids/classes, animations, colors, and interactions already in the app. We restructure **underneath** the UI, never redesign it. Any visual change requires explicit user approval.

---

## 0. Dual-Track Architecture (MANDATORY — applies to every feature, always)

> **Directive from the owner:** *Never build a backend feature, API endpoint, or data model without simultaneously building its corresponding Admin Dashboard interface and management controls.*

This is a hard rule of this project, on par with "keep 100% of the UI/UX." Every build step ships **two** deliverable tracks for the same feature:

1. **User Track** — the public-facing data model, API, and UI the community uses.
2. **Admin Track** — the administrative layer to inspect, control, and manage that same thing.

### 1.1 Mandatory Architecture Rules
- **Zero code-only administration** — every entity, configuration, status, or flag created in the database MUST be viewable, editable, and controllable from the Admin Panel.
- **Unified data model & full CRUD** — for every user-facing data structure, the Admin Panel implements complete CRUD (Create, Read, Update, Delete).
- **Direct action coupling** — whenever an endpoint or UI feature is generated, the administrative component for it is generated **in the same build step**. No isolated features, ever.

### 1.2 Required Admin System Capabilities (for every subsystem)
- **System & User Control** — inspect, modify, suspend, override, or soft-delete users and operational state directly from the interface.
- **Operational Config & Feature Flags** — system variables, environment controls, rate limits, and feature toggles exposed as interactive switches/inputs in the admin view.
- **Audit & Event Logging** — every admin action is logged automatically (who changed what, when, previous/new state).
- **Metrics & Health Monitoring** — key metrics, real-time status indicators, and operational telemetry inside the admin view.

### 1.3 Standard Execution Workflow (follow for every feature request)
1. Define the Data Schema / Model.
2. Build the User-Facing Backend Logic & APIs.
3. Build the User-Facing Frontend / UI.
4. Build the Admin API Endpoints (with RBAC / admin-only authorization).
5. Build the Admin Interface UI components to monitor, update, and manage that feature.
6. Provide verification steps testing **both** the user view and the admin control.

**Consequence:** any feature, ticket, or PR that ships a user-facing or backend capability **without** its admin interface is considered incomplete and blocked by the Reviewer gate.

---

## 1. Why This Plan Exists

The app today is a single, hand-authored file (`index.html`, ~750 KB / ~12,000 lines) that already contains a rich, polished UX:

- **Screens:** Dashboard, Planner, Explore (Google Maps), Community (channels/chat/bulletins), Wellness (mood/habits/sleep/breathing/focus), Settings, plus many modals (place detail, deals, journal, emergency, notifications, calendar, lock screen, calls, receipts).
- **Mobile-first phone frame** (max-width 450px) with a **desktop sidebar** (the bottom nav transforms into a left-side sidebar at ≥1024px — *recently fixed to sit on the left*).
- **AI assistant** (rule/heuristic engine, memory, personality, suggestions), **gamification** (XP/levels/badges), **subscription tiers**, **applets store**, **integrated apps**, offline indicators, app lock/PIN, SOS/emergency tools.

But it is **not production-ready**:

1. **No real backend** — all data is mock arrays persisted to `localStorage` (and some IndexedDB stores), not shared, not safe.
2. **Fake auth** — hardcoded `test@example.com` / `password`; login state is a localStorage flag anyone can flip.
3. **Hardcoded secrets in the client** — Google Maps API key (script tag) and OpenWeather API key are baked into HTML/JS that ships to every visitor.
4. **One giant file** — impossible to test, review, or scale; no build, lint, type checks, or tests.
5. **No service-worker/PWA shell**, no push, no observability, no backups, no deployment pipeline.

This plan takes the app **little by little** to production without touching what the user sees.

---

## 2. Constraints & Non-Negotiables

| # | Constraint | How we honor it |
|---|-----------|-----------------|
| 1 | **Keep 100% of UI/UX** | All DOM ids/classes stay. All CSS variables/tokens stay. All animations/micro-interactions stay. No redesigns. |
| 2 | **Pixel-fidelity lock** | Screenshot baselines taken in Phase 0; every phase re-verifies visually (desktop + mobile). |
| 3 | **No secrets in client code** | Every third-party key moves behind a server-side proxy immediately (Phase 0). |
| 4 | **Incremental, shippable phases** | Each phase is independently valuable and merges without breaking the app. |
| 5 | **Same tech feel** | Vanilla JS + CSS stays (no framework rewrite). We add a build step and modules, not React/Vue. |
| 6 | **AGENTS.md compliance** | Drizzle for DB schema changes (`generate` + `migrate`, never `push`); quality gates enforced per phase. |
| 7 | **Dual-Track (admin parity)** | No feature ships without its Admin Dashboard management UI (CRUD, config, audit, metrics). See §0. |

---

## 3. Target Architecture (end state)

```
┌─────────────────────────────────────────────────────────────┐
│  USER BROWSER ── PWA (Vite + vanilla JS modules)            │
│   · Screens, components, maps, AI sheet (UI unchanged)      │
│   · Local-first store (IndexedDB cache + offline queue)     │
│   · Service worker (offline shell + push)                   │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTPS REST + WebSocket
┌──────────────▼──────────────────────────────────────────────┐
│  API SERVER  (Node.js + Fastify)                            │
│   · Auth (Argon2 sessions, refresh tokens, OAuth later)     │
│   · Domain modules: users, tasks, habits, mood, sleep,      │
│     places, deals, channels, messages, bulletins, applets,  │
│     subscriptions, gamification, notifications              │
│   · AI proxy (LLM provider server-side; heuristic fallback) │
│   · Rate limiting, validation, CSRF, security headers       │
└───┬──────────────┬──────────────────┬───────────────────┬───┘
    │              │                  │                   │
┌───▼──────┐ ┌─────▼──────┐  ┌────────▼────────┐  ┌──────▼───────┐
│ PostgreSQL│ │  Redis     │  │ Object storage  │  │ ADMIN PANEL │
│ (Drizzle  │ │ (sockets/  │  │ (S3: uploads,   │  │ (web app,   │
│  ORM)     │ │  queues)   │  │  images, avatars)│  │  RBAC)      │
└──────────┘ └────────────┘  └─────────────────┘  └──────────────┘
    │                                                    │
    │   Every table/resource is ALSO managed here        │
    │   (CRUD, config/flags, audit log, metrics)         │
    │
┌───▼──────────────────────────────────────────────────────────┐
│  OBSERVABILITY: OpenTelemetry, Sentry, structured logs,       │
│  uptime + error budgets · CI/CD (GitHub Actions) · backups    │
└───────────────────────────────────────────────────────────────┘
```

**Dual-Track:** every domain module in the API server exposes **two** route sets — public (user-facing, auth + ownership) and admin (RBAC admin-only, full CRUD + config). The **Admin Panel** consumes the admin routes and is the single management surface for all entities, feature flags, audit logs, and health/metrics.

**Why no UI framework (user app):** the UI is already built and loved. Introducing React would rebuild the interface — the exact thing we must not do. A build tool (Vite) + ES modules + the existing DOM gives us scalability, tree-shaking, type safety (JSDoc/TS over the core), and testing — all without a visual redesign.

**Admin Panel framework (free choice):** the admin surface is internal tooling with **no user-facing UI constraints**, so we can build it with the best tool for the job (e.g., React + a component library, or lightweight Vue/Svelte) — it never touches the public PWA.

---

## 4. Tech Stack Decision

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend build | **Vite + vanilla JS ES modules** | Zero UI change, fast HMR, code splitting, existing CSS custom properties work as-is. |
| Frontend typing | **JSDoc → TypeScript (gradual)** | Types on the core/data layer without rewriting the UI in TS. |
| API server | **Node.js + Fastify** | High perf, schema validation (JSON Schema), plugin architecture, good WS story. |
| Database | **PostgreSQL + Drizzle ORM** | AGENTS.md mandates Drizzle workflow; relational fits community/deals/chat; rock-solid. |
| Real-time | **WebSocket** (native `ws` or Socket.io behind Fastify) | Live community chat, presence, typing, notifications. |
| Auth | **Custom, session-based** (Argon2id + HttpOnly cookies) with optional **Supabase/Auth.js** shortcut | No vendor lock; we can start fast with Supabase Auth if preferred. |
| Cache/queues | **Redis** | Pub/Sub for multi-instance WS, rate-limit counters, job queues. |
| Storage | **S3-compatible object storage** | Avatars, deal/place images, file attachments (already upload in UI). |
| AI | **Vercel AI SDK** (server-side) with existing heuristic engine as **offline/degraded fallback** | Real LLM replies now; AI memory/personality persisted server-side. |
| **Admin Panel** | **React (or lightweight Vue/Svelte) + component lib**, served on a separate admin route/domain | Internal tooling; zero impact on the public PWA; RBAC-guarded. |
| **Admin APIs** | **Admin-only route prefix** (`/admin/v1/*`) with role middleware (super_admin / admin / moderator) | Every entity gets full admin CRUD + config endpoints, audit-logged. |
| Audit & flags | **`audit_logs` table + `feature_flags`/`app_config` tables** auto-created with every schema change | Every admin action and toggle is recorded and reversible. |
| Maps/Weather | **Server-side proxy** (keys never reach the client) | Same maps UX; keys kept in env only. |
| Deploy | **Docker + GitHub Actions CI/CD** | Reproducible envs, preview deploys, rollback. |
| Observability | **OpenTelemetry + Sentry + Pino logs** | Trace IDs per AGENTS.md, error budgets. |

> **Fast-track option:** if speed > custom control, use **Supabase** (Auth + Postgres + Realtime + Storage) and keep only the API/AI proxy on Fastify. The phase plan below supports both; we pick one at the start of Phase 2 with your approval.

---

## 5. Data Model (first-class entities)

Derived directly from the localStorage keys already in the app — **no new concepts, no UI changes**:

- `users`, `userProfile`, `userSubscriptionTier`
- `localLifeTasks`, `localLifeHabits`, `localLifeMoods`, `localLifeSleepData`
- `localLifePlaces`, `localLifeDeals`, `localLifeChannels`, `localLifeBulletinPosts`
- `localLifeNotifications`, `localLifeTrustedContacts`
- `localLifeGamification` (XP/level/badges), `localLifeApplets`, `localLifeIntegratedApps`
- `dashboardCardConfig`, `notificationPreferences`, `aiLearningPreferences`, `themeAccent`, `darkMode`, `aiPersonality`
- IndexedDB stores: `focusSessions`, `meditations`, `goals`, `nutritionLogs`, `posts`, `channels`, `AIMemory`

Each maps to a **DB table** and a **REST resource** in Phase 3. A seed script replicates current demo data so the app looks identical after migration.

**Dual-Track:** for **every** table above, the admin layer provides full CRUD, user overrides/suspension, feature toggles, and audit logging — no exceptions. System-wide configuration lives in `feature_flags`/`app_config` tables editable only from the Admin Panel (never code-only).

---

## 6. Phased Roadmap

Each phase has a **Goal**, **Tasks**, **Acceptance Criteria**, and exits to the next phase. All gates from AGENTS.md (lint, typecheck, tests, build, security scan) run every phase.

---

### Phase 0 — Foundation, Safety & Baseline (now → next few days)

**Goal:** Stop the bleeding; lock the UI; make the repo buildable.

**Tasks**
1. ✅ **Sidebar fix** — desktop nav now renders on the **left** (CSS only: flipped flex `order`, `border-right`, FAB position). *(Done.)*
2. ✅ `git init` + `.gitignore` (never commit `*.env`), initial commit of the current app. *(Done.)*
3. ✅ `package.json` + **Vite** with the existing `index.html` as entry. **Zero visual changes** — build output renders identically. *(Done.)*
4. ✅ **Move hardcoded keys to env** — OpenWeather key now **server-side only** via `/api/weather` proxy (Vite dev middleware + `server/serve.mjs`); Google Maps key via `VITE_GOOGLE_MAPS_API_KEY` (referrer-restricted client key, injected at build time). *(Done.)*
5. ✅ **Screenshot baselines** (Playwright): 14 screenshots (login + 6 app screens × desktop/mobile) in `tests/baselines/`. These are the pixel-lock for every future phase. *(Done.)*
6. ✅ Basic lint + `tsc` (ESLint + `tsc --noEmit`) wired to npm scripts. *(Done.)*
7. ✅ **README** + `dev`/`build`/`test`/`lint` commands. *(Done.)*

**Acceptance criteria**
- ✅ `npm run build && npm run serve` runs the exact same UI (verified by baseline screenshots).
- ✅ No API keys remain in any committed client file.
- ✅ `npm run lint`, `npm run typecheck`, and `npm run test` all pass.

---

### Phase 1 — Modular Frontend (no visual change)

**Goal:** Break the 12k-line file into maintainable modules while rendering pixel-identically.

**Tasks**
1. Extract CSS into `src/styles/*.css` (tokens, base, screens, components) using the existing `:root` variables.
2. Extract JS into `src/modules/`:
   - `core/` (utils, DOM helpers, toasts, modals, context menus, offline detection)
   - `storage/` (localStorage + IndexedDB abstraction with a single `Store` interface)
   - `screens/` (`dashboard`, `planner`, `explore`, `community`, `wellness`, `settings`)
   - `features/` (`tasks`, `habits`, `mood`, `sleep`, `deals`, `places`, `chat`, `bulletins`, `gamification`, `subscriptions`, `applets`)
   - `maps/`, `weather/`, `ai/` (heuristic engine extracted as-is)
   - `native/` (speech, TTS, notifications, file picker, share)
3. Preserve **every** `id`, `class`, and inline handler reference. Use the DOM ids as the contract between modules.
4. Add **JSDoc types** to module boundaries only (not the whole legacy file at once).
5. Add **unit tests** for pure logic: task/XP calculations, mood trends, deal expiry, AI reply builder, offline queue.
6. Add a smoke **e2e test**: login demo → each screen renders → key actions work.

**Acceptance criteria**
- Screenshot diff vs Phase 0 baseline = **0 visual changes**.
- All existing features work end-to-end in tests.
- Every module imports cleanly; bundle splits; no `window` globals leaking.

---

### Phase 2 — Real Backend & Real Auth

**Goal:** Stand up the server, database, and genuine authentication. This is where "fake" becomes "real".

**Tasks (User Track)**
1. Scaffold **Fastify** API (`/api/v1`) in `server/` with Pino logging, CORS (locked), Helmet, rate limiting.
2. Set up **PostgreSQL** + **Drizzle** schema. First tables: `users`, `sessions`, `profiles`, `settings`, **plus system tables** `audit_logs`, `feature_flags`, `app_config`. Use `drizzle generate` → `drizzle migrate` (**never push**).
3. **Auth:** email+password signup/login with **Argon2id** hashing, HttpOnly session cookies, refresh rotation, logout everywhere, password reset (email later, dev token now). Keep the demo account as a seeded, real user with `test@example.com` credentials so the existing UI flow works.
4. Migrate auth + profile + settings + theme from localStorage to server; keep localStorage as offline cache (write-through).
5. Add **server-side proxies** for Maps + OpenWeather (moved to prod in Phase 0, hardened here).

**Tasks (Admin Track — Dual-Track, same build step)**
6. Scaffold the **Admin Panel** (React app on `/admin`) with RBAC roles (`super_admin`, `admin`, `moderator`), session-guarded, audited.
7. **Admin Users module:** list/inspect users, edit profile, suspend/unsuspend, reset password, soft-delete, override subscription tier — all with before/after state written to `audit_logs`.
8. **Admin Config module:** `feature_flags` + `app_config` (theme defaults, rate limits, AI personality default) as toggle/input UI.
9. Admin routes under `/admin/v1/*` with role middleware; every admin call is audit-logged.

**Acceptance criteria**
- Real signup/login/logout; password stored hashed; sessions survive refresh.
- Logging in as the seeded demo user shows the exact same dashboard as today.
- No auth or profile state lives only in the browser.
- **Admin:** an admin can view all users, suspend/unsuspend one, change a tier, and every action shows in the audit log with previous/new state.
- **Admin:** a feature flag flipped in the panel changes public behavior (e.g., disable a screen) and is reversible.

---

### Phase 3 — Domain APIs + Local-First Sync

**Goal:** Move all data off `localStorage` to the server while staying fully offline-capable.

**Tasks (User Track)**
1. REST resources for every entity in §5 (CRUD + validation via JSON Schema).
2. **Local-first data layer:** a single `Store` interface on the client with two implementations — `LocalStore` (IndexedDB) and `ServerStore` (REST). Reads hit local first (instant, offline), writes enqueue to the existing `pendingSyncQueue` and flush when online.
3. **Conflict policy:** last-write-wins with `updatedAt` timestamps + server `version`; retry with backoff (2s/5s/10s per AGENTS.md).
4. **Seed script** replicating current demo data (tasks, habits, moods, deals, places, channels, messages, bulletins) so first login looks identical.
5. Row-level ownership: every resource belongs to a `user` (and later a `community`/`region`).
6. Media uploads (place/deal images, avatars) → object storage with signed URLs (UI inputs unchanged).
7. E2E: offline → online sync test (create task offline, reconnect, verify no loss, no duplicates).

**Tasks (Admin Track — Dual-Track, per entity, same build step)**
8. For **every** entity (tasks, habits, moods, sleep, deals, places, channels, bulletins, notifications, applets, gamification, trusted contacts): generate the admin CRUD module automatically —
   - list + search + filters (by user/community/status),
   - create/edit/soft-delete,
   - inspect per-user data with **override** capability (e.g., adjust XP, edit a deal, remove a bulletin),
   - suspend/restore user-generated content,
   - before/after audit logging on every mutation.
9. **Admin moderation flows:** deals review queue (approve/reject), place claims, channel moderation, bulletin/review moderation — reusing existing UI patterns.
10. **Admin metrics/health:** live counts per entity, sync health (offline queue depth), and per-user storage usage in the panel.

**Acceptance criteria**
- 100% of today's mock data can be created/read/updated/deleted through the API.
- Offline mode still renders cached data and queues writes; reconnect flushes without data loss.
- No `localStorage` reads remain outside the offline-cache abstraction.
- **Admin:** every entity has full CRUD in the panel; a moderator can approve/reject a submitted deal and suspend an abusive bulletin post; all actions audited with before/after state.
- **Admin:** the panel shows live entity counts and sync/queue health.

---

### Phase 4 — Real-Time Chat & Real AI

**Goal:** Make Community chat live and turn the AI assistant into a real (but gracefully-degrading) assistant.

**Tasks (User Track)**
1. **WebSocket gateway:** channel presence, typing indicators, message delivery + read receipts, unread counts (drives the existing badges). Fall back to REST polling when WS fails.
2. **Server-side AI proxy** using **AI SDK** (or chosen provider) with:
   - system prompt built from `aiPersonality` + `aiLearningPreferences`,
   - memory via `AIMemory` moved server-side (per-user),
   - tool calls to the new REST API (e.g., "Plan my day" actually creates tasks),
   - **fallback to the existing heuristic engine** when offline or on free tier — AI always answers.
3. Wire AI **push notifications** for reminders/task check-ins (existing permission flow reused).
4. Notifications: server-generated `localLifeNotifications` + web push.

**Tasks (Admin Track — Dual-Track, same build step)**
5. **Admin chat controls:** view any channel/message, delete or soft-hide messages, mute/kick users from channels, toggle channel features, set moderation rules — all real-time from the panel.
6. **Admin AI console:** per-user AI quota/limits, view AI memory & personality, clear/reset memory, switch model, set free-tier fallback behavior via flags.
7. **Admin notifications:** send targeted broadcast notifications, view delivery metrics, disable push globally (feature flag).
8. **Admin real-time metrics:** WS connection counts, message throughput, AI token usage/cost per user, error rates — live in the panel.

**Acceptance criteria**
- Two browsers see chat messages appear live; typing indicator shows.
- AI chat returns real, context-aware answers online; identical heuristic answers offline.
- AI suggestions (dashboard insight, planner, explore) come from real data + server AI.
- **Admin:** a moderator can delete a live chat message (users see it vanish) and mute a user; the action is audit-logged.
- **Admin:** AI quota/cost and WS health are visible live; a memory reset in the panel takes effect on the user's next AI reply.

---

### Phase 5 — Production Hardening

**Goal:** Make it bulletproof and deployable for real users.

**Tasks (User Track)**
1. **PWA:** real `manifest.json` + service worker (offline shell, app-shell caching, background sync). Precache the built modules; runtime-cache maps/weather proxy responses.
2. **Push notifications** (VAPID) for tasks, deals, community mentions, safety alerts.
3. **Observability:** OpenTelemetry traces + Sentry (front & back) + Pino structured logs with trace IDs; uptime checks.
4. **Security audit** (Reviewer/security pass): CSRF, XSS (all `innerHTML` sinks audited), rate limits, SSRF on proxies, secrets scan in CI, dependency audit.
5. **Backups & migrations:** automated pg dumps, migration test against a prod-data copy, documented **rollback plan**.
6. **Deployment pipeline:** Docker images, GitHub Actions (lint → test → build → migrate → deploy), preview envs, zero-downtime deploy, rollback button.
7. **Performance:** Lighthouse/Web Vitals targets, bundle splitting + lazy routes, image optimization pipeline, CDN in front.

**Tasks (Admin Track — Dual-Track, same build step)**
8. **Admin observability dashboard:** uptime, error rates (Sentry), API p95 latency, active sessions, WS connections, DB/Redis health, queue depth — live status indicators + thresholds.
9. **Admin audit log viewer:** search/filter all admin actions (who/what/when/before/after), export, and (super_admin only) revert reversible actions.
10. **Admin security controls:** rate-limit tuners, IP ban/allow lists, feature-flag-driven incident response (kill switch per subsystem), all as UI toggles.
11. **Admin backups:** trigger/restore backups, view migration history and status.

**Acceptance criteria**
- Lighthouse ≥ 90 (PWA, Performance, Best Practices); no Critical/CVE issues.
- Deploys are automated and roll back in < 5 min.
- Errors are visible in Sentry with trace IDs; p95 API latency budget met.
- **Admin:** the panel shows live health/metrics and full audit history; a super-admin can hit a "kill switch" flag that disables a subsystem instantly and reversibly.

---

### Phase 6 — Scale & Product Polish

**Goal:** Multi-community, monetization, growth.

**Tasks (User Track)**
1. **Regions/communities** (multi-tenant): the whole app is already hyperlocal — add `communityId` to data + geo scoping for Explore.
2. **Subscriptions:** wire `userSubscriptionTier` to **Stripe** (existing tier UI reused verbatim).
3. **Analytics** (privacy-first): engagement, retention, feature usage.
4. **i18n/a11y pass:** WCAG 2.1 AA on existing components (AGENTS.md gate).
5. **Load testing** + horizontal scaling (multi-instance via Redis pub/sub), read replicas.

**Tasks (Admin Track — Dual-Track, same build step)**
6. **Admin community/tenant management:** create/edit/pause/delete communities, set geo bounds, assign moderators, per-community feature flags and rate limits.
7. **Admin subscriptions:** view/pause/refund subscriptions, issue credits, adjust tiers, Stripe webhook status + payment failures surfaced in the panel.
8. **Admin analytics:** engagement/retention/feature-usage dashboards + export (per community, per user).
9. **Admin RBAC management:** manage admin users and roles (super_admin/admin/moderator), 2FA for admins, per-role capabilities matrix in the panel.

**Acceptance criteria**
- New community provisioning is admin-driven; data stays scoped.
- Paid tiers gate AI/pro features via the server, not the client.
- Load test at N× expected traffic without errors; DB replication in place.
- **Admin:** a super-admin can provision a community, assign a moderator, pause a subscription, and view community analytics — all from the panel, all audited.

---

## 7. Migration Rules (the "never break the UI" contract)

1. **IDs are APIs** — never rename, remove, or re-purpose a DOM id without an explicit migration ticket.
2. **Design tokens stay** — `:root` CSS variables are the source of truth; new code references them only.
3. **Screenshot gate per phase** — a Playwright diff vs Phase 0 baseline runs in CI; a diff = blocked PR.
4. **Local-first, never local-only** — after Phase 2, any new data flow writes through `Store` (cache + server).
5. **Demo account persists** — `test@example.com` / `password` remains a seeded real user so the first-run UX is unchanged.
6. **Every server change ships with a migration** — `drizzle generate` + `drizzle migrate` + a rollback.
7. **Every schema/resource ships with its Admin Track** — a new table or endpoint without its admin CRUD/config/audit is blocked at review (Dual-Track, §0).

---

## 8. Security Checklist (each phase, Reviewer gate)

- [ ] No keys/secrets in client or repo (env only, `.env` ignored, CI secret scan)
- [ ] Auth: Argon2id, HttpOnly+Secure cookies, CSRF tokens, session expiry/rotation
- [ ] **Admin RBAC:** every admin route checks role middleware (super_admin/admin/moderator); admin sessions are 2FA-protected (Phase 6) and short-lived
- [ ] **Admin audit:** every admin mutation writes `audit_logs` (actor, target, action, before/after, timestamp); no admin action is silent
- [ ] Input validation on every route (JSON Schema); SQL parameterized via Drizzle (no raw concatenation)
- [ ] XSS: audit all `innerHTML`/template sinks; sanitize user content (community, bulletins, reviews) — **admin panel included**
- [ ] SSRF guards on Maps/Weather proxies (allow-listed hosts, no arbitrary fetch)
- [ ] Rate limiting on auth + all writes; per-user quotas; admin override toggles in panel
- [ ] Media: content-type + size validation, malware scan for uploads, signed URLs only
- [ ] Dependency audits (`npm audit`, `renovate`), OWASP top-10 pass before each deploy
- [ ] Audit trail for destructive/admin actions (soft-delete preferred; hard-delete only super_admin + audited)

---

## 9. Quality Gates (AGENTS.md §4)

| Gate | Command | Phase |
|------|---------|-------|
| Lint | `npm run lint` | all |
| Type check | `npm run typecheck` (JSDoc/tsc) | all |
| Unit tests | `npm run test` | Phase 1+ |
| E2E / visual | `npm run test:e2e` (Playwright diff) | all (baseline Phase 0) |
| **Admin E2E** | `npm run test:admin` — RBAC, CRUD per entity, audit-log assertions | Phase 2+ (dual-track gate) |
| **Dual-track review** | Every PR touches both user + admin tracks for the same feature | Phase 2+ (Reviewer gate) |
| Build | `npm run build` | all |
| Security scan | Reviewer audit + `npm audit` | all |
| Migration | `drizzle generate` + `drizzle migrate` (never push) | Phase 2+ |
| Coverage | >80% on new code | Phase 1+ |

---

## 10. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Refactor accidentally changes UI | Medium | Pixel-diff CI gate; tiny PRs; IDs-as-contract rule |
| Data loss during migration | Medium | Local-first cache keeps a copy; backup before migration; dry-run seed on prod-data copy |
| Sync conflicts (offline edits) | Medium | `updatedAt` + version LWW; conflict logging; later CRDT if needed |
| Real AI costs / abuse | High | Per-user quotas, rate limits, free-tier fallback to heuristics, server-side token caps |
| Vendor lock (Supabase/Auth) | Low | Thin auth adapter interface; swap possible |
| Maps quota/leak | Medium | Keys server-side + IP/domain restrictions + quota alerts |

---

## 11. Definition of Done (per phase)

- All tasks complete with passing quality gates (§9).
- **Screenshot diff = 0** vs Phase 0 baseline (visual fidelity proof).
- E2E suite green on desktop + mobile.
- **Dual-Track complete:** every feature shipped this phase has its Admin Panel management interface (CRUD, config/flags, audit, metrics) verified — per §0.
- **Admin verification steps provided:** step-by-step instructions for testing both the user view and the admin control (§0.3 step 6).
- Progress updated in `progress.md` / `feature_list.json` (AGENTS.md §7) and feature `passes` flipped only after manual verification.
- User confirms satisfaction before the phase is marked complete (AGENTS.md §8).

---

## 12. Suggested Start Order (the "little by little")

1. **Phase 0 now** — sidebar already fixed; next: git init + Vite build + keys to env + screenshot baselines.
2. **Phase 1** — modularize without visual change (biggest single refactor, zero risk to UX by design).
3. **Phase 2** — real auth + DB + **Admin Panel foundation (users, config, audit)**; the app becomes multi-device true.
4. **Phase 3** — all data live, offline sync, **full admin CRUD + moderation per entity**.
5. **Phase 4** — live chat + real AI + **admin chat/AI/notifications consoles**.
6. **Phase 5** — hardening + deploy + **admin observability/security/backups**.
7. **Phase 6** — monetization & scale + **admin tenant/subscription/analytics/RBAC**.

Each phase ships independently and is fully reversible (rollback plan included).

---

*This plan is a living document — it will be updated as phases complete and priorities change. The UI never changes without your sign-off.*
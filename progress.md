## Last Updated: 2026-08-21
## Session: 3 of estimated 60
## Trace ID: phase1-js-extraction

### Completed
- Phase 1 (partial): CSS extracted from index.html into src/styles/* (commit 71489be)
  - 5 stylesheets sliced byte-exact; src/styles/index.css aggregates via @import in original cascade order
  - A/B pixel-diff gate: 7/7 pixel-identical at commit time
- Phase 1: Main JS extracted and split into 20 feature modules (public/modules/)
  - Step 1: original inline main script (index.html L1539-8141, 6603 lines, 397,071 bytes) extracted byte-exact to app-core.js (commit 5398632); lives in public/ because Vite refuses classic <script src> without type="module"
  - Step 2: app-core.js split into 20 feature modules at verified-safe boundaries:
    state, native-bridge, data, utils, dashboard, planner, explore, community,
    ai-assistant, wellness, settings-deals, storage, auth-app, productivity,
    lifestyle, gamification, applets, voice-share, map-services, services-emergency
    - Boundary safety proven by static analysis: zero depth-0 statements reference any function/variable declared later (hoisting/TDZ safe across scripts)
    - Concatenation of all 20 modules == original file byte-for-byte
    - Note: duplicate top-level function declarations in source (openCreateHabitModal etc.) are legal classic-script semantics (last wins); node --check must run with .cjs extension or ESM autodetection falsely rejects them
    - index.html now loads the 20 scripts in original order at the former app-core.js position
    - A/B gate result: 7/7 pixel-identical vs HEAD build
- Remaining inline scripts in index.html: L1558 (Pro Aligned Enhancements), L2443, L2587, L2742, L3755 (#ai-super-core); head scripts L12 crypto-js, L13 html2canvas, L14 Google Maps (async defer); file now 4,249 lines
- A/B verification of JS extraction:
  - Comparison isolates the change: dist-old = CSS-extracted/JS-inline (HEAD 71489be) vs dist = CSS-extracted/JS-external
  - Full-suite runs: run1 6/7 (explore failed 2.86%), run2 6/7 (planner failed 1.01%) — different screens fail per run
  - Isolated re-runs pass (explore passed alone after failing in suite). No fixed failure signature => environmental flakiness, not a regression from the extraction

### In Progress
- (nothing — ready for next phase step)

### Blocked
- A/B full-suite has residual flakiness under low RAM (~1.2 GB free of 8 GB): chromium.launch works but newPage()/page loads intermittently stall under memory pressure; failures move between screens and pass in isolation. This session's module-split run was clean: 7/7 in 2.4m.

### Known Issues
- Google Maps key still reaches the browser (by design — referrer-restricted client key; see README)
- tests/e2e/baseline.spec.mjs only writes baselines, never compares; A/B spec is the real pixel gate
- A/B test titles still say "old (inline CSS) vs new (extracted CSS)" — stale naming; actual comparison is HEAD build vs working-tree build
- PowerShell 5.1 Start-Process lacks -Environment; npx must be invoked via cmd /c

### Next Up
- Phase 1: extract remaining inline JS blocks (L1558, L2443, L2587, L2742, L3755) into public/modules/ the same way
- Phase 1: JSDoc boundaries, unit tests, smoke e2e, full gate suite + final Phase 1 commit
- Phase 2: Real backend (Fastify) + Postgres/Drizzle auth + Admin Panel foundation (Dual-Track: backend feature <=> Admin UI always together)

### How to rebuild A/B baseline (after cleanup)
- git worktree add .tmp-old HEAD~N (the commit before your changes)
- npx vite build --config vite.old.config.mjs   (builds .tmp-old -> dist-old/)
- npx playwright test --config playwright.ab.mjs --reporter=line

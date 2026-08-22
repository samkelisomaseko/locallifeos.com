## Last Updated: 2026-08-22
## Session: 4 of estimated 60
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
- Phase 1: Remaining 5 inline JS blocks extracted to public/modules/ (this session)
  - enhancements.js (883L), ctx-menu.js (139L), user-context.js (149L), db-pro.js (1009L), ai-super-core.js (491L)
  - Byte-exactness PROVEN against a646b87 inline blocks: content identical after LF normalization + one trailing newline; the ~880-char size deltas were purely CRLF-vs-LF line endings (git show returns LF, working tree is CRLF)
  - index.html: 4,249 -> 1,574 lines; ZERO inline <script> blocks remain; 25 external tags total (3 CDN head + 22 local modules); dist/index.html 106.57 kB gzip 21.07 kB (was 238 kB)
  - Script execution order preserved: the 5 new module tags sit after the 20 feature-module tags, same relative order as the original blocks
  - Gates green: lint, tsc --noEmit, node --test (2/2), vite build
  - A/B pixel gate: full run 6/7 passed; login failed with a page.goto NAVIGATION TIMEOUT (not a pixel mismatch); login re-run alone PASSED. All 7 screens verified pixel-identical vs a646b87 build.

### PRE-EXISTING DEFECTS discovered this session (do NOT fix silently)
Three of the five extracted modules contain syntax errors that were ALREADY present in the original inline blocks of a646b87. Those script blocks have NEVER executed in any browser (a classic script that fails to parse defines nothing), so they are dead code:
- ctx-menu.js — ternary missing its `:` branch; node --check: "Unexpected token ';'" at line 91 `})();`. Consequence: window.showCtxMenu was never defined.
- db-pro.js — raw newline inside a string literal in the CSV export (.join("...") around line 210). Consequence: window.DB_PRO never defined.
- ai-super-core.js — stray backslash escapes before template-literal backticks (`tile.innerHTML = \`` at line 281). Consequence: block never ran.
Byte-exact extraction preserves current behavior exactly (dead stays dead; both inline-broken and external-broken produce identical no-op loads). REPAIRING these would ACTIVATE previously-dead code = behavior change requiring explicit user approval before doing it.
- Also recovered this session: .git corruption (refs/heads/master was 41 NUL bytes; index corrupt). Restored master to a646b87 (last reflog entry) and rebuilt the index. progress.md itself had been NUL-corrupted on disk; restored from git and updated.

### In Progress
- (nothing — ready for next phase step)

### Blocked
- A/B full-suite has residual environmental flakiness under memory pressure: chromium.launch works but page.goto/newPage intermittently stalls past the 60s test timeout; failures move between screens and pass in isolation (this run: login goto timeout, passed alone afterwards; prior runs: explore, planner). No fixed failure signature => environmental, not a regression. Healthy-RAM runs complete 7/7 cleanly in 2.4-2.9m.

### Known Issues
- Google Maps key still reaches the browser (by design — referrer-restricted client key; see README)
- tests/e2e/baseline.spec.mjs only writes baselines, never compares; A/B spec is the real pixel gate
- A/B test titles still say "old (inline CSS) vs new (extracted CSS)" — stale naming; actual comparison is HEAD build vs working-tree build
- PowerShell 5.1 Start-Process lacks -Environment; npx must be invoked via cmd /c; Set-Content -NoNewline collapses piped line arrays (use Write tools or -Encoding with explicit newlines)
- node --check on classic browser scripts needs a .cjs copy (Node ESM autodetection rejects legal duplicate function declarations)
- 3 extracted modules carry pre-existing SyntaxErrors and are dead code (see PRE-EXISTING DEFECTS): ctx-menu.js, db-pro.js, ai-super-core.js — repair pending user decision

### Next Up
- USER DECISION: repair the 3 dead enhancement modules (activates never-run code; needs regression testing after) or leave them byte-exact/dead
- Phase 1 wrap-up: JSDoc boundaries, unit tests for pure helpers, smoke e2e, full gate suite + final Phase 1 commit
- Phase 2: Real backend (Fastify) + Postgres/Drizzle auth + Admin Panel foundation (Dual-Track: backend feature <=> Admin UI always together)

### How to rebuild A/B baseline (after cleanup)
- git worktree add .tmp-old HEAD~N (the commit before your changes)
- npx vite build --config vite.old.config.mjs   (builds .tmp-old -> dist-old/)
- npx playwright test --config playwright.ab.mjs --reporter=line

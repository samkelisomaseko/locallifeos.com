## Last Updated: 2026-08-21
## Session: 3 of estimated 60
## Trace ID: phase1-js-extraction

### Completed
- Phase 1 (partial): CSS extracted from index.html into src/styles/* (commit 71489be)
  - 5 stylesheets sliced byte-exact; src/styles/index.css aggregates via @import in original cascade order
  - A/B pixel-diff gate: 7/7 pixel-identical at commit time
- Phase 1 (partial): Main JS script extracted to public/modules/app-core.js
  - Original inline main script (index.html L1539-8141, 6603 lines, 397,071 bytes) extracted byte-exact (verified exact match: true)
  - Lives in public/ NOT src/ because Vite refuses classic <script src> without type="module"; public/ copies as-is, preserving parse timing + global scope (315 inline handlers depend on globals)
  - index.html: 10,834 -> 4,230 lines; main script replaced by <script src="/modules/app-core.js"></script>
  - Remaining inline scripts: L1539 (Pro Aligned Enhancements), L2424, L2568, L2723, L3736 (#ai-super-core); head scripts L12 crypto-js, L13 html2canvas, L14 Google Maps (async defer)
  - Build passes: dist/index.html 237.29 kB + CSS; dist/modules/app-core.js copied byte-exact (397,071 bytes)
- A/B verification of JS extraction:
  - Comparison isolates the change: dist-old = CSS-extracted/JS-inline (HEAD 71489be) vs dist = CSS-extracted/JS-external
  - Full-suite runs: run1 6/7 (explore failed 2.86%), run2 6/7 (planner failed 1.01%) — different screens fail per run
  - Isolated re-runs pass (explore passed alone after failing in suite). No fixed failure signature => environmental flakiness, not a regression from the extraction

### In Progress
- (nothing — ready for next phase step)

### Blocked
- A/B full-suite has residual flakiness under low RAM (~1.2 GB free of 8 GB): chromium.launch works but newPage()/page loads intermittently stall under memory pressure; failures move between screens and pass in isolation. Gate is trustworthy on a machine with more free memory.

### Known Issues
- Google Maps key still reaches the browser (by design — referrer-restricted client key; see README)
- tests/e2e/baseline.spec.mjs only writes baselines, never compares; A/B spec is the real pixel gate
- A/B test titles still say "old (inline CSS) vs new (extracted CSS)" — stale naming; actual comparison is HEAD build vs working-tree build
- PowerShell 5.1 Start-Process lacks -Environment; npx must be invoked via cmd /c

### Next Up
- Phase 1: split app-core.js into feature modules (user chose "Split into modules by feature") as classic scripts in original order, A/B-verifying each step
- Phase 1: extract secondary JS blocks (L1539, L2424, L2568, L2723, L3736) the same way
- Phase 1: JSDoc boundaries, unit tests, smoke e2e, full gate suite + commit
- Phase 2: Real backend (Fastify) + Postgres/Drizzle auth + Admin Panel foundation (Dual-Track: backend feature <=> Admin UI always together)

### How to rebuild A/B baseline (after cleanup)
- git worktree add .tmp-old HEAD~N (the commit before your changes)
- npx vite build --config vite.old.config.mjs   (builds .tmp-old -> dist-old/)
- npx playwright test --config playwright.ab.mjs --reporter=line

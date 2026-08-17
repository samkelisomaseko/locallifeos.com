# LocalLife OS

A hyperlocal community OS — dashboard, planner, explore (maps + deals), community chat, wellness, settings, and an AI assistant.

**Ground rule (non-negotiable):** keep 100% of the current UI & UX. Every change preserves the existing screens, DOM ids/classes, animations, colors, and interactions. See `plan.md` for the full production-readiness roadmap.

## Stack

- **App:** single `index.html` (vanilla JS, ~12k lines) built with **Vite** — the UI itself is untouched, Vite just adds a build step.
- **Server:** minimal Node server (`server/serve.mjs`) for static files + the server-side weather proxy.
- **Tests:** Playwright (visual/screenshot baselines), ESLint, TypeScript type-check.

## Setup

```bash
npm install
cp .env.example .env   # then fill in your real API keys
```

`.env` is gitignored — never commit it.

| Variable | Where it's used |
|----------|-----------------|
| `OPENWEATHER_API_KEY` | Server-side only (proxied via `/api/weather`) — never ships to the client |
| `VITE_GOOGLE_MAPS_API_KEY` | Injected at build time into the Maps JS loader (referrer-restricted client key) |

## Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Vite dev server (with `/api/weather` dev proxy) at http://localhost:5173 |
| `npm run build` | Production build to `dist/` |
| `npm run serve` | Production static server + weather proxy at http://localhost:4173 (serves `dist/`) |
| `npm run lint` | ESLint on server/config code |
| `npm run typecheck` | `tsc --noEmit` type check |
| `npm run test` | Node test runner unit tests |
| `npm run test:e2e` | Playwright screenshot baselines (desktop + mobile) |

## Screenshot baselines

Baselines live in `tests/baselines/` and are committed. They are the visual-fidelity proof: any UI change must keep the screenshots identical, otherwise a future CI gate will block the PR (see `plan.md` §7).

## Secrets policy

- **OpenWeather key:** server-only. The browser calls `/api/weather?...`, the server forwards to OpenWeather. Verified absent from the client build.
- **Google Maps key:** a client key by design (restricted by HTTP referrer in Google Cloud Console). Moved to env so it's no longer hardcoded in the repo.

## Roadmap

See `plan.md` — phased production-readiness (Vite build → modularization → real backend/auth → local-first sync → real-time chat + real AI → hardening → scale), with the mandatory **Dual-Track Architecture**: every feature ships with its Admin Dashboard management UI.
# LocalLife OS — production image (Phase 5 Batch A hardening)
#
# ROLLBACK: to revert, redeploy the previous image tag, e.g.
#   docker run -d -p 4173:4173 locallifeos:<PREVIOUS_TAG>
# Keep the last known-good tag recorded in the release notes before promoting :latest.
#
# ENTRYPOINT (verified 2026-10-09): server/server.mjs is the single unified
# production entrypoint — Fastify serves dist/ static (SPA fallback) + the
# full /api/* API (incl. /api/weather proxy) on PORT (default 4173).
# server/api.mjs remains as a standalone API-only dev entry (PORT_API 3001).
# server/serve.mjs (legacy plain-http static+weather) is retained for
# backwards compat but is NOT used by this image.

# ── Stage 1: build ──────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
# .dockerignore keeps secrets and local artifacts out of the build context.
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.mjs ./
COPY public/ ./public/
COPY src/ ./src/
# No DATABASE_URL needed: vite build only inlines OPENWEATHER_API_KEY as '' when unset.
RUN npx vite build

# ── Stage 2: slim runtime ───────────────────────────────────────
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
# Omit devDependencies: eslint/playwright/vite/typescript are build-time only.
RUN npm ci --omit=dev && npm cache clean --force
# Deliberately copying ONLY what the runtime needs — never .env (see .dockerignore).
COPY --from=build /app/dist ./dist
COPY server/ ./server/
EXPOSE 4173
# /api/v1/health and dist/ static are both served by the unified server on 4173.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4173/api/v1/health | grep -q '"ok":true' || exit 1
CMD ["node", "server/server.mjs"]

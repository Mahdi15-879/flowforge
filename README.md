# FlowForge — Sprint 01

A portfolio-grade foundation for a business workflow automation SaaS.

## Requirements
Node.js 22, pnpm 10.18, Docker Compose.

## Setup
```bash
corepack enable
corepack prepare pnpm@10.18.0 --activate
pnpm install
cp .env.example .env
docker compose -f infrastructure/compose.yaml up -d
pnpm dev
```
On Windows PowerShell use `Copy-Item .env.example .env`.

Open http://localhost:3000 and http://localhost:4000/api/v1/health and http://localhost:4000/docs.

## Checks
```bash
pnpm typecheck
pnpm test
pnpm build
```

## Sprint scope
Web app shell, NestJS liveness endpoint, shared Zod contract, tests, Docker PostgreSQL and Redis, and CI. No database persistence, auth, workflow engine, or Redis integration yet. Health endpoint reports API process liveness, **not** database/Redis readiness.

## Security
Local development credentials only. Never use sample passwords in production. Set explicit CORS origins, rate limiting, authorization, and secrets management before deployment.

## Architecture
See docs/decisions/0001-modular-monolith.md.

## First-time dependency lockfile
After the initial `pnpm install`, commit the generated `pnpm-lock.yaml` and switch CI back to `pnpm install --frozen-lockfile` for reproducible installs.

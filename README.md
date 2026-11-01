# FlowForge

**A full-stack workflow management and execution platform** built with TypeScript, Next.js, and NestJS.

FlowForge is a portfolio project focused on designing maintainable, production-minded web applications. It combines a responsive workflow dashboard with a modular backend, typed API contracts, and persistent workflow execution data.

## Features

- **Workspace management** — organize workflows within workspaces.
- **Workflow builder** — create and manage workflows and their ordered trigger/action steps.
- **Workflow execution** — run workflows and inspect execution history and individual runs.
- **Authentication and access control** — protected workspace and workflow operations.
- **Responsive dashboard** — workflow navigation, status indicators, and run history.
- **Typed API contracts** — shared Zod schemas for consistent frontend/backend data validation.

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js 15, React, TypeScript |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL, Prisma |
| Infrastructure | Docker Compose, Redis |
| Monorepo | pnpm workspaces, Turborepo |
| Validation & testing | Zod, Jest, Vitest, TypeScript |

## Architecture

```text
apps/
  web/           Next.js dashboard
  api/           NestJS REST API
packages/
  contracts/     Shared Zod schemas and types
infrastructure/  Local PostgreSQL and Redis services
docs/            Architecture decisions
```

The frontend communicates with the backend through a local `/backend` proxy. The API handles authentication, workspace access, workflow configuration, and execution history. Shared contracts help keep API responses and UI types aligned.

## Getting Started

**Requirements:** Node.js, pnpm, and Docker with Docker Compose.

```bash
git clone https://github.com/Mahdi15-879/flowforge.git
cd flowforge
pnpm install
docker compose -f infrastructure/compose.yaml up -d
```

Configure the required environment variables using the repository's example environment files, then apply the database migrations and start the development apps:

```bash
pnpm --filter @flowforge/api exec prisma migrate dev
pnpm dev
```

- **Web app:** http://localhost:3000
- **API:** http://localhost:4000/api/v1

> Database configuration and environment variables must match your local Docker setup. The commands above assume the development scripts and Prisma configuration are available in the checked-out version.

## Quality Checks

```bash
pnpm --filter @flowforge/api test
pnpm --filter @flowforge/web typecheck
pnpm --filter @flowforge/web build
```

## Development Approach

FlowForge is developed by **Mahdi Heidari** as a hands-on full-stack engineering project. AI-assisted development is part of the workflow for exploring implementation options, reviewing code, and accelerating debugging; architectural decisions, integration, testing, and validation remain developer responsibilities.

## Project Status

**Actively under development.** Features and implementation details may evolve as the project progresses.

## Author

**Mahdi Heidari** — [GitHub](https://github.com/Mahdi15-879) · [Portfolio](https://mahdiheidari.dev)

<div align="center">

# ⚡ FlowForge

### Build workflows. Execute actions. Understand every run.

**A full-stack, TypeScript-first workflow automation platform** featuring a visual workflow dashboard, workspace-based access control, an execution engine, and observable run history.


**[Features](#-what-flowforge-does)** · **[Architecture](#-architecture)** · **[Setup](#-run-locally)** · **[Roadmap](#-product-roadmap)** · **[AI-Assisted Engineering](#-ai-assisted-engineering)**

</div>

---

## 🎯 Why FlowForge?

Business applications need more than polished interfaces: they need clear data boundaries, reliable authorization, maintainable APIs, and visibility into what happens when an operation runs.

I built **FlowForge** as a hands-on portfolio project to explore those engineering challenges across the full stack. The project brings together my frontend background with backend architecture, database modeling, workflow execution, and automated testing.

FlowForge is **a locally runnable development project**, not a hosted SaaS product or a claim of production readiness.

## ✨ What FlowForge Does

| Area | Implemented capabilities |
| --- | --- |
| 🏢 **Workspaces** | Organize workflows in workspaces, with membership-aware access to workspace resources. |
| 🔐 **Authentication** | JWT-based authentication and protected API operations. |
| 🧩 **Workflow management** | Create and inspect workflows and their ordered steps through the dashboard. Update/delete controls are planned for the UI (see below). |
| ▶️ **Execution** | Execute configured workflows using a backend execution engine, including HTTP action handling. |
| 📜 **Run history** | Review workflow runs and inspect execution results in the dashboard. |
| 🖥️ **Dashboard** | Navigate workspaces and workflows, use the workflow builder, and review status and run information. |
| 🔄 **UI consistency** | Persist workspace/workflow selections locally and guard against stale asynchronous responses when switching views. |
| 🧬 **Shared contracts** | Validate and type data boundaries with reusable Zod contracts. |
| 📚 **API documentation** | Explore backend endpoints through Swagger. |

### ✏️ Workflow editing and deletion — next implementation step

The next planned UI enhancement is to expose **Edit** and **Delete** actions for workflows. The intended experience includes updating workflow details, confirming destructive actions, showing clear success/error feedback, and keeping workflow lists and the selected item in sync without a manual refresh.

**Current status:** These frontend actions are **not yet implemented**. Update/delete support was previously developed on the API side, but its exact current behavior and endpoint coverage should be rechecked before the UI is connected. This section describes near-term work, not a finished feature.

### 🖥️ Frontend experience

The **Next.js 15 + React + TypeScript** application is organized around reusable dashboard components and dedicated data-fetching hooks. It includes a sidebar, workflow builder, workflow details, run history, summary cards, and an API health indicator.

Particular attention was paid to everyday UX behavior: switching between workspaces and workflows, preserving selection after refresh, and preventing outdated requests from overwriting newer UI state.

### ⚙️ Backend capabilities

The **NestJS** application exposes a versioned REST API with modules for authentication, workspaces, membership/access control, workflows, workflow steps, execution, and health checks. **Prisma + PostgreSQL** persist application data, while the execution layer processes workflows and records runs.

> **Scope note:** Redis is provisioned in the local Docker infrastructure. Its presence does not imply that queue-based execution, distributed workers, or caching are already implemented.

## 🧱 Tech Stack

| Layer | Technology | Role |
| --- | --- | --- |
| Frontend | Next.js 15, React, TypeScript | Interactive application and dashboard |
| Backend | NestJS, TypeScript | Modular REST API and workflow execution |
| Persistence | PostgreSQL, Prisma | Relational data model and migrations |
| Contracts | Zod | Runtime validation and shared schemas |
| Infrastructure | Docker Compose, Redis | Reproducible local services; Redis provisioned for future use |
| Workspace tooling | pnpm, Turborepo | Monorepo dependency and task orchestration |
| Testing | Jest, Vitest | Backend and contract test suites |
| Documentation | Swagger/OpenAPI, ADRs | API discovery and architectural decisions |

## 🏗️ Architecture

```text
                  ┌─────────────────────────┐
                  │  Next.js / React Web UI │
                  │  Dashboard + Builder    │
                  └────────────┬────────────┘
                               │ HTTP / typed contracts
                  ┌────────────▼────────────┐
                  │      NestJS REST API    │
                  │ Auth · Workspaces       │
                  │ Workflows · Execution   │
                  └────────────┬────────────┘
                               │ Prisma
                  ┌────────────▼────────────┐
                  │       PostgreSQL        │
                  │ Users · Workflows · Runs│
                  └─────────────────────────┘

       Shared Zod contracts: packages/contracts
       Local infrastructure: Docker Compose (+ Redis)
```

The repository uses a **pnpm/Turborepo monorepo**:

- `apps/web` — Next.js frontend
- `apps/api` — NestJS backend
- `packages/contracts` — shared Zod schemas and types
- `infrastructure` — Docker Compose configuration
- `docs/decisions` — architecture decision records

The architecture follows a **modular-monolith approach**, keeping domain responsibilities separate without prematurely introducing microservices. This supports simpler local development, clearer contracts, and incremental extension.

## 🚀 Run Locally

### Prerequisites

- **Node.js 22**
- **pnpm 10.18** (Corepack can manage the version)
- **Docker** with Docker Compose

### 1. Clone and install

```bash
git clone https://github.com/Mahdi15-879/flowforge.git
cd flowforge
corepack enable
corepack prepare pnpm@10.18.0 --activate
pnpm install
```

### 2. Configure environment variables

Copy the repository's example environment configuration and set the values required by the API and database. For Windows CMD:

```cmd
copy .env.example .env
```

Review the example file and any app-specific environment requirements before starting. **Do not commit real credentials or secrets.**

### 3. Start local infrastructure

```bash
docker compose -f infrastructure/compose.yaml up -d
```

The local Compose configuration exposes **PostgreSQL on `localhost:15432`** and **Redis on `localhost:6379`**. Ensure the database connection string matches the mapped PostgreSQL port.

### 4. Apply database migrations and start development

```bash
pnpm --filter @flowforge/api exec prisma migrate dev
pnpm dev
```

| Service | Local URL |
| --- | --- |
| 🖥️ Web dashboard | http://localhost:3000 |
| 💚 API health | http://localhost:4000/api/v1/health |
| 📖 Swagger docs | http://localhost:4000/docs |

> These instructions describe the local development workflow. Environment values and scripts should be checked against the checked-out repository version.

## 🧪 Testing & Engineering Quality

FlowForge combines automated tests with TypeScript checks and production-build validation.

```bash
pnpm test
pnpm --filter @flowforge/web typecheck
pnpm --filter @flowforge/web build
```

**Latest locally verified test run:** **215 passing tests** — **195 API tests** across 21 Jest suites and **20 shared-contract tests** across 2 Vitest files.

Frontend type-checking and build validation also passed in the verified development workflow. **There is not yet a dedicated frontend component test suite**, so the passing-test total must not be interpreted as full UI test coverage.

Additional engineering practices include modular backend boundaries, shared runtime validation, Git branches and pull requests, and documented architecture decisions.

## 🗺️ Product Roadmap

The following items are **potential future enhancements, not implemented features**. They illustrate how the current foundation could evolve.

| Priority area | Potential enhancement | Value |
| --- | --- | --- |
| ✏️ Workflow CRUD UX | Edit/delete actions, confirmation dialog, mutation feedback, and synchronized selection | Complete everyday workflow management in the dashboard |
| 🎨 Visual automation | Drag-and-drop workflow canvas, branching, conditions, and richer step configuration | More expressive workflow authoring |
| ⏰ Triggers | Scheduled runs, webhooks, and event-based triggers | Automations that start without manual intervention |
| 📬 Background processing | Redis-backed queues, workers, retries, backoff, and dead-letter handling | More resilient asynchronous execution |
| 🔌 Integrations | Reusable connectors, credential management, and third-party service adapters | Broader automation use cases |
| 📊 Observability | Execution timelines, logs, filtering, metrics, and error diagnostics | Faster troubleshooting and operational insight |
| 👥 Collaboration | Invitations, granular roles, and activity/audit history | Better multi-user administration |
| 🧪 Reliability | Frontend tests, end-to-end tests, CI quality gates, and load testing | Higher confidence in changes |
| ☁️ Delivery | Containerized deployment, environment hardening, monitoring, and deployment automation | A path toward hosted operation |

The roadmap is exploratory; its order and scope may change based on technical findings and project priorities.

## 🤖 AI-Assisted Engineering

**I use AI as an engineering accelerator—not as a substitute for engineering judgment.**

Working on FlowForge has also been an opportunity to develop a practical skill that matters in modern software teams: using **ChatGPT effectively within a real development workflow**. Rather than treating AI-generated output as automatically correct, I use it to accelerate exploration and then evaluate the result against the project's architecture, behavior, and tests.

My approach includes:

- **🧠 Problem decomposition:** Break down features and debugging tasks into specific, testable steps.
- **🔎 Technical exploration:** Compare implementation options and identify trade-offs before integrating changes.
- **🛠️ Faster iteration:** Use AI assistance to investigate errors, refactor code, and refine implementation details.
- **🧪 Verification:** Run tests, inspect command output, check type safety, and validate real application behavior.
- **🧭 Ownership:** Keep architectural decisions, code integration, review, and final acceptance under my responsibility.

**The value is not simply generating code faster; it is combining AI fluency with software engineering discipline to deliver understandable, verifiable results.**

## 📍 Project Status

**Active development · Local portfolio project.**

The core dashboard, authentication, workflow creation and inspection, backend execution, persistence, and run history are implemented. Workflow edit/delete controls in the frontend and the other roadmap items are not yet complete. This repository is intended to demonstrate engineering decisions and working functionality, not to advertise a production-hosted service.

## 👨‍💻 Author

**Mahdi Heidari** — Frontend Developer expanding into full-stack engineering

🌐 [Portfolio](https://mahdiheidari.dev) · 💻 [GitHub](https://github.com/Mahdi15-879) · 📦 [FlowForge repository](https://github.com/Mahdi15-879/flowforge)

---

<div align="center"><sub>Built with TypeScript, curiosity, disciplined iteration, and thoughtful AI assistance.</sub></div>

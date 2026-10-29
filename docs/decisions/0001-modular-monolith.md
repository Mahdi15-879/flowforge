# ADR-0001: Modular monolith
Status: Accepted

## Context
FlowForge needs reliable transactional workflow state, a visual editor, and asynchronous processing.

## Decision
Use Next.js web, a modular NestJS API, PostgreSQL for durable state, and Redis/BullMQ for background jobs. The first sprint starts only the web/API and local infrastructure.

## Consequences
Simpler local development and atomic database transactions; horizontal scaling of individual modules requires later architectural work.

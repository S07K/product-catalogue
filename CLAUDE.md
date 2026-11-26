# CLAUDE.md

Instructions for AI coding agents working in this repository. `PLAN.md` is the spec and `DECISIONS.md` records why things are the way they are. Read both before making structural changes.

## Project

A product catalogue MVP: browse, search, product details, and an enquiry form that emails the sales inbox.
It's an npm-workspaces monorepo:

- `packages/shared`: zod schemas and inferred types, the **single source of truth** for the API contract.
- `apps/api`: Node.js + Express 5 + TypeScript.
- `apps/web`: React + Vite + TypeScript + Tailwind v4.

## Architecture rules (do not break)

1. **The web app talks only to our API** (`/api/*`). Never call Fake Store or any product source from the browser. ESLint enforces this.
2. **Vendor shapes stop at the adapter.** Product sources map external data into the `Product` type from `@catalogue/shared`, and nothing outside `apps/api/src/adapters/` may import vendor types.
3. **Services depend on interfaces, never concrete adapters**: `ProductSource`, `FeaturedRepository`, `EmailSender`. Only the composition root (`apps/api/src/server.ts` → `createApp(deps)`) chooses implementations, based on validated env config.
4. **Validate at the edge.** Every route validates params, query and body with a schema from `@catalogue/shared` before calling a service.
5. **One error format.** Throw `AppError` (or let a validation error propagate). The central error handler maps everything to `{ error: { code, message, details? } }`. Never leak stack traces or upstream error bodies.
6. **Styling uses semantic design tokens only** (`bg-surface`, `text-brand`, …) defined in `apps/web/src/styles/theme.css`. No raw palette classes (`bg-blue-600`) or hex values in components.
7. **No new runtime dependency** without a one-line justification in `DECISIONS.md`.

## Conventions

- TypeScript strict; no `any`. Prefer `type` imports (`import type`).
- Small modules named by role: `*.routes.ts`, `*.service.ts`, `*.adapter.ts`, `*.test.ts` next to the code.
- Money is integer cents (`amountCents`); format it only in the UI.
- Config comes only from `apps/api/src/config/env.ts`. Never read `process.env` anywhere else.
- Secrets never go in the repo. Add new config to `.env.example` with a safe local default.

## Testing expectations

- Every route: happy path + validation failure + relevant error mapping (Supertest against `createApp` with fake adapters).
- Adapters: mapping tests with recorded fixtures; no live network calls in tests.
- Web: React Testing Library + MSW for each page's critical behaviour; query by role or label, not by test IDs or classes.
- Run `npm run check` (format, lint, typecheck, test) before declaring a task done.

## Workflow

- Work on a feature branch and make small commits with conventional messages (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- When you make an assumption the ACs don't settle, add it to `DECISIONS.md` in the same change.
- If a library's "latest" version is incompatible with a peer (e.g. TypeScript vs typescript-eslint), pin the compatible version and say why.

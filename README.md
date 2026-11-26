# Product Catalogue

A product catalogue MVP. Customers browse featured products and categories, search, view product details, and send an enquiry that lands in the sales inbox.

It's built as a foundation that can grow: the **product data source**, **look and feel** and **email provider** each sit behind their own seam, so each can be replaced without touching the rest.

| Doc                            | What's in it                                                        |
| ------------------------------ | ------------------------------------------------------------------- |
| [DECISIONS.md](./DECISIONS.md) | Architecture decisions, assumptions, cuts, how it grows, next steps |
| [AI_USAGE.md](./AI_USAGE.md)   | Tools, prompts, and where the AI was wrong                          |
| [PLAN.md](./PLAN.md)           | The spec the build followed                                         |
| [CLAUDE.md](./CLAUDE.md)       | Rules for AI agents working in this repo                            |

## Quick start (Docker, recommended)

Requires Docker Desktop (or Docker Engine with Compose v2). No accounts, keys or `.env` file are needed.

```bash
docker compose up --build
```

| URL                   | What                                                             |
| --------------------- | ---------------------------------------------------------------- |
| http://localhost:8080 | The catalogue                                                    |
| http://localhost:8025 | **Mailpit**: the local "sales inbox". Enquiry emails appear here |

Try it: open a product → **Enquire** → submit the form → see the "Thank you" message → open Mailpit to see the email.

> The first build takes a couple of minutes. Product data comes live from the Fake Store API, so internet access is needed. If Fake Store is down or rate-limiting, run fully offline with bundled data: `PRODUCT_SOURCE=fixture docker compose up --build`.
> Ports clash? `WEB_PORT=8081 MAILPIT_UI_PORT=8026 docker compose up --build`.

## Local development (without Docker)

Requires Node.js 22+ (see `.nvmrc`).

```bash
npm install
docker compose up -d mailpit          # optional: local inbox (or set EMAIL_PROVIDER=console to log emails instead)
npm run dev                           # API on :3000, web on http://localhost:5173 (proxies /api to the API)
```

Optional overrides: `cp .env.example .env`. Every value has a working default.

## Tests and quality checks

```bash
npm test          # all workspaces: shared contract, API, web
npm run check     # format + lint + typecheck + tests (what CI would run)
```

| Suite                  | Covers                                                                                                                                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/shared`      | Enquiry validation rules shared by client and server                                                                                                                                                                                                                                 |
| `apps/api` (Supertest) | Every route via `createApp()` with fake adapters: featured, category split + fallback, search semantics, 404s, validation, upstream 502, email failure 502, honeypot, rate limit, HTML escaping; Fake Store mapping on a recorded response; cache behaviour; production config guard |
| `apps/web` (RTL + MSW) | Each acceptance criterion, driven through the real router and data layer: home shows 5, category link → top rated + more, search button → only matches, tile → details, enquiry → validation / thank you / server error                                                              |

## Stack, and why

| Layer    | Choice                                                      | Why                                                                                                          |
| -------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Client   | **React + TypeScript** (Vite), React Router, TanStack Query | A plain SPA keeps the client/server boundary explicit. Query provides caching plus loading and error states. |
| Backend  | **Node.js + TypeScript**, Express 5                         | Familiar and minimal, with native async error handling in v5. Zod validates every input.                     |
| Contract | `packages/shared` (zod)                                     | One schema validates on both sides: the client gets instant feedback and the server enforces the same rules. |
| Styling  | Tailwind v4 + design tokens in one file                     | A rebrand edits `theme.css`. The default palette is removed, so only tokens exist.                           |
| Email    | nodemailer (SMTP) → Mailpit locally                         | A real inbox for the reviewer with no accounts. In production, point SMTP at SES, SendGrid or Postmark.      |

More detail and trade-offs are in [DECISIONS.md](./DECISIONS.md).

## Architecture

```
apps/web (React)  ──/api──▶  apps/api (Express)
                              routes ─▶ services ─▶ ports ─▶ adapters
                                                    ProductSource      → Fake Store (cached) | fixture
                                                    FeaturedRepository → data/featured.json
                                                    EmailSender        → SMTP (Mailpit / SES / …) | console
```

- The browser never calls Fake Store. All product data goes through our API (ESLint enforces this in the web app).
- Fake Store's data shape is mapped into our own `Product` type inside its adapter and never leaks further.
- `apps/api/src/composition.ts` is the only place that chooses adapters, based on validated env config.

```
packages/shared/      zod schemas + types (API contract)
apps/api/
  data/featured.json  curated "top rated" products (owner-editable)
  src/adapters/       product-source/, featured/, email/  (ports + implementations)
  src/catalogue/      service + routes
  src/enquiries/      service + routes + email template
  src/config/env.ts   validated configuration (+ production email guard)
apps/web/
  src/api/            the only module that calls the API
  src/components/ui/  small owned UI kit (tokens only)
  src/pages/          Home, Category, Search, Product, NotFound
  src/features/enquiry/
  src/styles/theme.css  design tokens
```

## API

| Method | Path                                     | Response                                                                         |
| ------ | ---------------------------------------- | -------------------------------------------------------------------------------- |
| GET    | `/api/health/live` (alias `/api/health`) | liveness: `{ status: "ok" }`, no dependency checks                               |
| GET    | `/api/health/ready`                      | readiness: `ok` / `degraded` (200) or `unavailable` (503), per-dependency status |
| GET    | `/api/categories`                        | `CategorySummary[]` (with count and image)                                       |
| GET    | `/api/products/featured`                 | the 5 curated home products                                                      |
| GET    | `/api/categories/:slug/products`         | `{ category, topRated, others }`                                                 |
| GET    | `/api/products?q=term`                   | products matching every word of `q`                                              |
| GET    | `/api/products/:id`                      | `Product` or 404                                                                 |
| POST   | `/api/enquiries`                         | `202 { enquiryId }`; emails the sales inbox                                      |

Every error looks like `{ "error": { "code", "message", "details"? } }`.

### Health checks

```bash
curl -s localhost:8080/api/health/ready
# {"status":"ok","checks":{"productSource":{"status":"ok","critical":true,"durationMs":3},
#   "email":{"status":"ok","critical":false,"durationMs":12}},"uptimeSeconds":42}
```

- **Liveness** (`/live`) is what the container health check uses. It never checks dependencies, so a Fake Store outage can't cause healthy containers to be restarted.
- **Readiness** (`/ready`) is for load balancers and monitoring. The product source is critical (`503 unavailable`). Email is non-critical (`200 degraded`: browsing works, enquiries don't). Each check is time-limited (`HEALTH_CHECK_TIMEOUT_MS`), and the SMTP check is cached for 30s.
- Try a degraded state: `docker compose stop mailpit`, then call `/ready` again.

## Common changes

- **Change the featured / top rated products:** edit `apps/api/data/featured.json`. `home` must list exactly 5 ids, and `categories.<slug>` is optional per category. Restart the API. Invalid config fails at startup with a clear message.
- **Rebrand:** edit the token values in `apps/web/src/styles/theme.css`.
- **Use a real email provider:** set `NODE_ENV=production`, `SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM` and `SALES_INBOX` (e.g. AWS SES SMTP credentials). In production, the API refuses to start with a dev mail host or without credentials.
- **Swap the product source:** implement `ProductSource` (`apps/api/src/adapters/product-source/product-source.ts`), then add a case to `buildProductSource` in `composition.ts` and a value to `PRODUCT_SOURCE`.

## Time spent

**About 1h55m in total** (17:30 → 19:25 on 26 Nov 2026), within the 2–3 hour time-box. Everything was done in one continuous session directing Claude Code. Timings come from the session and the commit timestamps. Building and testing were interleaved (tests were written alongside code), so the split is approximate.

| Phase     | Time    | What                                                                                                                                                                                                 |
| --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planning  | ~40 min | Read the brief, made the architecture decisions (stack, curation, email, styling, auth, components), wrote `PLAN.md`/`DECISIONS.md`, set up the repo                                                 |
| Building  | ~40 min | Shared contract, API, web app, Docker; then the UI redesign ("Showroom"), enquiry modal, category imagery, loading states, search relevance and health checks after hands-on review                  |
| Testing   | ~20 min | 107 automated tests; deliberately breaking code to prove the tests catch it; browser walkthroughs; fresh-clone `docker compose` run; health checks exercised with dependencies stopped and restarted |
| Reviewing | ~15 min | Hands-on review that drove the UI, search and health changes; auditing AI output (which found the unwritten `DECISIONS.md` sections); docs and PR                                                    |

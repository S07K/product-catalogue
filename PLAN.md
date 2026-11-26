# Product Catalogue PoC — Plan & Roadmap

> Living spec used to direct the AI tools. Referenced from `AI_USAGE.md`.
> Started: 2026-11-26. Time-box: 2–3 h (log actual time in README).

## 1. Goals

- A working catalogue the owner can click through: browse, search, view a product, enquire.
- A foundation that is built to last, not a throwaway prototype. The brief names three things that **will change**: the product data source, the look and feel, and the email provider. Each one sits behind its own seam.
- Clear boundaries: **web ⇄ API ⇄ ProductSource / FeaturedRepository / EmailSender**.
- Input validated where it enters (zod), one central error handler, and the basic security measures in place.
- The critical path is tested, with fakes plugged in at the adapter seams.
- Every gap in the acceptance criteria gets one line in `DECISIONS.md`.

## 2. Stack (decided)

| Layer          | Choice                                                          | One-line defence                                                                                                                                      |
| -------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client         | React + Vite + TypeScript                                       | A plain SPA keeps the client/backend boundary obvious, and Vite has fast dev and build                                                                |
| Routing / data | React Router, TanStack Query                                    | Standard tools; Query gives caching plus loading and error states without hand-rolled hooks                                                           |
| Styling        | Tailwind v4 with **semantic design tokens** (`@theme` CSS vars) | A rebrand means editing `theme.css`; components use `bg-surface` and `text-brand`, never `bg-blue-600`                                                |
| UI components  | Own small kit in `components/ui` (no library)                   | Avoids a library design language fighting the coming custom brand (DECISIONS D6)                                                                      |
| Backend        | Node.js + **Express 5** + TypeScript                            | Familiar and minimal; Express 5 forwards async errors to the error handler natively                                                                   |
| Contract       | `packages/shared` with **zod** schemas + inferred types         | One source of truth for request/response shapes, validated on both sides                                                                              |
| Email          | nodemailer → **Mailpit** (local SMTP catcher)                   | A real email lands in a real inbox UI at `localhost:8025` with no accounts; switching to SES is just a new adapter                                    |
| Tests          | Vitest + Supertest (API), Vitest + RTL + MSW (web)              | One test runner across the repo                                                                                                                       |
| Run            | `docker compose up` (web via nginx, api, mailpit)               | Meets the "under 10 minutes, one or two commands" requirement; the Docker images can also run on ECS Fargate or App Runner, so they're AWS-compatible |

**Rejected:** Next.js, because it blurs the frontend/backend boundary that lets each side change on its own. NestJS, because it's too much ceremony for the time-box.

## 3. Architecture

```
┌────────────── apps/web (React SPA) ──────────────┐
│ pages → hooks (TanStack Query) → api/client.ts   │  only knows OUR API + shared types
└───────────────────────┬──────────────────────────┘
                        │ HTTP /api/*  (nginx proxy → same origin, no CORS in prod)
┌───────────────────────▼──────────── apps/api (Express) ─────────────────────┐
│ routes (zod validate) → services (CatalogService, EnquiryService)           │
│                              │                   │                          │
│        ┌─────────────────────┼───────────┐       │                          │
│   ProductSource       FeaturedRepository      EmailSender   ← interfaces    │
│   ├ FakeStoreProductSource   ├ JsonFileFeatured   ├ SmtpEmailSender (Mailpit)│
│   ├ FixtureProductSource     │  (data/featured.json) ├ ConsoleEmailSender    │
│   └ CachingProductSource (TTL decorator)          └ (future) SesEmailSender │
└──────────────────────────────────────────────────────────────────────────────┘
```

Key ideas:

- **Anti-corruption layer:** `FakeStoreProductSource` maps Fake Store's shape into **our** `Product` domain type: string `id`, `price` as `{ amountCents, currency }`, a category `slug`, `imageUrl`, and `rating`. Fake Store fields never get past the adapter.
- **Composition root:** `createApp(deps)` takes its adapters as arguments. `server.ts` wires the real ones from env, and tests pass in fakes. There's no DI framework.
- **Config:** env is parsed by zod at startup, so the app fails fast with a clear message.

## 4. API contract (v1)

| Method | Path                             | Returns                                      | Notes                                             |
| ------ | -------------------------------- | -------------------------------------------- | ------------------------------------------------- |
| GET    | `/api/health`                    | `{status}`                                   | for compose/ECS health checks                     |
| GET    | `/api/categories`                | `Category[]`                                 | `{slug, name}`                                    |
| GET    | `/api/products/featured`         | `Product[]` (5)                              | from `featured.json` → `home`                     |
| GET    | `/api/categories/:slug/products` | `{ topRated: Product[], others: Product[] }` | curated IDs for category, else fallback by rating |
| GET    | `/api/products?q=term`           | `Product[]`                                  | q: trimmed, 1–100 chars, else 400                 |
| GET    | `/api/products/:id`              | `Product`                                    | 404 if unknown                                    |
| POST   | `/api/enquiries`                 | `202 {enquiryId}`                            | body validated by shared zod schema               |

Errors always come back as `{ error: { code, message, details? } }` from one central handler. Upstream Fake Store failures become a 502, and an email failure on enquiry also becomes a 502, so the user never sees a false "Thank you".

## 5. Frontend routes

`/` home (5 featured) · `/category/:slug` (top rated + others) · `/search?q=` · `/product/:id` (details + **Enquire** button → form) · thank-you state after submit.
The header has a search bar and category links on every page. Search lives in the URL, so results can be bookmarked and shared.

## 6. Roadmap (time-boxed)

Commit after each step on branch `feat/product-catalogue`. Write tests **alongside** each step, not at the end.

| #   | Step                                                                                                                         | Est. | Done when                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------- |
| 0   | `git init`, npm workspaces, TS/ESLint/Prettier, `CLAUDE.md`, `.env.example`, compose skeleton                                | 15m  | `npm run lint && npm test` green on empty apps                          |
| 1   | `packages/shared`: zod schemas (Product, Category, EnquiryInput, error shape)                                                | 10m  | types imported by both apps                                             |
| 2   | API catalogue: ProductSource + FakeStore mapper + cache + fixture, FeaturedRepository, CatalogService, routes, error handler | 45m  | Supertest: featured=5, category split, search filter, 404, upstream 502 |
| 3   | API enquiry: EnquiryService, EmailSender + SMTP/console adapters, HTML-escaped template, rate limit, honeypot                | 25m  | Supertest: 400 invalid, 202 + sender called, 502 on sender failure      |
| 4   | Web: layout + tokens, Home, Category, Search, Product, Enquiry form + thank you, loading/error/empty states                  | 50m  | RTL+MSW: home renders 5, search submits, enquiry validation + thank you |
| 5   | Docker: api + web(nginx) + mailpit; README run instructions; test from clean clone                                           | 15m  | fresh clone → `docker compose up` → email visible in Mailpit            |
| 6   | Docs: DECISIONS.md, AI_USAGE.md, time spent, PR description                                                                  | 20m  | PR open into `main`                                                     |

**Stretch goals (only if within time; otherwise they go under "next day"):** one Playwright e2e happy path, and GitHub Actions CI running lint and tests.

## 7. Security & quality basics checklist

- [x] zod validation on every input (params, query, body); body size limit (`express.json({limit:'10kb'})`)
- [x] `helmet`; CORS restricted to `WEB_ORIGIN` for dev
- [x] `express-rate-limit` on `POST /api/enquiries`; honeypot field
- [x] HTML-escape user input in the email template; `replyTo` = customer and `from` = system address (prevents header spoofing)
- [x] No stack traces in responses; structured logging (pino)
- [x] No secrets committed; `.env.example` only; the app runs with defaults when there's no `.env`
- [x] Outbound fetch timeout (AbortSignal.timeout) on Fake Store calls

## 8. Defaults chosen without asking (veto any of these)

1. Enquiries are **not persisted**; email is the only record. Next step: DB + outbox/queue (SQS) for retries.
2. No confirmation email to the customer; the AC only mentions the sales inbox.
3. Search matches **title, description and category**, case-insensitive substring, and runs server-side over the cached catalogue. Fake Store has no search endpoint, and with 20 products fetch-and-filter is fine. At scale, search moves behind `ProductSource.search()` (OpenSearch/Algolia).
4. Category "top rated": use curated IDs from `featured.json` → `categories[slug]` when they're set; otherwise fall back to the top 3 by Fake Store rating. Everything else goes into "others".
5. `PRODUCT_SOURCE=fakestore|fixture`. A bundled fixture lets the app run offline or if Fake Store rate-limits, and it shows the seam working.
6. No auth (see DECISIONS D5), cart or pagination. They are out of scope for the ACs and recorded as cuts.
7. The enquiry form has name, email, phone (optional) and message (optional). The product is implied by the page.

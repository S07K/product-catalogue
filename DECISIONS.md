# Decisions & Assumptions

> Kept up to date while building. Each entry says **what** was decided, **why**, and the **trade-off**.

## Architecture decisions

### D1. React (Vite, TS) SPA + Node.js (Express 5, TS) API in an npm-workspaces monorepo

- **Why:** The product data source, look and feel, and email provider are all expected to change, so frontend, backend and data source need clear boundaries. Two separate apps plus a `shared` contract package make that boundary explicit. Express is familiar and minimal, and Express 5 handles async errors natively.
- **Trade-off:** Express needs more manual wiring (validation, error handling) than Fastify or NestJS. Zod and a central error handler cover that.
- **Rejected:** Next.js, because it blurs client and server. NestJS, because the ceremony doesn't fit a 2–3 h PoC.

### D2. "Top rated" products are curated in a backend config file (`apps/api/data/featured.json`)

- **Why:** The AC says _"GIVEN I have chosen 5 products"_. That's curation by the owner, not a ranking algorithm. A versioned JSON file is the simplest honest version of "chosen": it's reviewable in Git and needs no admin UI or auth.
- **Seam:** It's read through a `FeaturedRepository` interface. Replacing it with a CMS, a DB table or an admin screen changes only the adapter.
- **Category page:** It uses curated IDs for that category if they're defined. Otherwise it falls back to the top 3 by Fake Store `rating.rate`. All remaining products in the category are shown as "additional products".
- **Trade-off:** Changing the selection needs a config change and a redeploy or restart. That's acceptable for a PoC with one owner.
- **Validation:** IDs in the file that don't exist in the current source are skipped and logged, never a crash. A source swap can invalidate IDs.

### D3. Enquiry email goes through an `EmailSender` interface; locally it's SMTP → Mailpit (in docker compose)

- **Why:** The AC requires that "the sales inbox will receive an email". Mailpit gives the reviewer a real inbox UI (`http://localhost:8025`) with no accounts and no paid services, which satisfies both constraints.
- **Mailpit is development-only.** It exists only in `docker-compose.yml` so the reviewer has a local inbox. Production deployments don't use compose, and the app code has no Mailpit-specific logic.
- **Provider swap is configuration, not code:**
  - `EnquiryService` depends only on the `EmailSender` interface (`send(message): Promise<void>`).
  - `EMAIL_PROVIDER` selects the adapter at the composition root: `smtp` (default) or `console`. A future native-API adapter such as `ses` is one new file plus one line in the factory.
  - The `smtp` adapter is provider-agnostic. SES, SendGrid and Postmark all expose SMTP, so going to production with any of them is just `SMTP_HOST/PORT/USER/PASS` + `EMAIL_FROM` + `SALES_INBOX`.
  - **Production guard:** with `NODE_ENV=production`, config validation refuses to start if the SMTP host is `mailpit`/`localhost` or credentials are missing. A dev inbox can't reach prod by accident.
- **Failure handling:** If sending fails, the API returns 502 and the UI shows an error. A "Thank you" only appears after a confirmed send.
- **Trade-off:** It's synchronous send with no retry queue. Next step: persist the enquiry plus an outbox or SQS so a provider outage doesn't lose leads.

### D4. Tailwind CSS v4 with centralised semantic design tokens

- **Why:** The look and feel will change, since creative work is still in progress. Brand values (colour, type, radius, spacing) live only in `theme.css` as `@theme` CSS variables. Components use semantic names (`bg-surface`, `text-brand`, `rounded-card`), so a rebrand edits one file.
- **Trade-off:** Utility classes can scatter design decisions. A lint/review rule bans raw palette classes (e.g. `bg-blue-600`) in components.

### D4a. Visual direction: "Showroom" (placeholder until the creative work lands)

- **What:** Products sit on soft coloured plates, one colour per category. The home page's hero _is_ the five top-rated products (a spotlight plus four), not a slogan banner. Bricolage Grotesque for headings, Instrument Sans for body, on a 1.25 type scale.
- **Data-source agnostic:** A category's plate colour comes from a stable hash of its slug onto the theme's plate tokens (`lib/plate.ts`). No Fake Store category names are hard-coded, so any future source's categories get colours automatically.
- **Product photos:** `mix-blend-multiply` lets white photo backgrounds take on the plate colour.
- **Category images:** `GET /api/categories` returns each category's product count and the image of its highest-rated product (A12). The API decides what represents a category, so the UI stays source-agnostic.
- **Loading:** shimmer skeletons are shaped like the real layout (tiles, product details, category cards), and product photos shimmer on their plate until the image has actually downloaded. On slow connections images arrive well after the JSON.
- **Logo:** a placeholder SVG mark (a bag on the brand colour), coloured from theme tokens so a rebrand recolours it.
- **Fonts are self-hosted** via `@fontsource` (bundled at build time). There are no third-party font requests, so the CSP stays `'self'` and no visitor data goes to a font CDN.
- **This was also the rebrand test for D4:** the whole restyle changed `theme.css`, two new components and class names in pages. No logic or tests changed, apart from one heading name.

### D5. No authentication in the MVP

- **Why:** No acceptance criterion involves a signed-in actor. Customers browse and enquire anonymously, and requiring an account before an enquiry adds friction to the main conversion flow. The owner's curation of featured products is handled by config (D2).
- **Instead:** The time goes into what makes the MVP usable: loading, error and empty states, form validation, responsive layout and accessibility.
- **Next step:** Admin authentication (e.g. AWS Cognito) once the owner needs a UI to curate featured products. It slots in as a new `FeaturedRepository` implementation plus protected admin routes.

### D6. Own small UI kit, no component library (enquiry in a native `<dialog>`)

- **Why:** The look and feel is being designed by a creative agency. A full library (MUI, Chakra) brings its own design language that would fight a custom brand. About five primitives (`Button`, `Input`, `TextArea`, `Card`, `ProductTile`) in `components/ui`, styled only with design tokens, is all the ACs need.
- **Accessibility:** We use semantic HTML (`<button>`, `<label for>`, `<form>`), `aria-invalid` + `aria-describedby` for field errors, and visible focus states.
- **Enquiry modal (revised after UI review):** The form first sat inline on the product page to avoid hand-rolled focus trapping. It now opens in the **native `<dialog>` element** via `showModal()`. The browser provides focus trapping, Esc to close, an inert background, top-layer stacking and focus return to the Enquire button, so we get a real modal with no library and no custom focus trap. Closing is blocked while a submission is in flight. The dialog is mounted fresh on each open so state never leaks between enquiries.
- **Trade-off:** If modals, dropdowns or comboboxes arrive later, we'd add a headless primitive library (Radix or React Aria) rather than build those widgets by hand.

## Assumptions (where ACs were unclear)

| #   | Gap in the ACs                             | Assumption                                                                                                                                                                                                                      |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | How "top rated" is chosen                  | The owner curates the products (D2). Home shows exactly 5, and the config is rejected at startup otherwise.                                                                                                                     |
| A2  | "Top rated" for a category                 | Uses the curated IDs for that category if configured. Otherwise the 3 highest by rating (ties broken by number of ratings). Everything else in the category is "additional products".                                           |
| A3  | What "text matching the search term" means | Case-insensitive. **Every word** of the query must appear in the title, description or category name, and apostrophes are ignored ("mens jacket" finds "Mens Cotton Jacket"). A blank or 100+ character query is rejected.      |
| A4  | Where search runs                          | Server-side, over the cached catalogue. Fake Store has no search endpoint, and with 20 products this is instant. A large catalogue would push search down to the source (e.g. OpenSearch) behind the same `ProductSource` port. |
| A5  | Currency                                   | Fake Store has no currency, so prices are treated as AUD and stored as integer cents.                                                                                                                                           |
| A6  | Product images                             | Image URLs are static assets on Fake Store's CDN and load directly in the browser. The "no direct calls" constraint applies to product **data**, which always goes through our API.                                             |
| A7  | Enquiry form fields                        | Name and email are required; phone and message are optional. The product comes from the page and is re-resolved on the server, so the client can't tamper with product details in the email.                                    |
| A8  | Customer confirmation                      | Only the sales inbox gets an email (as the AC states). The customer sees an on-screen "Thank you" with a reference number.                                                                                                      |
| A9  | Persistence of enquiries                   | Not stored; the email is the record. See "next steps".                                                                                                                                                                          |
| A10 | Unknown product in an enquiry              | 404, and no email is sent.                                                                                                                                                                                                      |
| A11 | Fake Store quirk                           | Fake Store returns `200` with an empty body for unknown ids. The adapter maps that to "not found".                                                                                                                              |
| A12 | Category imagery                           | Fake Store categories have no images, so each category is represented by its highest-rated product's image (computed server-side).                                                                                              |

## Dropped / simplified requirements

| What                                       | Why                                                                                                                                                                                                                        |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin UI for choosing "top rated" products | Replaced by a validated, version-controlled `featured.json` (D2). Building an admin UI means adding auth and persistence, which is more than the time-box allows. The `FeaturedRepository` port is where it would plug in. |
| Authentication                             | No acceptance criterion needs it (D5).                                                                                                                                                                                     |
| Storing enquiries; retry if email fails    | The enquiry is emailed synchronously. If sending fails, the user is told to retry and no false "Thank you" is shown. A lead can't be silently lost, but there's no automatic retry yet.                                    |
| Pagination, sorting, filtering             | 20 products. The API shapes (`others` arrays, search results) can take a `page` param later without breaking clients.                                                                                                      |
| Search ranking and fuzzy matching          | Matches are returned in catalogue order. With this data size, exact word matching is predictable and easy to test.                                                                                                         |
| Infrastructure as code                     | Docker images are AWS-compatible (ECS Fargate or App Runner, with S3 + CloudFront for the SPA), but no CDK or Terraform is included. A reviewer only needs to run it locally.                                              |
| End-to-end browser tests (Playwright)      | The flow was verified manually in a browser against the Docker stack. Automated tests cover each acceptance criterion at the integration level (RTL + MSW, Supertest).                                                     |
| Customer confirmation email                | Not in the AC (A8).                                                                                                                                                                                                        |

## How the design grows beyond the PoC

- **New product source** (PIM, Shopify, own DB): implement `ProductSource`, add one case in `composition.ts`, and set `PRODUCT_SOURCE`. Services, routes, the web app and the tests don't change. The `CachingProductSource` decorator wraps any source. A second implementation (`FixtureProductSource`) already exists, which proves the seam works.
- **Larger catalogues:** move search and category filtering from in-memory into the source (e.g. `ProductSource.search()` backed by OpenSearch), and add pagination to the existing endpoints.
- **New look and feel:** replace the token values in `theme.css`. Because the default palette is removed, components can't hard-code colours. The "Showroom" restyle (D4a) already showed this works.
- **New email provider:** set SMTP credentials (SES, SendGrid, Postmark), or add a native API adapter behind `EmailSender`. The production config guard stops a dev mail host from going live.
- **Owner curation:** swap `JsonFileFeaturedRepository` for a DB-backed one and add an authenticated admin route (Cognito).
- **Reliable enquiries:** persist the enquiry, then publish to a queue (SQS) and send from a worker with retries (outbox pattern). `EnquiryService` is the only place that changes.
- **Contract safety:** the client validates every response against the shared schemas, so contract drift fails loudly in one place.
- **Scaling out:** the API is stateless except for the in-memory cache and rate-limit store. With several instances these move to Redis/ElastiCache. Both are already isolated behind a decorator or middleware.

## What I'd do next with another day

1. **Persist enquiries plus an outbox/queue** (Postgres + SQS), with retries and a dead-letter queue. Losing a lead is the biggest business risk in the current design.
2. **CI pipeline** (GitHub Actions): `npm run check`, Docker builds, and a dependency audit on every PR.
3. **Playwright smoke test** against `docker compose` covering the enquiry happy path through to Mailpit, plus checks that the dialog's focus trap and Esc work in a real browser.
4. **Admin curation** of featured products behind Cognito auth.
5. **Observability:** request IDs propagated into logs, metrics for enquiry success/failure and upstream latency, and alerting on email failures.
6. **IaC** (CDK): ECS Fargate API, S3 + CloudFront SPA, SES, Secrets Manager for SMTP credentials.
7. **Image handling:** proxy or cache product images through our CDN so the CSP can drop the broad `img-src https:`.

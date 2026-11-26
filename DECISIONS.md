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
- **Fonts are self-hosted** via `@fontsource` (bundled at build time). There are no third-party font requests, so the CSP stays `'self'` and no visitor data goes to a font CDN.
- **This was also the rebrand test for D4:** the whole restyle changed `theme.css`, two new components and class names in pages. No logic or tests changed, apart from one heading name.

### D5. No authentication in the MVP

- **Why:** No acceptance criterion involves a signed-in actor. Customers browse and enquire anonymously, and requiring an account before an enquiry adds friction to the main conversion flow. The owner's curation of featured products is handled by config (D2).
- **Instead:** The time goes into what makes the MVP usable: loading, error and empty states, form validation, responsive layout and accessibility.
- **Next step:** Admin authentication (e.g. AWS Cognito) once the owner needs a UI to curate featured products. It slots in as a new `FeaturedRepository` implementation plus protected admin routes.

### D6. Own small UI kit, no component library

- **Why:** The look and feel is being designed by a creative agency. A full library (MUI, Chakra) brings its own design language that would fight a custom brand. About five primitives (`Button`, `Input`, `TextArea`, `Card`, `ProductTile`) in `components/ui`, styled only with design tokens, is all the ACs need.
- **Accessibility:** We use semantic HTML (`<button>`, `<label for>`, `<form>`), `aria-invalid` + `aria-describedby` for field errors, and visible focus states. The enquiry form is a section on the product page, not a modal, so there's no focus-trap complexity.
- **Trade-off:** If modals, dropdowns or comboboxes arrive later, we'd add a headless primitive library (Radix or React Aria) rather than build those widgets by hand.

## Assumptions (where ACs were unclear)

_To be filled while building. See PLAN.md §8 for the initial list._

## Dropped / simplified requirements

_To be filled._

## How the design grows beyond the PoC

_To be filled._

## What I'd do next with another day

_To be filled._

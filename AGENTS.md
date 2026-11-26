# AGENTS.md

Tool-agnostic instructions for AI coding agents (Codex, Cursor, Copilot, Claude Code, …).

- **Architecture rules, conventions and testing expectations:** see [`CLAUDE.md`](./CLAUDE.md). They apply to every agent, not just Claude.
- **Spec and decisions:** [`PLAN.md`](./PLAN.md), [`DECISIONS.md`](./DECISIONS.md).

## Set up and verify (no accounts, API keys or `.env` needed)

Prefer Docker. Every setting has a working default.

```bash
docker compose up --build -d --wait        # web :8080, api (internal), mailpit :8025
curl -s localhost:8080/api/health/ready     # expect "status":"ok" (or "degraded" if email is down)
```

End-to-end check of the main flow (enquiry → sales inbox):

```bash
curl -s -X POST localhost:8080/api/enquiries -H 'content-type: application/json' \
  -d '{"productId":"1","name":"Agent Check","email":"agent@example.com"}'   # expect 202 {"enquiryId":...}
curl -s localhost:8025/api/v1/messages      # expect a message with Subject "New enquiry: ..."
```

Quality checks (Node.js 22+):

```bash
npm ci && npm run check                     # format, lint, typecheck, all tests
```

Fallbacks:

- Fake Store unreachable or rate-limited: `PRODUCT_SOURCE=fixture docker compose up --build -d --wait` (bundled data, works offline).
- Ports 8080/8025 busy: `WEB_PORT=8081 MAILPIT_UI_PORT=8026 docker compose up --build -d --wait`.
- No Docker: `npm ci`, then `EMAIL_PROVIDER=console npm run dev` (web on :5173; emails are logged instead of sent).

Tear down: `docker compose down`.

## Boundaries

- Don't create accounts, add API keys, or point email at a real provider. Local runs only need Mailpit.
- Don't commit `.env` files or secrets. Add new config to `.env.example` with a safe default.
- The web app must never call Fake Store directly. All product data goes through the API (ESLint enforces this).

# AI Usage

## Tools and models

- **Claude Code** (CLI), model **Claude Opus 5.5**: planning, scaffolding, implementation, tests and docs.

## Agent instruction files

- [`CLAUDE.md`](./CLAUDE.md): architecture rules, conventions and testing expectations the agent must follow.

## Plan / spec

- [`PLAN.md`](./PLAN.md): written before any code. It has the stack, architecture, API contract, roadmap and security checklist. The agent was directed step by step against it.

## Workflow

1. I gave the agent the challenge brief and had it propose a plan. **No code until the plan existed.**
2. I made each architecture decision myself from options the agent presented with trade-offs (stack, curation source, email transport, styling, auth, component library), and recorded them in `DECISIONS.md`.
3. Building happened in small steps with tests written alongside, reviewed and committed per step.

## Key prompts / moments

1. **Plan first, and ask before deciding architecture.** I told the agent to read the brief, write a roadmap, and stop to ask on every architecture decision instead of choosing silently. That produced D1–D6 in `DECISIONS.md`.
2. **Push back on login.** I asked whether skipping auth would make the MVP feel unusable. The agent argued that no AC has an authenticated actor and that usability comes from UX states, validation and accessibility. I agreed and recorded it as D5.
3. **Make the email provider genuinely swappable.** I asked that Mailpit be dev-only. That led to the `EMAIL_PROVIDER` switch, a provider-agnostic SMTP adapter, and a production guard that refuses Mailpit or localhost when `NODE_ENV=production`.

## Where the AI got it wrong (and how it was caught)

1. **Framework bias from tooling.** The environment's plugins defaulted to Next.js. A full-stack framework would blur the client/backend boundary the brief asks for, so I rejected it in favour of a separate SPA and API.
2. **"Latest" isn't always compatible.** The newest TypeScript (7.x) is outside typescript-eslint's supported range (`<6.1`). We caught it by checking peer dependencies before installing, and pinned TypeScript `~6.0.3`.
3. **Misread version output.** While writing `package.json`, the agent took dependency versions from the wrong lines of a batched `npm view` output (e.g. `@testing-library/jest-dom@^6` instead of `8`). We caught it by re-checking the versions before installing.

## Time spent

_See README._

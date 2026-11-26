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
4. **Tests that pass for the wrong reason.** All 56 AI-written API tests passed on the first run. To check they actually protect behaviour, I deliberately broke the code: removed HTML escaping, ignored the curated category list, and changed search from "every word" to "any word". The first two were caught. The search change was **not**, because the only multi-word test ("men's jacket") passed either way. I added a test where the two semantics differ ("gaming drive" must return nothing), and confirmed it fails against the broken code.
5. **Stale library knowledge that fails silently.** The agent configured MSW with `onUnhandledRequest: 'error'` (the v2 API). In MSW 3 the option is `onUnhandledFrame`. At runtime the unknown option was silently ignored, so tests would only have _warned_ about unmocked API calls instead of failing. Tests passed and only `tsc` caught it. After this, the agent checked unfamiliar major versions (React Router 8, MSW 3) against the docs and types bundled in `node_modules` rather than relying on memory.
6. **Tests weakened by the page's fallback behaviour.** The "blank search does nothing" test asserted that no results heading appeared. That also passes if the app wrongly navigates to an empty search page. A deliberate mutation (removing the guard) exposed it, so the test now asserts the user stays on the home page.
7. **Things only a real run revealed.** Unit and integration tests were green, but running the Docker stack and clicking through in a browser found three issues the tests couldn't. (a) The nginx Content-Security-Policy was silently missing: a `location` with its own `add_header` drops server-level headers. Fixed with an included snippet, and the headers are verified on every route. (b) Tall product images stretched tiles to uneven heights. (c) After a failed submit, focus didn't move to the first invalid field. (c) is now covered by a test.

## Time spent

_See README._

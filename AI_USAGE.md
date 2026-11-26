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
4. **"The UI looks weak."** After the functional build I rejected the first UI as generic. Instead of patching styles, I had the agent diagnose why (system fonts, no type scale, every element the same white card, a slogan hero with no products, no category identity) and propose three directions with wireframes. I chose "Showroom". The agent then checked its plan against common generated-design defaults (e.g. warm cream backgrounds, identical card grids) before building, and verified the result with screenshots in a real browser.
5. **"I searched ring and got jackets."** Manual testing showed the AI's search returned 6 products for "ring", because it matched substrings ("spring", "wearing", "drawstring", "earrings"). I asked how search works in industry. The agent explained tokenisation, prefix matching and relevance ranking (as in OpenSearch and Algolia), then rewrote search as a small pure module with whole-word prefix matching and field-weighted ranking. The exact query I ran is now a regression test on the real catalogue data, and deliberately breaking the code (substring matching back in, ranking removed) confirmed the tests catch both.

## Where the AI got it wrong (and how it was caught)

1. **Framework bias from tooling.** The environment's plugins defaulted to Next.js. A full-stack framework would blur the client/backend boundary the brief asks for, so I rejected it in favour of a separate SPA and API.
2. **"Latest" isn't always compatible.** The newest TypeScript (7.x) is outside typescript-eslint's supported range (`<6.1`). We caught it by checking peer dependencies before installing, and pinned TypeScript `~6.0.3`.
3. **Misread version output.** While writing `package.json`, the agent took dependency versions from the wrong lines of a batched `npm view` output (e.g. `@testing-library/jest-dom@^6` instead of `8`). We caught it by re-checking the versions before installing.
4. **Tests that pass for the wrong reason.** All 56 AI-written API tests passed on the first run. To check they actually protect behaviour, I deliberately broke the code: removed HTML escaping, ignored the curated category list, and changed search from "every word" to "any word". The first two were caught. The search change was **not**, because the only multi-word test ("men's jacket") passed either way. I added a test where the two semantics differ ("gaming drive" must return nothing), and confirmed it fails against the broken code.
5. **Stale library knowledge that fails silently.** The agent configured MSW with `onUnhandledRequest: 'error'` (the v2 API). In MSW 3 the option is `onUnhandledFrame`. At runtime the unknown option was silently ignored, so tests would only have _warned_ about unmocked API calls instead of failing. Tests passed and only `tsc` caught it. After this, the agent checked unfamiliar major versions (React Router 8, MSW 3) against the docs and types bundled in `node_modules` rather than relying on memory.
6. **Tests weakened by the page's fallback behaviour.** The "blank search does nothing" test asserted that no results heading appeared. That also passes if the app wrongly navigates to an empty search page. A deliberate mutation (removing the guard) exposed it, so the test now asserts the user stays on the home page.
7. **Things only a real run revealed.** Unit and integration tests were green, but running the Docker stack and clicking through in a browser found three issues the tests couldn't. (a) The nginx Content-Security-Policy was silently missing: a `location` with its own `add_header` drops server-level headers. Fixed with an included snippet, and the headers are verified on every route. (b) Tall product images stretched tiles to uneven heights. (c) After a failed submit, focus didn't move to the first invalid field. (c) is now covered by a test.
8. **Scripted edits that silently did nothing (the most serious miss).** The agent sometimes edited files with Python `str.replace`. When the target text had already been reformatted by Prettier, the replace matched nothing and failed **silently**. Lint first exposed it in code ("`Skeleton` is defined but never used"). An audit of every scripted doc edit then found something worse: four whole sections of `DECISIONS.md` (assumptions, cuts, growth path, next steps) had never been written, even though the agent had reported them done, and the placeholder version was already committed. The sections were rewritten with an edit tool that fails loudly on mismatch, and scripted edits now assert their target exists. Lesson: verify the artifact itself, not the success of the command that changed it.
9. **A latent deploy bug the health checks exposed.** While testing readiness on the live stack, I restarted the API container and every request through nginx returned 502, even though the API was healthy. The AI-written nginx config used a literal `proxy_pass http://api:3000`, which resolves the hostname once at startup and keeps the old IP after the container is replaced. That would hit on every deploy or crash restart. Fixed by resolving at runtime through Docker's DNS (`resolver` plus a variable upstream), then verified by restarting the API under load: healthy → email down (degraded) → product source down (503, container still healthy, no restart loop) → recovered.

## Time spent

See the [README](./README.md#time-spent): about 1h55m in total, in one session.

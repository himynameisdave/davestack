# CLAUDE.md

Guidance for coding agents working in this repo. `AGENTS.md` points here — this file is the single
source of truth.

---

## Part 1 — PROJECT CONTEXT (fill me in)

> This repo is the **davestack** template. Replace this block with a description of **your** app.
> An agent reads this first to understand what it's building.

- **What the app does:** _<one or two sentences — the product in plain language>_
- **Primary user / who it's for:** _<who signs in and why>_
- **Core domain models:** _<the main Prisma models you'll add beyond auth, e.g. Project, Invoice>_
- **Key flows / pages:** _<the handful of screens that matter most>_
- **Anything unusual an agent must know:** _<external services, business rules, gotchas>_

Until this is filled in, treat the app as a generic authenticated SvelteKit starter.

---

## Part 2 — STACK CONVENTIONS

Terse rules transcribed from how this repo actually works. Follow them exactly.

### Runtime & tooling

- **Bun only.** No `npm` / `npx` / `yarn`. Use `bun run <script>`, `bun install`, `bunx`.
- Scripts live in `package.json`. The real ones: `dev`, `build`, `preview`, `check`, `lint`,
  `lint:fix`, `format`, `format:check`, `test`, `test:e2e`, `test:e2e:ui`, `db:push`, `db:migrate`,
  `db:studio`, `db:seed`, `db:reset`.
- **Lint/format is oxlint + oxfmt**, not ESLint/Prettier. `bun run lint` runs
  `oxlint --deny-warnings --type-aware`; `bun run format` / `format:check` run oxfmt. oxfmt owns
  everything incl. `.svelte`, `.md`, `.json`. Indentation is **spaces** (2), single quotes,
  printWidth 100 (`.oxfmtrc.json`).

### Svelte 5 — runes only

- Use `$state` / `$props` / `$derived` / `$effect`. **No `export let`**, no `$:` reactive
  statements, no legacy stores (`writable`/`readable`). Props: `let { data, children } = $props();`.

### Validation — zod is first-class

- **All** env, form, and action input is validated with zod. Never hand-roll validation.
- Form/action schemas live in `src/lib/schemas/` (e.g. `src/lib/schemas/auth.ts`). In an action:
  `const parsed = schema.safeParse({...}); if (!parsed.success) return fail(400, {...});`.
- `src/lib/server/form.ts` `field(data, name)` reads a FormData value as a clean string for zod.

### Environment

- **All env goes through `src/lib/server/env.ts`** (zod-validated at boot). Never read
  `process.env` ad hoc in app code.
- Import the derived helpers: `features` (`.google` / `.resend` / `.umami` presence booleans) and
  `isTestMode`. Production hardening lives in `assertProductionReady()` (called from
  `hooks.server.ts` behind `!building`).
- A fresh clone boots with **zero credentials** — env has local-dev defaults. Missing optional
  integrations degrade (e.g. no Google button), never crash.

### Prisma 7

- Schema: `prisma/schema.prisma`, `prisma-client` generator → **`src/generated/prisma`**
  (gitignored). After clone (or any schema change) run `bun run db:push` (or `db:migrate`) which
  runs `prisma generate` — the client won't exist otherwise, and `check`/`build` will fail.
- Never edit generated code. Client singleton is `src/lib/server/db.ts` (import `prisma` from there).
- Add app models below the `─── App tables ───` marker in the schema.

### Auth — modular Better Auth

- Assembled in `src/lib/server/auth/index.ts`. **One method per file** in `src/lib/server/auth/`:
  `email-password.ts`, `magic-link.ts`, `google.ts` (env-conditional), `passkey.ts`.
- **Removing a method = delete its file + drop its import/reference in `index.ts`** (and the client
  plugin in `src/lib/client/auth.ts` for magic-link/passkey). Each file's header documents this.
- **Email senders in `src/lib/server/email/` have STABLE signatures** auth depends on:
  `sendVerificationEmail(to, url)`, `sendMagicLinkEmail(to, url)`, `sendResetPasswordEmail(to, url)`.
  Don't change their shape.

### Route groups & guards

- `src/routes/(marketing)/` — **public**, no guard.
- `src/routes/(auth)/` — login/signup/etc; `(auth)/+layout.server.ts` **redirects to `/home` when
  already authed**.
- `src/routes/(app)/` — **server-guarded**; `(app)/+layout.server.ts` redirects logged-out users to
  `/login?next=…`.
- `src/routes/(admin)/admin/` — `+layout.server.ts` throws **404** (not 403) unless
  `locals.user?.isAdmin`, so the area's existence stays hidden.
- Guards are **server-side only** (`+layout.server.ts` / `+page.server.ts`), never client code.

### Extension points

- **Admin dashboard `MODEL_CARDS`** in `src/routes/(admin)/admin/+page.server.ts` — append
  `{ key, label, count: () => prisma.<model>.count() }` to add a stat card. It's read-only: NO
  forms/actions/mutations on the admin dashboard.
- **Modular auth files** in `src/lib/server/auth/` — add/remove a login method as one file.

### Commits — emoji format (NOT conventional commits)

- `{EMOJI} {short imperative}`, ≤ 72 chars. E.g. `🔐 add passkey management to account page`.
  Multi-line body only for large changes. The commit-msg hook enforces emoji-first.

### The self-verify loop (run before you call a change done)

```
bun run lint && bun run check && bun run test && bun run test:e2e
```

Requires Docker Postgres up (dev `:5432`, test `:5433`) — `docker compose up -d`. `test:e2e`
builds + previews on `:4173` against the test DB.

### e2e is required

- **Any change that touches auth or adds/changes a route ships with a Playwright spec.** New model →
  extend/add a spec. New guarded route → spec that asserts the guard. No exceptions for
  auth-affecting or route-adding changes.

### e2e fixtures — `tests/e2e/fixtures.ts`

The building blocks every spec composes (see the `davestack-e2e` skill for the full house style):

- `createUser(opts?)` — insert a throwaway verified user (User + credential Account) directly.
- `loginAs(page, { email, password })` — sign the browser in via the real `/api/auth/sign-in/email`.
- `withVirtualAuthenticator(page)` — attach a CDP WebAuthn virtual authenticator for passkey specs
  (Chromium only).
- `getLatestEmail(request, to)` / `extractLink(email)` / `clearMailbox(request)` — poll the in-memory
  test mailbox for verification / magic-link tokens (`TEST_MODE` only).

### Slash commands

- `/new-model` — scaffold a Prisma model end-to-end (schema → migration → admin card → e2e).
- `/new-route` — scaffold a route in the right group with its guard + e2e.
- `/ship` — pre-PR flow: self-verify loop → confirm e2e exists → emoji commit → `gh pr create`.

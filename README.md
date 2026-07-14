# davestack

A batteries-included [SvelteKit](https://svelte.dev/docs/kit) template for spinning up new web
apps in minutes — and for coding agents to work in productively. It ships with authentication
(password, magic link, Google, passkeys), a read-only admin dashboard, transactional email,
analytics, an end-to-end test suite, git hooks, CI, and agent tooling already wired up.

The guiding promise: **a fresh clone runs with zero credentials.** Every optional integration
degrades gracefully, so `bun install` → up-and-running is a matter of minutes, and you add real
secrets only for the features you actually turn on.

> **Using this as a template?** Click **Use this template** on GitHub, then run
> [`bun run setup`](#first-run-setup).

## Stack

| Concern       | Choice                                                       |
| ------------- | ------------------------------------------------------------ |
| Runtime / PM  | [Bun](https://bun.sh) (never npm/npx/yarn)                   |
| Framework     | SvelteKit + Svelte 5 (runes only)                            |
| Language      | TypeScript                                                   |
| Styling       | Tailwind CSS v4 + [shadcn-svelte](https://shadcn-svelte.com) |
| ORM / DB      | Prisma 7 + PostgreSQL                                        |
| Auth          | [Better Auth](https://better-auth.com)                       |
| Email         | [Resend](https://resend.com)                                 |
| Analytics     | [Umami](https://umami.is) Cloud                              |
| Lint / format | [oxlint](https://oxc.rs) + [oxfmt](https://oxc.rs) (strict)  |
| Tests         | Vitest (unit) + Playwright (e2e)                             |
| Deploy        | Railway (adapter-node + Dockerfile); Netlify documented too  |

## Quick start

Requires [Bun](https://bun.sh) ≥ 1.3 and Docker (for local Postgres).

```bash
bun install                 # installs deps (and git hooks via the prepare step)
docker compose up -d db     # local Postgres on :5432
bun run db:push             # apply the schema
bun run db:seed             # create the seed users
bun run dev                 # http://localhost:5173
```

That's it — no credentials required. Google/Resend/Umami are all optional and the app runs fine
without them (the Google button simply doesn't render, emails print to your terminal, analytics
stay off).

Prefer a guided path? [`bun run setup`](#first-run-setup) does the rebrand + secret + database steps
for you.

### Seed accounts

`bun run db:seed` creates two users you can sign in with immediately:

| Email               | Password      | Role  |
| ------------------- | ------------- | ----- |
| `admin@example.com` | `password123` | admin |
| `user@example.com`  | `password123` | user  |

## First-run setup

After creating a repo from this template, run the interactive setup script:

```bash
bun run setup
```

It will:

1. Ask for a **project name** and rewrite the template branding — `package.json` `name`, the
   document `<title>`, the PWA manifest, and the visible wordmark across the marketing/auth/app
   pages.
2. Create **`.env.local`** with a freshly generated `BETTER_AUTH_SECRET` (it never overwrites an
   existing `.env.local` without asking).
3. Optionally **start Postgres, push the schema, and seed** (`docker compose up -d db` →
   `db:push` → `db:seed`).
4. Verify the **git hooks** were installed (`bun install` runs the `prepare` step that installs
   Husky; the script warns if `.husky/_` is missing).

The script is idempotent and safe to re-run. If you'd rather do it by hand, everything it does is
described in this README.

Then, before you ship:

- **Fill in `CLAUDE.md`** — replace the `PROJECT CONTEXT` stub with what your app actually is. Coding
  agents read it first.
- **Enable branch protection** on `main`, requiring the CI status checks to pass.

## Environment variables

Every variable is documented in [`.env.example`](./.env.example). Copy it to `.env.local` and fill
in only what you need (or let `bun run setup` do it):

```bash
cp .env.example .env.local
```

Validation lives in [`src/lib/server/env.ts`](./src/lib/server/env.ts) (zod, validated once at boot).
Required variables have local-dev defaults, so a fresh clone boots with zero config; **production**
boot fails fast if `BETTER_AUTH_SECRET` or `DATABASE_URL` is still a placeholder.

| Variable                  | Required?          | What it's for                                                           |
| ------------------------- | ------------------ | ----------------------------------------------------------------------- |
| `DATABASE_URL`            | prod (dev default) | Pooled Postgres connection used by the app at runtime.                  |
| `DIRECT_DATABASE_URL`     | optional           | Non-pooled URL for Prisma migrations (differs from pooled on Neon/etc). |
| `BETTER_AUTH_SECRET`      | prod (dev default) | Session/token signing secret. Generate: `openssl rand -base64 32`.      |
| `BETTER_AUTH_URL`         | yes                | Canonical app origin. Passkeys derive their RP ID + origin from it.     |
| `PASSKEY_RP_ID`           | optional           | Override the passkey RP ID for multi-subdomain setups.                  |
| `GOOGLE_CLIENT_ID`        | optional           | Google OAuth — both id + secret enable the Google button.               |
| `GOOGLE_CLIENT_SECRET`    | optional           | Google OAuth client secret.                                             |
| `RESEND_API_KEY`          | optional           | Send real email via Resend. Absent → emails print to the console.       |
| `RESEND_FROM_EMAIL`       | optional           | From address for outbound mail.                                         |
| `PUBLIC_UMAMI_WEBSITE_ID` | optional           | Umami site id. Set → analytics load (production only).                  |
| `PUBLIC_UMAMI_SRC`        | optional           | Umami script URL (defaults to Umami Cloud).                             |

## Authentication

Four login methods, all on by default and all working out of the box:

1. **Email + password** (with email verification)
2. **Email magic link**
3. **Google OAuth** — renders only when `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` are set
4. **Passkeys** (WebAuthn) — works on `localhost` with zero config

Better Auth is assembled in [`src/lib/server/auth/index.ts`](./src/lib/server/auth/index.ts), with
**one file per method** in the same folder. The browser-side client is
[`src/lib/client/auth.ts`](./src/lib/client/auth.ts).

### Removing an auth method

Each method is isolated so removing one is a small diff:

| Method         | Delete file              | Then remove from `auth/index.ts`        | Client (`src/lib/client/auth.ts`) |
| -------------- | ------------------------ | --------------------------------------- | --------------------------------- |
| Email+password | `auth/email-password.ts` | `emailAndPassword`, `emailVerification` | —                                 |
| Magic link     | `auth/magic-link.ts`     | `magicLinkPlugin` from `plugins`        | drop `magicLinkClient()`          |
| Google         | `auth/google.ts`         | `socialProviders`                       | —                                 |
| Passkeys       | `auth/passkey.ts`        | `passkeyPlugin` from `plugins`          | drop `passkeyClient()`            |

Then remove the corresponding UI on the login / account pages, and (for passkeys) the `Passkey`
model from `prisma/schema.prisma` + a migration. Each method file's header repeats this recipe.

### Enabling Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** →
   **Credentials** → **Create Credentials** → **OAuth client ID** → **Web application**.
2. Add an **Authorized redirect URI**: `{BETTER_AUTH_URL}/api/auth/callback/google`
   (e.g. `http://localhost:5173/api/auth/callback/google` for local dev).
3. Put the client id + secret in `.env.local` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

The Google button appears automatically once both are set — no code changes.

### Passkey management

Signed-in users manage passkeys from the **account page** (`/account`): list registered credentials,
add a new one (you're prompted for a friendly name — nothing is hardcoded), rename, and revoke. Both
platform authenticators (Face ID / Touch ID / Windows Hello) and roaming security keys are accepted.

> ### ⚠️ Passkeys across environments
>
> **This is the thing that most often breaks passkeys in a new deploy — read it before shipping.**
>
> Passkeys are bound to an **origin** and a **Relying Party ID (RP ID)**. davestack derives both
> from `BETTER_AUTH_URL` (`rpID = PASSKEY_RP_ID ?? new URL(BETTER_AUTH_URL).hostname`, see
> [`src/lib/server/auth/passkey.ts`](./src/lib/server/auth/passkey.ts)), so you normally set just
> one variable:
>
> | Environment     | Set `BETTER_AUTH_URL` to            | RP ID (derived)             |
> | --------------- | ----------------------------------- | --------------------------- |
> | Local dev       | `http://localhost:5173`             | `localhost`                 |
> | Railway preview | `https://<your-app>.up.railway.app` | `<your-app>.up.railway.app` |
> | Custom domain   | `https://app.yourdomain.com`        | `app.yourdomain.com`        |
>
> Rules to remember:
>
> - `BETTER_AUTH_URL` **must** match the origin the browser actually loads. A mismatch makes every
>   passkey ceremony fail. On Railway, set it to the deployed URL (preview or production); locally it
>   defaults to `http://localhost:5173`, which needs no config.
> - Passkeys are **origin-bound**: a credential registered on one domain will not work on another.
>   **Changing your domain orphans existing passkeys** — users must re-register on the new origin.
> - For a single app spanning **multiple subdomains**, set `PASSKEY_RP_ID` to the shared parent
>   domain (e.g. `yourdomain.com`) to override the derived RP ID so one credential works across them.

### Account recovery

A user whose only credential is a passkey (and who loses their device) is not locked out: they can
request a **magic link** to their verified email and, once in, add a new passkey from the account
page. The methods compose — no method traps a user.

## Admin dashboard

`/admin` is a **read-only** dashboard, guarded in
[`(admin)/admin/+layout.server.ts`](<./src/routes/(admin)/admin/+layout.server.ts>): non-admins get a
**404** (not 403), so the area's existence stays hidden. The admin link only appears in the user menu
for `isAdmin` users. Set `isAdmin` on a user row (the seed marks `admin@example.com`).

It shows model counts, recent signups (with derived auth-method chips), session counts, and app meta.

**Extension point — `MODEL_CARDS`:** to add a stat card, append one entry to the `MODEL_CARDS` array
in [`(admin)/admin/+page.server.ts`](<./src/routes/(admin)/admin/+page.server.ts>):

```ts
{ key: 'project', label: 'Projects', count: () => prisma.project.count() }
```

The dashboard is deliberately read-only — no forms, actions, or mutations live here.

## Email

Transactional email lives in [`src/lib/server/email/`](./src/lib/server/email). The transport is
chosen automatically:

- **`TEST_MODE`** → an in-memory mailbox (used by e2e to read verification/magic-link tokens).
- **Production with `RESEND_API_KEY`** → sent via Resend.
- **Otherwise (dev)** → pretty-printed to the console, links and all.

Senders have **stable signatures** the auth layer depends on: `sendVerificationEmail(to, url)`,
`sendMagicLinkEmail(to, url)`, `sendResetPasswordEmail(to, url)`. Templates are neutral and
brandable; all interpolations are HTML-escaped.

## Analytics

Lightweight [Umami](https://umami.is) analytics, off by default. The tracking script loads only when
`PUBLIC_UMAMI_WEBSITE_ID` is set **and** `NODE_ENV=production` **and** the route isn't under
`/admin` — so it never runs in dev or e2e. Use the typed `track(event, data?)` helper from
[`src/lib/analytics.ts`](./src/lib/analytics.ts); it no-ops when Umami isn't loaded. Env is read via
`$env/dynamic/public` so Railway runtime config wins over build-time baking.

## Testing

```bash
bun run test        # Vitest unit tests
bun run test:e2e    # Playwright end-to-end (Chromium)
bun run test:e2e:ui # Playwright in UI mode
```

The self-verify loop before calling any change done:

```bash
bun run lint && bun run check && bun run test && bun run test:e2e
```

- **Unit tests** (Vitest) are colocated with the code they cover.
- **e2e** (Playwright) builds the app and previews it on `:4173` against the **test database**
  (`db-test` on `:5433`, config in [`.env.test`](./.env.test)) with `TEST_MODE=1`. Global setup
  pushes the schema, truncates, and seeds. Fixtures in
  [`tests/e2e/fixtures.ts`](./tests/e2e/fixtures.ts) provide `createUser`, `loginAs`, the in-memory
  mailbox pollers, and `withVirtualAuthenticator`.
- **Passkey e2e** uses a **CDP WebAuthn virtual authenticator**
  (`WebAuthn.addVirtualAuthenticator`), a Chrome DevTools Protocol feature — hence Chromium-only.
  No real device or credentials are needed; the specs register and authenticate a passkey headlessly.

Any change that touches auth or adds/changes a route ships with a Playwright spec. See the
`davestack-e2e` skill under `.claude/skills/` for the house style.

## Code quality: git hooks & CI

Lint and format are **oxlint + oxfmt** (not ESLint/Prettier). oxfmt owns everything including
`.svelte`, `.md`, and `.json`; indentation is **2 spaces**, single quotes, printWidth 100
(`.oxfmtrc.json`).

Git hooks are installed by `bun install` (the `prepare` step runs Husky):

- **pre-commit** — oxfmt on staged files, oxlint with zero tolerated warnings, plus a garbage
  blocker (`scripts/check-staged.ts`) that rejects `.only`/`.skip`, `debugger`, conflict markers,
  stray `console.log`, and accidental `.env*` files.
- **commit-msg** — enforces the **emoji-commit** format.
- **pre-push** — `bun run check && bun run test`.

`--no-verify` is for genuine emergencies only; CI runs the same checks and will catch what you skip.

### Commit convention

Commits are **emoji-first**: `{EMOJI} {short imperative}`, ≤ 72 chars. For example:

```
🔐 add passkey management to account page
```

Multi-line bodies are for large changes only. The `commit-msg` hook enforces the emoji-first shape.

CI ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) runs lint, typecheck, unit tests, e2e
(with a Postgres service), and build in parallel on every PR and push to `main` — **no secrets
anywhere**. A release workflow ([`release.yml`](./.github/workflows/release.yml)) does a manual
version bump → `🔖 Release vX.Y.Z` commit → tag → GitHub release; CI skips those release commits.

## Deploying

### Railway (default)

The template targets [Railway](https://railway.app) with `@sveltejs/adapter-node` and the included
multi-stage [`Dockerfile`](./Dockerfile) (Bun build → adapter-node server run with Bun).

**Database migrations run on container boot** via [`docker-entrypoint.sh`](./docker-entrypoint.sh),
which runs `prisma migrate deploy` before starting the server. `migrate deploy` only applies
already-committed migrations (it never generates or resets), is idempotent, and takes a Postgres
advisory lock, so it's safe to run on every boot — including concurrent instance restarts. For a
high-instance-count deploy you may prefer to move it to a dedicated Railway **release command**
(`bunx prisma migrate deploy`) and drop the step from the entrypoint; the trade-off is noted in the
Dockerfile.

Set these in the Railway service:

- `BETTER_AUTH_SECRET` — `openssl rand -base64 32`
- `BETTER_AUTH_URL` — the deployed origin (see [Passkeys across environments](#️-passkeys-across-environments))
- `DATABASE_URL` (+ `DIRECT_DATABASE_URL` if your provider separates pooled/direct)
- any optional integration vars you use (Google / Resend / Umami)

### Netlify

Netlify works too, but requires swapping `@sveltejs/adapter-node` for
[`@sveltejs/adapter-netlify`](https://svelte.dev/docs/kit/adapter-netlify) in `svelte.config.js` and
provisioning Postgres separately (Neon, Supabase, etc.). The Dockerfile is Railway-specific and
unused there.

## PWA

The template ships a **light** PWA: a web manifest
([`static/manifest.webmanifest`](./static/manifest.webmanifest)), maskable app icons, apple-touch and
theme-color meta in [`src/app.html`](./src/app.html), and a **minimal service worker**
([`src/service-worker.ts`](./src/service-worker.ts)) that SvelteKit auto-registers. The worker only
precaches immutable, hashed build assets and cleans up old caches — it deliberately does **not**
intercept navigations, API calls, or auth, so there's no offline/stale-state surprise (and it keeps
the e2e suite green). Add richer offline behavior there if you want it. `bun run setup` rewrites the
manifest name to your project.

## Project structure

```
src/
├── hooks.server.ts          # session + security headers + rate limit + handleError
├── service-worker.ts        # minimal PWA precache (auto-registered by SvelteKit)
├── lib/
│   ├── analytics.ts         # typed track() (no-ops without Umami)
│   ├── client/              # browser-only: auth client, passkey rune module
│   ├── components/ui/       # shadcn-svelte components
│   ├── schemas/             # zod schemas for form/action validation
│   ├── safe-next.ts         # open-redirect guard for ?next=
│   └── server/              # server-only (never import from a .svelte / +page.ts)
│       ├── auth/            # Better Auth, one file per login method
│       ├── db.ts            # Prisma client singleton
│       ├── email/           # transactional email (console in dev, Resend in prod)
│       └── env.ts           # validated environment config
└── routes/
    ├── (marketing)/         # public landing (authed users redirect into the app)
    ├── (auth)/              # login, signup, forgot/reset password, verify email
    ├── (app)/               # authenticated area (server-guarded); account + passkeys
    ├── (admin)/admin/       # read-only admin dashboard (404 for non-admins)
    └── api/auth/[...all]/    # Better Auth handler
```

Route groups: `(marketing)` public · `(auth)` for signed-out flows (redirect away when authed) ·
`(app)` server-guarded · `(admin)` admin-only (hidden 404). Guards are **server-side only**.

## Scripts

| Script                 | What it does                                     |
| ---------------------- | ------------------------------------------------ |
| `bun run setup`        | Interactive first-run setup (rebrand + env + db) |
| `bun run dev`          | Dev server                                       |
| `bun run build`        | Production build (adapter-node)                  |
| `bun run preview`      | Preview the production build                     |
| `bun run check`        | Type-check (svelte-check)                        |
| `bun run lint`         | oxlint (zero warnings tolerated)                 |
| `bun run lint:fix`     | oxlint with autofix                              |
| `bun run format`       | Format with oxfmt                                |
| `bun run format:check` | Verify formatting                                |
| `bun run test`         | Unit tests (Vitest)                              |
| `bun run test:e2e`     | End-to-end tests (Playwright)                    |
| `bun run test:e2e:ui`  | Playwright UI mode                               |
| `bun run db:push`      | Push schema to the database                      |
| `bun run db:migrate`   | Create + apply a migration                       |
| `bun run db:studio`    | Open Prisma Studio                               |
| `bun run db:seed`      | Seed the database                                |
| `bun run db:reset`     | Reset the database (destructive)                 |

## For coding agents

This template is built to be worked in by coding agents. Start with
[`CLAUDE.md`](./CLAUDE.md) — the single source of truth for stack conventions (`AGENTS.md` just
points there). The `.claude/` directory adds:

- **Commands** — `/new-model` (scaffold a Prisma model end-to-end: schema → migration → admin card
  → e2e), `/new-route` (route in the right group with its guard + e2e), `/ship` (self-verify loop →
  emoji commit → PR).
- **Skill** — `davestack-e2e`: the Playwright house style, fixtures, and WebAuthn virtual
  authenticator recipes.

## License

MIT — see [LICENSE](./LICENSE).

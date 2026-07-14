# davestack

A batteries-included [SvelteKit](https://svelte.dev/docs/kit) template for spinning up new web
apps in minutes — and for coding agents to work in productively. It ships with authentication
(password, magic link, Google, passkeys), a read-only admin dashboard, transactional email,
analytics, and an end-to-end test suite already wired up.

> **Using this as a template?** Click **Use this template** on GitHub, then work through the
> [first-run checklist](#first-run-checklist).

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
| Deploy        | Railway (adapter-node); Netlify documented as an alternative |

## Quick start

Requires [Bun](https://bun.sh) ≥ 1.3 and Docker (for local Postgres).

```bash
bun install                 # installs deps (and git hooks)
docker compose up -d db     # local Postgres on :5432
bun run db:push             # apply the schema
bun run db:seed             # create the seed users
bun run dev                 # http://localhost:5173
```

That's it — no credentials required. Google/Resend/Umami are all optional and the app runs fine
without them (the Google button simply doesn't render, emails print to your terminal, analytics
stay off).

### Seed accounts

`bun run db:seed` creates two users you can sign in with immediately:

| Email               | Password      | Role  |
| ------------------- | ------------- | ----- |
| `admin@example.com` | `password123` | admin |
| `user@example.com`  | `password123` | user  |

## First-run checklist

After creating a repo from this template:

1. **Fill in `CLAUDE.md`** — replace the `PROJECT CONTEXT` stub with what your app actually is.
   _(Added in a later build phase.)_
2. **Run the app** with the [quick start](#quick-start) above and confirm you can sign in.
3. **Set real secrets** before deploying — at minimum `BETTER_AUTH_SECRET`
   (`openssl rand -base64 32`). Production boot fails on the dev placeholder.
4. **Enable branch protection** on `main` once CI is set up, requiring the status checks to pass.
   _(CI added in a later build phase.)_

## Environment variables

Every variable is documented in [`.env.example`](./.env.example). Copy it to `.env.local` and fill
in only what you need:

```bash
cp .env.example .env.local
```

Validation lives in [`src/lib/server/env.ts`](./src/lib/server/env.ts) (zod). Required variables
have local-dev defaults, so a fresh clone boots with zero config; **production** boot fails fast if
`BETTER_AUTH_SECRET` or `DATABASE_URL` is still a placeholder.

## Authentication

Four login methods, all on by default and all working out of the box:

1. **Email + password** (with email verification)
2. **Email magic link**
3. **Google OAuth** — renders only when `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` are set
4. **Passkeys** (WebAuthn) — works on `localhost` with zero config

Each method lives in its own file under
[`src/lib/server/auth/`](./src/lib/server/auth), and the assembly is in `auth/index.ts`.

### Removing an auth method

Each method is isolated so removing one is a small diff:

| Method         | Delete file              | Then remove from `auth/index.ts`        | Client (`src/lib/client/auth.ts`) |
| -------------- | ------------------------ | --------------------------------------- | --------------------------------- |
| Email+password | `auth/email-password.ts` | `emailAndPassword`, `emailVerification` | —                                 |
| Magic link     | `auth/magic-link.ts`     | `magicLinkPlugin` from `plugins`        | drop `magicLinkClient()`          |
| Google         | `auth/google.ts`         | `socialProviders`                       | —                                 |
| Passkeys       | `auth/passkey.ts`        | `passkeyPlugin` from `plugins`          | drop `passkeyClient()`            |

Then remove the corresponding UI on the login / account pages, and (for passkeys) the `Passkey`
model from `prisma/schema.prisma` + a migration.

### Google OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** →
   **Credentials** → **Create Credentials** → **OAuth client ID** → **Web application**.
2. Add an **Authorized redirect URI**: `{BETTER_AUTH_URL}/api/auth/callback/google`
   (e.g. `http://localhost:5173/api/auth/callback/google` for local dev).
3. Put the client id + secret in `.env.local` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

The Google button appears automatically once both are set.

### ⚠️ Passkeys across environments

**This is the thing that most often breaks passkeys in a new deploy — read it before shipping.**

Passkeys are bound to an **origin** and a **Relying Party ID (RP ID)**. davestack derives both from
`BETTER_AUTH_URL` (see [`src/lib/server/auth/passkey.ts`](./src/lib/server/auth/passkey.ts)), so you
only ever set one variable:

| Environment     | Set `BETTER_AUTH_URL` to            | RP ID (derived)             |
| --------------- | ----------------------------------- | --------------------------- |
| Local dev       | `http://localhost:5173`             | `localhost`                 |
| Railway preview | `https://<your-app>.up.railway.app` | `<your-app>.up.railway.app` |
| Custom domain   | `https://app.yourdomain.com`        | `app.yourdomain.com`        |

Rules to remember:

- `BETTER_AUTH_URL` **must** match the origin the browser actually loads. A mismatch makes every
  passkey ceremony fail.
- Passkeys are **origin-bound**: a credential registered on one domain will not work on another.
  Changing your domain orphans existing passkeys — users re-register on the new origin.
- For a single app spanning **multiple subdomains**, set `PASSKEY_RP_ID` to the shared parent
  domain to override the derived RP ID.

### Account recovery

A user whose only credential is a passkey (and who loses their device) is not locked out: they can
request a **magic link** to their verified email and, once in, add a new passkey from the account
page. The methods compose — no method traps a user.

## Project structure

```
src/
├── hooks.server.ts          # session + security headers + rate limit + handleError
├── lib/
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
    └── api/auth/[...all]/    # Better Auth handler
```

Route groups: `(marketing)` public · `(auth)` for signed-out flows · `(app)` server-guarded ·
`(admin)` _(added in a later build phase)_.

## Scripts

| Script                 | What it does                                  |
| ---------------------- | --------------------------------------------- |
| `bun run dev`          | Dev server                                    |
| `bun run build`        | Production build (adapter-node)               |
| `bun run preview`      | Preview the production build                  |
| `bun run check`        | Type-check (svelte-check)                     |
| `bun run lint`         | oxlint (zero warnings tolerated)              |
| `bun run lint:fix`     | oxlint with autofix                           |
| `bun run format`       | Format with oxfmt                             |
| `bun run format:check` | Verify formatting                             |
| `bun run test`         | Unit tests (Vitest)                           |
| `bun run test:e2e`     | End-to-end tests (Playwright) _(later phase)_ |
| `bun run db:push`      | Push schema to the database                   |
| `bun run db:migrate`   | Create + apply a migration                    |
| `bun run db:studio`    | Open Prisma Studio                            |
| `bun run db:seed`      | Seed the database                             |
| `bun run db:reset`     | Reset the database (destructive)              |

## Coming in later build phases

This template is being built in phases. Still to land: transactional email templates, the admin
dashboard, Umami analytics wiring, the full Playwright e2e suite, git hooks, GitHub Actions CI,
agent tooling (`CLAUDE.md`, slash commands), a `setup` script, and deploy docs (Railway + Netlify).
This section is filled in as each lands.

## License

MIT — see [LICENSE](./LICENSE).

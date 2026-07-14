# Phase 1 Recon — Reference Repo Comparison

> Working document for the davestack template build. Read alongside `PLAN.md`.
> Reference repos live at `../smallreads`, `../invoicyy`, `../vancouver-pool-booker`.

## 1. The common skeleton

What all (or both serious) references share, and what the template lifts:

| Concern | smallreads | invoicyy | pool-booker | Template takes |
|---|---|---|---|---|
| Runtime / PM | Bun (`bun.lock`, `.npmrc` engine-strict) | same | same | Bun, plus a real `engines`/`packageManager` pin (none of the three have one) |
| Framework | SvelteKit 2 + Svelte 5 runes | same | same (forced runes) | same |
| Styling | Tailwind v4 via `@tailwindcss/vite`, no tailwind.config, CSS-first theme | same | same | same |
| UI kit | shadcn-svelte + bits-ui + mode-watcher + svelte-sonner + @lucide/svelte | hand-rolled | shadcn-svelte + bits-ui | smallreads' stack |
| ORM | Prisma 7, `prisma-client` generator → `src/generated/prisma` (invoicyy) / `generated/prisma` (smallreads), PrismaPg driver adapter, `prisma.config.ts` + dotenv | same (plus Neon adapter in prod) | raw `bun:sqlite` | smallreads pattern; generated output gitignored |
| DB singleton | `src/lib/server/db.ts`, globalThis guard in dev | `src/lib/server/prisma.ts`, plain module singleton | module-level | smallreads' globalThis-guarded singleton |
| Auth | Better Auth + prismaAdapter; magic link + Google (conditional) + **passkeys**; `api/auth/[...all]` catch-all; session → `event.locals.user/session` in `hooks.server.ts`; `app.d.ts` typed from `auth.$Infer.Session` | Better Auth; magic link + Google; same hooks/locals/catch-all pattern | none | smallreads wiring + passkeys, **plus net-new email+password** (neither reference has it) |
| Protected routes | route-group `+layout.server.ts` redirect | same (`(app)/+layout.server.ts` → 303 `/login`) | n/a | same |
| Route groups | `(public)` / `(app)` / top-level `admin` | `(public)` / `(app)` / `api` | flat | spec's `(marketing)` / `(auth)` / `(app)` / `(admin)` |
| lib split | `$lib/server` (server-only) vs `$lib/client` + `$lib/components` | `$lib/server` vs `$lib` | none | smallreads split |
| Email | Resend, inline HTML layout builder (`buildEmailLayout`), magic-link sender | Resend, inline HTML | none | Resend wrapper + layout builder, **plus net-new dev console mode** (neither reference has one — both send real email in dev) |
| Analytics | none | Umami (`PUBLIC_UMAMI_WEBSITE_ID` in .env.example) | none | Umami per spec |
| Lint | oxlint, type-aware (`oxlint-tsgolint`), `--deny-warnings` | none | none | smallreads verbatim (see §3) |
| Format | **none — no oxfmt/prettier/dprint config exists in any repo** | none | none | oxfmt is net-new config (see §3) |
| Hooks | husky + lint-staged, pre-commit only (`bunx lint-staged` → oxlint --fix) | none | none | husky + lint-staged ("match smallreads"), extended with commit-msg + pre-push |
| Unit tests | Vitest, jsdom, colocated `*.test.ts` | none | none | smallreads |
| E2E | Playwright; setup project seeds DB + **forges signed Better Auth session cookies** into storageState; unauth vs auth projects | Playwright; `.env.test` (committed), global-setup does `prisma db push` + raw SQL seed + forged cookie | none | hybrid: smallreads cookie-forging for `loginAs`, invoicyy's committed `.env.test` + separate test DB on port 5433 |
| CI | GH Actions, `oven-sh/setup-bun@v2`, Postgres service containers, jobs: lint+check / unit / e2e (report artifact on failure) | type-check / e2e w/ postgres service | none | superset per spec (5 jobs) |
| Deploy | Netlify (adapter-netlify, netlify.toml w/ security headers + `prisma migrate deploy` in prod build) | Netlify (adapter-auto + netlify.toml + scheduled function) | none | **Railway + adapter-node + Dockerfile per spec — net-new, diverges from both references** (see §5) |
| Dependabot | weekly bun ecosystem, groups better-auth packages | weekly bun | none | smallreads' (with better-auth grouping) |
| CLAUDE.md | rules-style (think/simplicity/surgical), emoji commits, completion workflow (check→lint→test→e2e) | 10 numbered rules, emoji commits | none | rules style; **emoji commits kept** (Dave's Phase 1 review — overrides the spec's "conventional commits") |

pool-booker is the outlier (no auth/tests/CI/hooks/lint, SQLite, empty `.claude/`). It contributes only confirmation of: Bun, Svelte 5 forced-runes, Tailwind 4, shadcn-svelte/bits-ui, and the `scripts/*.ts run with bun` convention.

## 2. The passkey lift (from smallreads)

Files to lift, near-verbatim (rebranded, domain bits removed):

- `src/lib/server/auth.ts` — `betterAuth({...})` with `passkey({ rpName, origin })` + `magicLink()` + `sveltekitCookies(getRequestEvent)` plugins, `prismaAdapter`, `user.additionalFields.isAdmin` (already exactly what the spec wants: boolean, default false, `input: false`), conditional `socialProviders` on Google env presence, `trustedOrigins`.
- `src/lib/client/auth.ts` — `createAuthClient({ plugins: [magicLinkClient(), passkeyClient()] })`.
- `src/lib/client/passkey-auth.svelte.ts` — the reusable rune module: `handlePasskeySignIn({ autoFill })`, silent-cancel handling for `AUTH_CANCELLED` / `ERROR_CEREMONY_ABORTED`, `initConditionalMediation()` (guards `typeof PublicKeyCredential` + `isConditionalMediationAvailable()`), `handleGoogle()`. This is the graceful-degradation core.
- Login page pattern — `autocomplete="username webauthn"` on the email input, conditional-UI hint, passkey button state machine.
- `safe-next.ts` + its unit test — open-redirect guard for post-login redirects.
- Settings page passkey management — `authClient.passkey.addPasskey / listUserPasskeys / deletePasskey`.
- `Passkey` Prisma model + migration (`credentialID @unique`, `counter`, `deviceType`, `backedUp`, `transports`, `aaguid`, cascade delete, `@@index([userId])`).
- Deps: `better-auth` ^1.6.x, `@better-auth/passkey` (pinned exact in smallreads), `@better-auth/prisma-adapter`.

**Gaps vs the spec (net-new work, not lifts):**
- **No rename UI** in smallreads (add/list/delete only; names hardcoded to `'smallreads passkey'`). Rename = new form action + likely a direct `prisma.passkey.update` scoped to the session user (verify whether the plugin exposes an update API in Phase 4).
- **"Last used"** — smallreads' model has no `lastUsedAt`. `counter`/`updatedAt` may serve; verify plugin schema in Phase 4, otherwise display createdAt + deviceType only, or extend model.
- **`authenticatorAttachment: 'platform'`** is hardcoded in smallreads; template should omit it (allow security keys too) — decide in Phase 4.
- **No WebAuthn e2e** in smallreads — its e2e forges session cookies and only asserts the button renders. The CDP virtual-authenticator fixture is entirely net-new.
- smallreads points passkey `origin` at `BETTER_AUTH_URL` — that's the config-derived RP behavior the spec wants; keep, and document RP ID derivation explicitly.

## 3. Lint/format configs

- `oxlintrc.json` lifted verbatim from smallreads **except**: the `typescript/prefer-readonly-parameter-types` allow-list contains 14 smallreads domain type names (`GoogleBooks*`, `Book*`, `OL*`, `MergedBookData`, …). Those get pruned; the web-platform entries (`Date`, `URL`, `FormData`, `Request`, `RequestEvent`, `Page`, `APIRequestContext`, …) stay. Also `ignorePatterns` keeps `generated/**`. No rules loosened.
- Lint invocation lifted verbatim: `oxlint --config oxlintrc.json --deny-warnings --type-aware --tsconfig ./tsconfig.json` (`--deny-warnings` = the "zero warnings" mechanism; `oxlint-tsgolint` powers type-aware rules).
- **oxfmt: nothing to lift.** smallreads has no formatter config at all (despite an old `bun run format` entry in its `.claude/settings.local.json` allowlist — the script doesn't exist). Template introduces oxfmt fresh (`oxfmt` 0.58.0 on npm), minimal config, **spaces for indentation** (Dave's Phase 1 review — deliberate divergence from smallreads' de-facto tabs).

## 4. Things that appear in only one repo (decided in Dave's Phase 1 review)

| Feature | Where | Decision |
|---|---|---|
| `sveltekit-rate-limiter` on auth endpoints (429 + Retry-After in hooks) | smallreads | **Include** (approved). |
| `zod` | smallreads | **Include — first-class citizen**: env validation + all form/action schemas. |
| `sveltekit-superforms` | smallreads | **Skip** (approved) — plain form actions. |
| i18n (inlang/paraglide, en/fr/es) | invoicyy | **Skip** (approved). |
| PWA (service worker, manifest, iOS target) | smallreads | **Include, light**: manifest + icons + apple meta + minimal service worker. Not the full iOS-first treatment. |
| Release workflow (auto version bump + GH release) | smallreads | **Include** (smallreads `release.yml`; `🔖 Release vX.Y.Z` commits, CI skips them). |
| Scheduled cron endpoint + `CRON_SECRET` | invoicyy | **Skip** (approved). |
| Admin on a separate subdomain w/ session bridge + hostname gating | smallreads | **Skip** (approved) — `/admin` route group + 404 guard instead. |
| `layerchart` (admin charts) | smallreads | **Skip** (approved). |
| Security response headers (netlify.toml in both Netlify repos) | smallreads+invoicyy | **Include**, relocated into `hooks.server.ts` (no netlify.toml on Railway). |

## 5. Divergences from the references worth noting

- **Deploy**: both real references are Netlify. Railway/adapter-node/Dockerfile is net-new per spec. No objection — adapter-node + Docker is more portable and removes the netlify.toml magic; Netlify documented as alternative in README per spec.
- **Commits**: both references mandate *emoji* commit prefixes in CLAUDE.md. Dave's Phase 1 review confirmed **emoji commits win** over the spec's "conventional commits": `{EMOJI} {short description}`, multi-line body only for huge changes. commit-msg hook enforces this format.
- **Email+password auth**: absent from every reference (smallreads: passkey/magic-link/Google; invoicyy: magic-link/Google). Built fresh on Better Auth `emailAndPassword` + Resend verification.
- **Runtime env validation**: none anywhere in the references (invoicyy even non-null-asserts Google creds — the exact crash the spec forbids). Net-new `src/lib/server/env.ts`, fail-fast on boot.
- **TypeScript**: references pin ^6.0.3; TS 7.0.2 is current on npm. Template targets ^7; if `oxlint-tsgolint`/`svelte-check` choke on 7 at scaffold time, fall back to ^6 and flag.
- **engines/packageManager**: none of the three pin them; template will (`engines.bun`, `packageManager: bun@x.y.z`, matching CI's `oven-sh/setup-bun` version).
- **Resend e2e stubbing**: nowhere in references (smallreads bypasses email entirely by forging cookies; invoicyy uses a fake key and never exercises send). Net-new: the email wrapper gets a test transport that captures messages and a test-only mailbox endpoint (gated on an env flag) so Playwright can read verification/magic-link tokens. No new dependency needed.

## 6. Dependency delta (everything not literally named in the spec's stack list)

All are either shadcn-svelte plumbing, Better Auth plumbing, or Prisma plumbing — but flagging per the constraint:

- Better Auth: `@better-auth/passkey`, `@better-auth/prisma-adapter`
- Prisma 7 driver: `pg`, `@prisma/adapter-pg`, `@types/pg`, `dotenv` (prisma.config.ts env loading)
- shadcn-svelte plumbing (all in smallreads): `clsx`, `tailwind-merge`, `tailwind-variants`, `tw-animate-css`, `@lucide/svelte` (icons), `svelte-sonner` (the "sonner" component), `@internationalized/date` (bits-ui peer for date bits — only if a component needs it)
- Lint/type: `oxlint-tsgolint` (type-aware oxlint), `oxfmt`
- Hooks: `husky`, `lint-staged`
- Testing: `@testing-library/svelte`, `jsdom` (Vitest env, from smallreads)
- Resolved in Phase 1 review: `zod` in (first-class), `sveltekit-rate-limiter` in, `sveltekit-superforms` out (see §4).

## 7. Proposed template file tree

```
davestack/
├── .github/
│   ├── workflows/ci.yml              # 5 jobs: lint / typecheck / test / e2e / build (skips 🔖 Release commits)
│   ├── workflows/release.yml         # version bump + 🔖 Release commit + tag + GH release (smallreads)
│   ├── pull_request_template.md
│   └── dependabot.yml                # exists; extend w/ github-actions ecosystem + better-auth grouping
├── .husky/
│   ├── pre-commit                    # lint-staged (oxfmt write+restage, oxlint) + garbage blockers
│   ├── commit-msg                    # emoji-commit check (hand-rolled, no commitlint dep)
│   └── pre-push                      # svelte-check + vitest
├── .claude/
│   ├── commands/                     # /new-model, /new-route, /ship (final set pending Dave's review)
│   └── skills/davestack-e2e/SKILL.md # Playwright house style + WebAuthn fixture patterns
├── prisma/
│   ├── schema.prisma                 # User(isAdmin) / Session / Account / Verification / Passkey
│   ├── migrations/
│   └── seed.ts                       # 1 admin + 1 regular user
├── scripts/
│   └── setup.ts                      # rename project, gen secrets, boot DB, verify hooks
├── static/
│   ├── manifest.webmanifest          # light PWA (icons, apple meta in app.html)
│   └── icons/…
├── src/
│   ├── app.html / app.css / app.d.ts
│   ├── service-worker.ts             # minimal (light PWA)
│   ├── hooks.server.ts               # env assert → security headers → rate limit → session → locals; handleError
│   ├── lib/
│   │   ├── analytics.ts              # typed track(), no-ops without Umami
│   │   ├── client/
│   │   │   ├── auth.ts               # Better Auth client (magicLinkClient, passkeyClient)
│   │   │   └── passkey-auth.svelte.ts# lifted rune module
│   │   ├── components/
│   │   │   ├── ui/…                  # shadcn: button input card table dropdown-menu dialog sonner badge
│   │   │   └── app-shell/…           # nav + user menu (conditional admin link)
│   │   ├── schemas/                  # zod form/action schemas (zod = first-class, smallreads pattern)
│   │   ├── utils.ts                  # cn()
│   │   └── server/                   # server-only; enforced by SvelteKit + convention in CLAUDE.md
│   │       ├── env.ts                # fail-fast validation, single source for optional-integration flags
│   │       ├── db.ts                 # Prisma singleton + PrismaPg adapter
│   │       ├── auth/
│   │       │   ├── index.ts          # betterAuth() assembly — composes the four method modules
│   │       │   ├── email-password.ts # ← delete this file (+1 import) to remove the method
│   │       │   ├── magic-link.ts     # ← same
│   │       │   ├── google.ts         # ← same; self-disables when env vars absent
│   │       │   └── passkey.ts        # ← same; rpID/origin derived from env
│   │       └── email/
│   │           ├── index.ts          # send() → resend | console (dev) | capture (test)
│   │           └── templates/        # verify-email.ts, magic-link.ts, reset-password.ts, layout.ts
│   ├── generated/prisma/             # gitignored
│   └── routes/
│       ├── +layout.svelte            # mode-watcher, sonner, Umami (gated), shell
│       ├── +error.svelte
│       ├── (marketing)/+page.svelte  # public landing (+ privacy, terms stubs)
│       ├── (auth)/login | signup | forgot-password | reset-password | verify-email
│       ├── (app)/
│       │   ├── +layout.server.ts     # redirect(303, /login) guard
│       │   ├── home/ (or dashboard/)
│       │   └── account/              # profile + passkey management (list/add/rename/revoke)
│       ├── (admin)/admin/
│       │   ├── +layout.server.ts     # !isAdmin → error(404)
│       │   └── +page.server.ts/.svelte # stat cards, recent signups, sessions, app meta
│       └── api/
│           ├── auth/[...all]/+server.ts
│           └── test/mailbox/+server.ts  # test-transport readback; 404s unless TEST_MODE
├── tests/
│   └── e2e/
│       ├── fixtures.ts               # loginAs / createUser / withVirtualAuthenticator / mailbox
│       ├── auth-password.spec.ts     # signup → verify → login → authed page
│       ├── auth-magic-link.spec.ts
│       ├── auth-passkey.spec.ts      # register → logout → sign in; revoke → rejected
│       ├── auth-guards.spec.ts       # logout, (app) redirect
│       └── admin.spec.ts             # non-admin 404, admin dashboard renders
├── docker-compose.yml                # postgres dev (5432) + postgres test (5433)
├── Dockerfile                        # Railway, adapter-node
├── .env.example                      # every var documented
├── .env.test                         # committed, no secrets (invoicyy pattern)
├── oxlintrc.json                     # lifted from smallreads (domain types pruned)
├── .oxfmtrc.json                     # net-new
├── components.json
├── prisma.config.ts
├── playwright.config.ts / vitest.config.ts / svelte.config.js / vite.config.ts / tsconfig.json
├── package.json / bun.lock
├── CLAUDE.md                         # PROJECT CONTEXT stub + STACK CONVENTIONS
├── AGENTS.md                         # pointer to CLAUDE.md
└── README.md
```

Unit tests stay colocated (`src/**/*.test.ts`, smallreads pattern); `tests/e2e/` holds Playwright only.

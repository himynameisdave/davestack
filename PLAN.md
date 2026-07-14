# davestack Build Plan

> Handoff document. Any agent picking up this work: read this file, then `RECON.md`, then the
> original task spec (Dave's message). Work phase by phase. **Commit after each phase with a
> conventional-commit message, then STOP for Dave's review.** Do not start the next phase without
> approval.

## Ground rules (from the spec — non-negotiable)

- Bun for everything. No npm/npx/yarn.
- Svelte 5 runes only. No `export let`, no legacy stores.
- Only the approved stack + the flagged deps in `RECON.md` §6. Any other dependency: ask first.
- Fresh clone must work with **zero credentials**: `bun install && bun run db:push && bun run db:seed && bun run dev`
  → signup/login/magic-link/passkeys all work, `/admin` reachable as seeded admin. Google button
  simply doesn't render without creds. Nothing crashes on missing env.
- Passkeys work on `localhost` with zero config.
- `bun run test:e2e` passes on a fresh clone, passkey specs included (CDP virtual authenticator).
- CI green on the initial template commit.
- **Emoji commits** (Dave's call, matches both references): `{EMOJI} {short imperative description}`,
  < 72 chars, multi-line body only for huge changes. E.g. `🔐 add passkey management to account page`.
- `zod` is a first-class citizen of the stack: runtime env validation and all form/action schemas
  go through zod. Don't hand-roll validation.
- Reference implementations: `../smallreads` (passkeys, oxlint, most patterns), `../invoicyy`
  (.env.test / test-DB pattern), spec message (everything else). When in doubt, copy smallreads.

## Phase status

- [x] **1. Recon** — done; output is `RECON.md` (comparison, lift list, file tree) + this plan.
      Dave reviewed and answered the open questions — decisions recorded below.
- [x] **2. Scaffold** — done. SvelteKit+Svelte5+TS+Tailwind4+shadcn+oxlint/oxfmt all green
      (lint / check / format:check / build). See "Phase 2 outcome" below.
- [x] **3. Data** — done. Docker Postgres (dev 5432 + test 5433), Prisma 7 schema (Better Auth
      models + isAdmin), init migration applied, zod env validation, client singleton, seed
      (2 users). All gates green. See "Phase 3 outcome" below.
- [x] **4. Auth** — done. Better Auth (password + magic link + Google-conditional + passkeys),
      modular per-method files, hooks (session + security headers + rate limit + handleError),
      route groups + guards, auth pages, account page w/ passkey mgmt, seed w/ working passwords.
      Live-smoke-verified. README written (Dave asked). See "Phase 4 outcome". **Passkey WebAuthn
      e2e deferred to Phase 8 (needs a browser / CDP virtual authenticator).**
- [x] **5. Email** — done (background agent). Branded neutral templates (layout + verify/magic/reset),
      `escapeHtml`, `sendEmail` transports unchanged (capture/Resend/console), `/api/test/mailbox`
      endpoint (404 unless TEST_MODE), 21 unit tests. Gates green. Sender signatures unchanged.
- [x] **(interim) Vitest** — pulled forward from Phase 8 so the lifted `safe-next.test.ts` runs.
      Minimal `vitest.config.ts`; Phase 8 expands (jsdom projects, e2e, etc.).
- [x] **6. Admin** — done (worktree agent, cherry-picked). Guarded `(admin)/admin` (404 not 403),
      read-only dashboard: MODEL_CARDS extension point, recent signups w/ derived auth-method chips,
      session counts, app meta (DB host only). Admin link in user menu (gated). Independently
      re-verified: build ✅, non-admin/logged-out → 404, admin → 200, zero credential leak.
- [x] **7. Analytics** — done (worktree agent, cherry-picked). Typed `track()` (no-ops without Umami),
      root-layout Umami injection gated on `PUBLIC_UMAMI_WEBSITE_ID` + prod + not-`/admin`
      (`$env/dynamic/public`), worked `track('signup_completed', { method })` on signup. Off in
      dev/e2e. Re-verified green.
- [x] **8. Testing** — done (worktree agent, cherry-picked). Playwright (Chromium, preview on 4173,
      test DB 5433, workers=1), global-setup (push+truncate+seed), fixtures (`createUser`, `loginAs`
      via real API, `withVirtualAuthenticator` CDP, mailbox pollers), 5 specs / 8 tests incl. both
      passkey flows. +12 unit tests (33 total). **Independently re-verified by me: `test:e2e` 8/8
      passing TWICE (deterministic), passkeys included.** `@playwright/test` only new dep.
- [ ] 9. Hooks + CI
- [ ] 10. Agent tooling
- [ ] 11. Docs + setup script + polish

## Decisions from Dave's Phase 1 review (2026-07-13) — binding

1. **oxfmt**: introduce fresh (nothing to lift from smallreads). **Spaces, not tabs.**
2. **oxlintrc**: lift verbatim, prune the 14 book-domain type names, loosen nothing. Approved.
3. **zod**: approved, **first-class citizen** — env validation + all form/action schemas.
4. **sveltekit-rate-limiter**: include (auth routes).
5. **sveltekit-superforms**: skip.
6. **husky + lint-staged**: confirmed (extended with commit-msg + pre-push).
7. **EMOJI COMMITS, not conventional commits.** `{EMOJI} {short description}`; multi-line body only
   for huge changes. commit-msg hook enforces emoji-first. Overrides every earlier "conventional
   commits" mention in this plan, RECON.md, and the original spec.
8. Skips confirmed for: i18n/paraglide, cron endpoint, admin-subdomain mechanism, layerchart,
   superforms. **BUT include: light PWA** (manifest, icons, apple meta, minimal service worker —
   smallreads pattern, kept small) **and the release workflow** (smallreads `release.yml`: version
   bump + `🔖 Release vX.Y.Z` commit + tag + GitHub release; CI skips release commits).
9. **TS 7 if possible** (^7.0.2); fall back to ^6 only if oxlint-tsgolint or svelte-check break,
   and report the breakage.
10. **Railway confirmed** as default deploy target (adapter-node + Dockerfile); Netlify README-only.

## Phase 2 outcome (2026-07-13) — flags for Dave

- **TS 7 fell back to ^6.** `typescript@7.0.2` installs, and oxlint type-aware (tsgolint) is fine on
  it, but `svelte-check@4.7.2` crashes at boot (`ConfigLoader` throws — it can't drive the TS7
  compiler API yet). Reverted to `typescript@^6.0.3` (smallreads' pin). Revisit when svelte-check
  ships TS7 support.
- **oxfmt DOES format `.svelte`** (bundled `prettier-plugin-svelte`; needs the `svelte` pkg, which we
  have). Enabled via `"svelte": true` in `.oxfmtrc.json`, so one formatter owns everything:
  ts/js/svelte/css/html/json/yaml/md. `.oxfmtrc.json` set to **spaces** (`useTabs:false`, width 2),
  singleQuote, printWidth 100. PLAN.md/RECON.md are in `ignorePatterns` (handoff docs).
- **shadcn button tweak:** shadcn-svelte 1.4.1's `button.svelte` ships `href = undefined` which trips
  `no-useless-undefined` under `--deny-warnings`; changed to `href` (matches smallreads). Only
  hand-edit to a generated component; noted so a future re-`add` knows to redo it.
- oxfmt reformatted the pre-existing `dependabot.yml` + `README.md` (quotes/blank line) — both
  rewritten later anyway (Phases 9/11).
- Deferred to their phases (not in build/dev scripts yet): `prisma generate` (Phase 3), husky
  `prepare` hook (Phase 9). Kept out so a Phase-2 clone builds without a schema or hooks present.

## Phase 3 outcome (2026-07-14) — flags for Phase 4

- **Seed creates User rows only — no password credentials yet.** A working password login needs
  Better Auth's scrypt hasher; hand-rolling the Account hash risks a format mismatch that silently
  breaks login. **Phase 4 must rewrite `prisma/seed.ts`** to create users via `auth.api.signUpEmail`
  (User + credential Account together), then patch `isAdmin`/`emailVerified`. Because Better Auth
  owns user IDs, the Phase 4 seed should delete the two seed users by email first, then recreate —
  the current upsert-by-email would otherwise collide with Better Auth's signup.
- **Zero-config confirmed:** with no `.env.local`, `db:push`/`migrate`/`seed` all ran off the
  local-Docker default baked into `env.ts` + `prisma.config.ts`. Fresh clone needs only
  `docker compose up -d db`.
- **env.ts reads `process.env`** (not `$env/dynamic/private`) so it works in both SvelteKit and the
  bun seed script. Dev defaults for DATABASE_URL / BETTER_AUTH_URL / BETTER_AUTH_SECRET; production
  boot throws if the secret or DB URL is still the local placeholder. `features` (google/resend/umami)
  and `isTestMode` exported for call sites.
- **`prisma generate` added to `dev`/`build`/`check`** now that Prisma exists (was deferred in Phase 2).
- Generated client lives at `src/generated/prisma` (gitignored); imported by `db.ts` as
  `../../generated/prisma/client`. `BETTER_AUTH_URL` in `.env.test` set to `http://localhost:4173`
  (adapter-node preview port) — Phase 8 confirms against the Playwright config.

## Phase 4 outcome (2026-07-14) — live-verified + flags

Smoke-tested against a running dev server (all passed):
- Seeded `admin@example.com` / `password123` → **200 + session cookie**. Seed hashes with
  `hashPassword` from `better-auth/crypto` (the default emailAndPassword hasher, no `$app/server`
  import) and writes a credential Account with `accountId = userId` — confirmed to match a real
  Better Auth signup's shape.
- Wrong password → 401. Unverified user login → 403 (requireEmailVerification enforced).
- Fresh signup → 200, creates unverified credential account; verification email logged to console.
- Magic link request → 200, link logged to console (dev transport).
- Login page: passkey button present, **Google button absent** (no GOOGLE env — conditional works),
  magic-link button present.
- Guards: `/home`, `/account` while logged out → 303 → `/login?next=…`. Authed `/` → 303 → `/home`
  (app takes priority). Authed `/home` → 200. Security headers present.

Key decisions / flags:
- **`auth.api.forgetPassword` → `requestPasswordReset`** (server method; `forgetPassword` is
  client-only in this Better Auth version).
- **env prod-hardening moved out of module load.** It threw during `vite build` (SvelteKit's
  analyse step imports server modules with NODE_ENV=production and no secret). Now
  `assertProductionReady()` is called from `hooks.server.ts` guarded by `!building` → builds with no
  secrets (CI-safe), still fails fast at runtime boot.
- **Minimal email module built here** (`src/lib/server/email/index.ts`): transports = capture
  (TEST_MODE) / Resend (prod) / console (dev), + 3 senders. **Phase 5 keeps these signatures and
  swaps in branded templates, escaping, and the `/api/test/mailbox` endpoint.**
- **Passkey add uses no `authenticatorAttachment`** (allows platform AND security keys, per spec —
  smallreads hardcoded `'platform'`). Rename is a Prisma form action scoped to the session user
  (Better Auth exposes no rename API); add/revoke via client + `invalidateAll`.
- `src/lib/server/form.ts` `field()` helper coerces FormData values to strings (fixes
  `no-base-to-string` on `File` values feeding zod).

## Phase checklists

### Phase 2 — Scaffold
- [ ] `bunx sv create` (SvelteKit minimal, TS) or hand-rolled equivalent; Svelte 5, `"type": "module"`.
- [ ] adapter-node in `svelte.config.js` (Railway target).
- [ ] Tailwind v4 via `@tailwindcss/vite`; `src/app.css` CSS-first theme (copy neutral parts of
      smallreads' app.css structure: OKLCH vars, `@custom-variant dark`).
- [ ] shadcn-svelte init (`components.json`, baseColor stone or zinc) + components: button, input,
      card, table, dropdown-menu, dialog, sonner, badge (+ label — inputs need it).
- [ ] mode-watcher.
- [ ] `oxlintrc.json` from smallreads, domain types pruned. Lint script verbatim:
      `oxlint --config oxlintrc.json --deny-warnings --type-aware --tsconfig ./tsconfig.json`.
- [ ] `.oxfmtrc.json` (**spaces for indentation**, per Dave) + `format` / `format:check` scripts.
- [ ] Install `zod` now — it's first-class stack (env validation in Phase 3, form schemas in Phase 4).
- [ ] Full package.json script set (spec list): dev, build, preview, check, lint, lint:fix, format,
      format:check, test, test:e2e, test:e2e:ui, db:push, db:migrate, db:studio, db:seed, db:reset.
      dev/build = `svelte-kit sync && prisma generate && vite dev|build` (smallreads).
- [ ] `engines.bun` + `packageManager` pinned; `.npmrc` engine-strict (smallreads); commit `bun.lock`.
- [ ] Verify: `bun run check`, `bun run lint`, `bun run format:check`, `bun run build` all green.

### Phase 3 — Data
- [ ] `docker-compose.yml`: `db` (5432, `davestack`) + `db-test` (5433, `davestack_test`), postgres:17.
- [ ] `prisma/schema.prisma`: generator `prisma-client` → `src/generated/prisma` (gitignore it);
      models User (+`isAdmin Boolean @default(false)`), Session, Account, Verification, Passkey —
      copy smallreads' Better Auth models incl. Passkey exactly; snake_case `@@map` like invoicyy
      optional — follow smallreads (no map) for lift fidelity.
- [ ] `prisma.config.ts` (smallreads: dotenv .env.local then .env; migrations path; seed via
      `bun prisma/seed.ts`; url + directUrl).
- [ ] `src/lib/server/db.ts`: PrismaPg adapter + globalThis-guarded singleton (smallreads).
- [ ] `src/lib/server/env.ts`: **zod schema**, fail-fast validation at boot (imported by hooks.server.ts). Required:
      DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL. Optional w/ presence flags: GOOGLE_*,
      RESEND_API_KEY, PUBLIC_UMAMI_*. Clear thrown message naming the missing var.
- [ ] `prisma/seed.ts`: admin@example.com (isAdmin, verified, password) + user@example.com. Idempotent
      (upserts). Password hashing must go through Better Auth's hasher so login actually works —
      use `auth.api.signUpEmail` or Better Auth's internal scrypt; verify in-phase.
- [ ] Initial migration committed. `db:reset` = `prisma migrate reset --force`.
- [ ] `.env.example` (documented) + `.env.test` (committed, ports 5433).
- [ ] Verify: fresh `docker compose up -d`, `db:push`, `db:seed`, `db:studio` opens.

### Phase 4 — Auth (biggest phase; consider sub-commits)
- [ ] `src/lib/server/auth/` modular layout per RECON §7: one file per method, `index.ts` composes.
      Each method file exports a plugin/config fragment; removal = delete file + one import line.
      Document the removal recipe in README (Phase 11).
- [ ] Methods: `emailAndPassword` (+ `requireEmailVerification: true`, verification email via email
      wrapper), `magicLink` (smallreads), Google `socialProviders` **conditional on env presence**
      (smallreads), `passkey({ rpName, rpID?, origin })` derived from `BETTER_AUTH_URL` (+ optional
      `PASSKEY_RP_ID` override for multi-domain), `sveltekitCookies(getRequestEvent)`.
- [ ] `user.additionalFields.isAdmin` (smallreads, `input: false`).
- [ ] `src/routes/api/auth/[...all]/+server.ts` (smallreads).
- [ ] `hooks.server.ts`: env assert import → security headers → `auth.api.getSession` → locals →
      `svelteKitHandler`; `handleError` logs w/ event id, returns generic message. `app.d.ts` from
      `auth.$Infer.Session`.
- [ ] Lift `passkey-auth.svelte.ts` + `safe-next.ts` (+ its unit test) from smallreads.
- [ ] Route groups + guards: `(app)/+layout.server.ts` redirect; `(auth)` pages redirect away when
      logged in; `(marketing)` public.
- [ ] `sveltekit-rate-limiter` on auth endpoints in hooks.server.ts (429 + Retry-After, smallreads
      pattern) — but make sure e2e/test mode isn't throttled (env-gated limits).
- [ ] All form actions validate input with zod schemas in `src/lib/schemas/` (no superforms).
- [ ] Pages (shadcn, not junk-drawer): login (password form + magic-link toggle + Google button
      [only when enabled — expose via layout data] + passkey button + conditional-UI autofill),
      signup, forgot-password, reset-password, verify-email.
- [ ] `(app)/account`: profile basics + passkey management — list (name, deviceType, createdAt,
      last-used if plugin schema supports; else document), add (prompt for name, don't hardcode),
      rename (form action, `prisma.passkey.update` scoped to `locals.user.id` if no plugin API),
      revoke. Server-side form actions.
- [ ] Recovery composition: passkey-only user → magic link still works (same email) → from account
      page can add new passkey. Verify manually; e2e in Phase 8.
- [ ] Verify: all four methods work locally; fresh clone w/o Google env boots, no Google button.

### Phase 5 — Email
- [ ] `src/lib/server/email/index.ts`: `sendEmail({to, subject, html, text})` with transports:
      resend (RESEND_API_KEY present + prod), console (dev — pretty-print incl. any links), capture
      (TEST_MODE — in-memory array + exposed via `api/test/mailbox` endpoint, 404 unless TEST_MODE).
- [ ] Templates: layout.ts (neutral rebrand of smallreads' `buildEmailLayout`), verify-email,
      magic-link, reset-password. Escape interpolations.
- [ ] Wire into auth (Phase 4 stubs point here).
- [ ] Verify: dev signup logs verification email w/ clickable localhost URL.

### Phase 6 — Admin
- [ ] `(admin)/admin/+layout.server.ts`: `!locals.user?.isAdmin → error(404)` (404 not 403).
- [ ] Dashboard `+page.server.ts`: model counts (users/sessions/accounts/passkeys/verifications) via
      one structured `MODEL_CARDS` list — the documented extension point; recent signups (email,
      name, methods derived from Account.providerId + passkey presence, verified, createdAt,
      isAdmin); recent + active session count; app meta (NODE_ENV, git SHA via build-time define or
      RAILWAY_GIT_COMMIT_SHA, DB host parsed from URL — host only).
- [ ] Read-only. No forms, no actions.
- [ ] Admin link in user menu gated on `isAdmin`.
- [ ] Verify: non-admin 404s, admin renders.

### Phase 7 — Analytics
- [ ] Root layout: Umami `<script>` only when `PUBLIC_UMAMI_WEBSITE_ID` set AND prod AND route not
      under `(admin)`.
- [ ] `src/lib/analytics.ts`: `track(event, data?)` typed, no-ops when `window.umami` absent. Use
      once: signup completed w/ `{ method }`.
- [ ] `.env.example`: PUBLIC_UMAMI_WEBSITE_ID, PUBLIC_UMAMI_SRC (default cloud URL).

### Phase 8 — Testing (hard phase; budget accordingly)
- [ ] Vitest: smallreads pattern (jsdom, colocated tests). Unit-test at minimum: safe-next, env
      validation, email transport selection, template rendering.
- [ ] Playwright config: webServer = build + preview (or dev --mode test) against **test DB** (5433,
      `.env.test`, TEST_MODE=1); global-setup: `prisma db push` + truncate + seed; workers=1 or
      per-worker DB isolation — keep simple: serial-safe truncation per spec "no ordering deps";
      retries: CI 1 / local 0; trace on-first-retry; no Umami (env absent in test = already
      guaranteed).
- [ ] Fixtures (`tests/e2e/fixtures.ts`): `createUser({ isAdmin })` (direct DB or signup API),
      `loginAs(user)` (forged signed session cookie — lift smallreads `signCookieValue`),
      `withVirtualAuthenticator()` (CDP `WebAuthn.enable` + `addVirtualAuthenticator`
      {protocol ctap2, transport internal, hasResidentKey, hasUserVerification,
      isUserVerified, automaticPresenceSimulation}), `mailbox()` (poll test mailbox endpoint,
      extract links/tokens).
- [ ] The 7 spec files from RECON §7 tree — all green locally + in CI, no external creds.
- [ ] Chromium-only project is fine (virtual authenticator is CDP/Chromium).
- [ ] Verify loop: `bun run test && bun run test:e2e` twice in a row (catches state leakage).

### Phase 9 — Hooks + CI
- [ ] husky + lint-staged. pre-commit (staged only, fast): oxfmt --write + restage, oxlint
      --deny-warnings, garbage blockers (`.only`/`.skip` in tests, `debugger`, conflict markers,
      `console.log` outside src/lib/server + scripts + tests, any staged `.env*` except
      .env.example/.env.test = hard fail). Implement blockers as one small `scripts/check-staged.ts`.
- [ ] commit-msg: **emoji-commit** check script (no commitlint dep): first char is an emoji, then a
      space, then a short description; warn/fail on subject > 72 chars. Allow multi-line body.
- [ ] pre-push: `bun run check && bun run test`. NOT playwright (spec agrees).
- [ ] Hooks install via `prepare` script (fresh clone protected).
- [ ] `release.yml` (smallreads): manual dispatch patch/minor/major (+ optional push-to-main mode),
      bumps package.json, commits `🔖 Release vX.Y.Z`, tags, `gh release create --generate-notes`.
      CI jobs skip commits starting with `🔖 Release`.
- [ ] `.github/workflows/ci.yml`: pull_request + push main; concurrency `${{ github.workflow }}-${{ github.ref }}`
      cancel-in-progress; `oven-sh/setup-bun@v2` pinned to engines version, bun cache; 5 parallel
      jobs: lint (oxlint + oxfmt --check), typecheck, test, e2e (postgres service, migrate+seed,
      build, run, upload report/traces on failure), build. **No secrets anywhere.**
- [ ] PR template checklist (e2e spec, migration, .env.example, admin card).
- [ ] Extend dependabot.yml: github-actions ecosystem + better-auth group (smallreads).
- [ ] Document `--no-verify` = emergencies only, CI catches it.

### Phase 10 — Agent tooling
- [ ] CLAUDE.md: Part 1 PROJECT CONTEXT fill-me-in stub; Part 2 STACK CONVENTIONS as terse rules
      (spec has the full list — transcribe it, incl. self-verify loop
      `bun run lint && bun run check && bun run test && bun run test:e2e`, e2e-required rule,
      extension points, fixture docs). ≤ ~200 lines.
- [ ] AGENTS.md → one-line pointer to CLAUDE.md (single source of truth; two files drift).
- [ ] `.claude/commands/`: `/new-model`, `/new-route`, `/ship` — with an honest recommendation to
      Dave about which earn their keep (current take: /new-model and /new-route encode real
      multi-file invariants [schema+migration+admin card+e2e; route+guard+e2e] = keep; /ship is
      mostly the self-verify loop CLAUDE.md already mandates + `gh pr create` = borderline).
      /ship and CLAUDE.md commit guidance use emoji-commit format, not conventional commits.
- [ ] `.claude/skills/davestack-e2e/`: Playwright house style, fixtures, WebAuthn virtual
      authenticator recipes (skill not command: it's knowledge applied while writing any spec, not a
      discrete flow). Possibly fold conventions into CLAUDE.md instead of a second skill — decide
      with Dave.
- [ ] All commands/skills reference the real fixture names from Phase 8.

### Phase 11 — Docs + setup + polish
- [ ] README per spec's full list. Prominent call-out box: passkey RP ID/origin per environment
      (localhost zero-config; Railway preview URL; custom domain — what to set: BETTER_AUTH_URL,
      optional PASSKEY_RP_ID; passkeys are origin-bound, changing domain orphans credentials).
- [ ] Light PWA (smallreads pattern, kept small): `static/manifest.webmanifest` + icons +
      theme-color/apple meta in `app.html` + minimal `src/service-worker.ts`. Must not break e2e
      (preview serves SW — keep it cache-light, no offline logic beyond app-shell basics).
- [ ] `scripts/setup.ts` (bun): prompt project name → rewrite package.json/app strings + PWA
      manifest name; generate BETTER_AUTH_SECRET into .env.local; `docker compose up -d db`;
      `db:push` + `db:seed`; `bun install` already ran `prepare` (hooks) — verify.
- [ ] Dockerfile: multi-stage bun build, adapter-node output, `prisma migrate deploy` on boot or in
      Railway release phase — document choice.
- [ ] Delete RECON.md + PLAN.md (or move to docs/) — ask Dave.
- [ ] Final gate: clean clone in a temp dir → spec's fresh-clone commands → manual smoke of all four
      auth methods + /admin → `bun run test:e2e` green → CI green on GitHub.

## Gotchas already known (don't rediscover)

- smallreads' oxlint allow-list has domain types — prune (RECON §3).
- smallreads has NO oxfmt, NO handleError, NO env validation, NO passkey rename, NO WebAuthn e2e,
  NO email dev-mode. All net-new; spec requires them.
- Better Auth passkey plugin is a separate package `@better-auth/passkey` (smallreads pins exact).
- Seeded users need Better-Auth-compatible password hashes — don't hand-roll bcrypt.
- Passkey e2e needs `automaticPresenceSimulation: true` + resident key + user verification for
  conditional UI flows.
- e2e webServer must inject BETTER_AUTH_URL matching baseURL or passkey origin checks fail.
- `PUBLIC_` env vars are baked at build time in SvelteKit static env — use `$env/dynamic/public` if
  Railway runtime config should win; decide in Phase 7 (Umami) — dynamic is likely right for a
  template.

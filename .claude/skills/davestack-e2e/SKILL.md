---
name: davestack-e2e
description: >-
  House style for davestack Playwright e2e tests. Use whenever writing or modifying a spec under
  tests/e2e/ — covers the fixtures (createUser, loginAs, withVirtualAuthenticator, mailbox pollers),
  the WebAuthn virtual-authenticator recipe for passkey specs, the mailbox-polling pattern for
  verification / magic-link tokens, and the test-DB / TEST_MODE / workers=1 setup.
---

# davestack e2e house style

Knowledge for writing Playwright specs in this repo. Specs live in `tests/e2e/`, run on **Chromium
only**, against the **test DB on `:5433`** with `TEST_MODE=1`. Reference implementation: the five
existing specs (`auth-password`, `auth-magic-link`, `auth-passkey`, `auth-guards`, `admin`).

## Harness setup (already wired — don't rebuild)

- **Config:** `playwright.config.ts`. `dotenv` loads `.env.test` first, so the config and the
  webServer both see the test DB, `TEST_MODE`, and `BETTER_AUTH_URL`. webServer =
  `bun run build && bun run preview` on `:4173` (adapter-node SSR preview). `BETTER_AUTH_URL` must
  match `baseURL` or passkey origin checks fail — the config already guarantees this.
- **`workers: 1` — keep it.** The test mailbox is a single in-memory array on the server and every
  spec shares one Postgres DB, so specs run **serially** for determinism. Don't add parallelism
  without per-worker DB isolation.
- **Global setup:** `tests/e2e/global-setup.ts` runs once before the server: `svelte-kit sync` →
  `prisma db push` → wipe all tables → seed two stable users (`admin@example.test` and
  `user@example.test`, password `password123`, admin flag set). Specs generally make their **own**
  throwaway users rather than lean on the seed.
- **Run:** `bun run test:e2e` (or `bun run test:e2e:ui`). Needs Docker Postgres up
  (`docker compose up -d`).

## Fixtures — `tests/e2e/fixtures.ts`

Import from `./fixtures`. Keep signatures stable; specs and these docs depend on them.

- **`createUser(options?)`** → `{ id, email, password, isAdmin }`. Inserts a User + credential
  Account **directly via Prisma** (bypasses signup), defaulting to a unique email and a **verified**
  account so it can log in immediately. Options: `email`, `password`, `isAdmin`, `emailVerified`.
  For admin specs: `await createUser({ isAdmin: true })`.
- **`loginAs(page, { email, password })`** → signs the browser in by POSTing the **real**
  `/api/auth/sign-in/email` endpoint. `page.request` shares the browser context's cookie jar, so the
  `Set-Cookie` lands in the context and every later `page.goto` is authenticated. No forged/HMAC
  cookie — it exercises the true auth path.
- **`withVirtualAuthenticator(page)`** → `{ authenticatorId, cleanup }`. See the recipe below.
- **`getLatestEmail(request, to)`** → polls the test mailbox for the newest email. See below.
- **`extractLink(email)`** → returns the first absolute URL from the email's plain-text body.
- **`clearMailbox(request)`** → empties the test mailbox (DELETE `/api/test/mailbox`).

## WebAuthn / passkeys — virtual authenticator recipe

Passkey specs drive a **real** WebAuthn ceremony through a CDP virtual authenticator — no
`navigator.credentials` mocking. Chromium only (`WebAuthn.addVirtualAuthenticator` is a Chrome
DevTools Protocol feature; Firefox/WebKit have no equivalent — that's why the config is Chromium-
only).

`withVirtualAuthenticator(page)` attaches one with these options (from `fixtures.ts`):

- `protocol: 'ctap2'`, `transport: 'internal'`
- `hasResidentKey: true` + `hasUserVerification: true` + `isUserVerified: true` →
  a **discoverable (resident) credential** that satisfies user verification, enabling passwordless /
  usernameless sign-in.
- `automaticPresenceSimulation: true` → the authenticator auto-approves presence, so no manual UI.

Pattern (see `tests/e2e/auth-passkey.spec.ts`):

```ts
const authenticator = await withVirtualAuthenticator(page);
const user = await createUser();
await loginAs(page, user);
// register a passkey from /account, sign out, sign back in "Sign in with a passkey"
await authenticator.cleanup();
```

Notes:

- Attach the authenticator **before** the register/sign-in ceremony. Credentials persist across
  navigations **within the same page**, which is what lets a spec register then sign in.
- `cleanup()` is best-effort (the authenticator dies with the page anyway) but call it in the happy
  path.
- A **revoked** passkey: the authenticator still holds the credential, but the server deleted the
  `Passkey` row, so the assertion is rejected and the user never leaves `/login`.

## Email — mailbox polling for verification / magic-link tokens

Email only lands in the in-memory mailbox because `TEST_MODE=1` selects the capture transport
(`src/lib/server/email/index.ts`). The endpoint `GET/DELETE /api/test/mailbox` is **404 outside
TEST_MODE**.

Pattern (see `tests/e2e/auth-magic-link.spec.ts`):

```ts
const email = await getLatestEmail(page.request, user.email);
expect(email.subject).toBe('Your sign-in link');
await page.goto(extractLink(email)); // follow the link to complete the flow
```

`getLatestEmail` polls (up to ~10s) so timing is never a flake source. Use `clearMailbox(request)`
before a flow that asserts email counts.

## Writing a new spec — checklist

- Put it in `tests/e2e/<feature>.spec.ts`, import fixtures from `./fixtures`.
- Make your own users with `createUser(...)` — don't depend on ordering or another spec's state.
- Prefer **role/label selectors** (`getByRole`, `getByLabel`, `getByText`) over CSS, matching the
  existing specs.
- Assert **behaviour** (redirects, guard results, visible outcomes), not implementation.
- For guarded routes, assert the guard: `(app)` → logged-out redirects to `/login`; `(admin)` →
  non-admin gets 404, admin gets 200.
- Run `bun run test:e2e` twice locally — a second green run confirms no state leakage.

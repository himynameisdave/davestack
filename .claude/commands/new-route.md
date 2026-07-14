---
description: Scaffold a new route in the correct group with its guard and an e2e spec
---

Scaffold a new route. The invariant: **right route group → correct guard → nav wiring (if user-
facing) → e2e spec**. A route that changes what's reachable ships with a spec.

Route to add: **$ARGUMENTS** (if empty, ask for the path and whether it's public, authed, or admin).

## 1. Pick the route group — `src/routes/`

- **`(marketing)/`** — public, no guard. Landing/marketing pages.
- **`(auth)/`** — login/signup/etc. `(auth)/+layout.server.ts` already redirects authed users to
  `/home`. Put unauthenticated-only pages here.
- **`(app)/`** — signed-in app. `(app)/+layout.server.ts` already redirects logged-out users to
  `/login?next=…`. **Just add your `+page.svelte` under `(app)/` and it's guarded** — the group
  layout covers it.
- **`(admin)/admin/`** — admin-only. `(admin)/admin/+layout.server.ts` throws **404** unless
  `locals.user?.isAdmin`. Add pages under `(admin)/admin/` and they inherit that guard.

## 2. Guard

- If your page belongs to `(app)` or `(admin)`, the **group layout guard already protects it** — do
  not re-implement it. Only add a `+page.server.ts` check if the page needs finer-grained access
  (e.g. ownership of a specific record), and do it **server-side** (`locals.user` / `locals.session`),
  never in client code.
- Public/auth pages need no guard.

## 3. Nav wiring (if user-facing)

- App nav lives in `src/routes/(app)/+layout.svelte` (the header dropdown). Add a link there if the
  page should be reachable from the UI. The Admin link there is already gated on `data.user.isAdmin`
  — follow that pattern for any role-gated link.

## 4. e2e spec — required

- Add a spec under `tests/e2e/` that asserts the route's **guard behaviour**, not just that it
  renders:
  - `(app)` route → logged-out visit redirects to `/login` (see `tests/e2e/auth-guards.spec.ts`).
  - `(admin)` route → non-admin/logged-out gets 404, admin gets 200 (see
    `tests/e2e/admin.spec.ts`).
- Use `tests/e2e/fixtures.ts`: `createUser` / `createUser({ isAdmin: true })` + `loginAs`. See the
  `davestack-e2e` skill for the house style.

## Conventions

- Svelte 5 runes only (`$props`/`$state`/`$derived`). Any form action validates with a zod schema in
  `src/lib/schemas/`.

## Verify

```
bun run lint && bun run check && bun run test && bun run test:e2e
```

Commit with emoji format, e.g. `✨ add <route> page with guard and e2e`.

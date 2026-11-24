---
description: Scaffold a new route in the correct group and add a feature map entry
---

Scaffold a new route in the appropriate group, wire up navigation if needed, and register the page
in the feature map.

Route to add: **$ARGUMENTS** (if empty, ask for the path and access level).

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

- Use the existing layout guards for `(auth)`, `(app)`, and `(admin)` pages. For finer-grained
  access such as record ownership, check `locals.user` or `locals.session` in `+page.server.ts`.

## 3. Nav wiring (if user-facing)

- App nav lives in `src/routes/(app)/+layout.svelte` (the header dropdown). Add a link there if the
  page should be reachable from the UI. The Admin link there is already gated on `data.user.isAdmin`
  — follow that pattern for any role-gated link.

## 4. Feature map

- Add an entry to `tests/e2e/feature-map.ts` with the page's URL path, access level
  (`public`, `guest`, `user`, or `admin`), and a short description of what users do there. The
  map drives the access checks in `tests/e2e/auth-guards.spec.ts`.
- Add a Playwright spec for page-specific behavior such as form submissions or ownership checks.

## Conventions

- Svelte 5 runes only (`$props`/`$state`/`$derived`). Any form action validates with a zod schema in
  `src/lib/schemas/`.

## Verify

```
bun run lint && bun run check && bun run test && bun run test:e2e
```

Commit with emoji format, e.g. `✨ add <route> page`.

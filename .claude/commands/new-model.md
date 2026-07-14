---
description: Scaffold a new Prisma model end-to-end (schema → migration → admin card → e2e)
---

Scaffold a new Prisma model **end-to-end**. A model isn't done until all four steps below exist —
they are the davestack multi-file invariant. Don't stop after editing the schema.

Model to add: **$ARGUMENTS** (if empty, ask for the model name and its fields first).

## 1. Schema — `prisma/schema.prisma`

- Add the `model` **below the `─── App tables ───` marker** (never touch the Better Auth models
  above it).
- Follow the existing conventions: `String @id` ids, `createdAt DateTime @default(now())`,
  `updatedAt DateTime @updatedAt`, `@@index` on foreign keys.
- If it relates to a user, add `userId String` + a relation with `onDelete: Cascade` and a back-
  relation on `User`.

## 2. Migration — regenerate the client

- Run `bun run db:migrate` (this is `prisma migrate dev` — creates + applies a migration and
  regenerates the client at `src/generated/prisma`). Give the migration a descriptive name.
- The generated client is gitignored but the migration under `prisma/migrations/` **is committed**.
- Never edit generated code by hand.

## 3. Admin dashboard card — the `MODEL_CARDS` extension point

- In `src/routes/(admin)/admin/+page.server.ts`, append one entry to the `MODEL_CARDS` array:
  `{ key: '<plural>', label: '<Plural>', count: () => prisma.<model>.count() }`.
- That is the only change needed — the dashboard renders a stat card per entry automatically. Keep
  it a cheap aggregate `count()`; the admin dashboard is **read-only** (no forms/actions).

## 4. e2e spec — required

- Add or extend a spec under `tests/e2e/` (e.g. `tests/e2e/<model>.spec.ts`). At minimum assert the
  model surfaces where a user sees it (its admin card count, or the page/flow that creates it).
- Use the fixtures in `tests/e2e/fixtures.ts` — `createUser`, `loginAs`, and (for admin views) a
  `createUser({ isAdmin: true })` seed. Consult the `davestack-e2e` skill for house style.

## Access & validation reminders

- Any query goes through the `prisma` singleton from `$lib/server/db`.
- Any create/update form validates input with a **zod schema in `src/lib/schemas/`** — never hand-
  roll validation. Read fields via `field(data, name)` from `$lib/server/form`.
- Scope mutations to `locals.user.id` (server-side) so one user can't touch another's rows.

## Verify

Run the self-verify loop and make sure it's green before committing:

```
bun run lint && bun run check && bun run test && bun run test:e2e
```

Commit with emoji format, e.g. `✨ add <Model> model with admin card and e2e`.

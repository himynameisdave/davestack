---
description: Pre-PR flow — self-verify loop, confirm e2e coverage, emoji commit, open a PR
---

Take the current change from "written" to "PR opened". Work through these steps in order; stop and
fix if any gate fails.

## 1. Self-verify loop (all must pass)

```
bun run lint && bun run check && bun run test && bun run test:e2e
```

Requires Docker Postgres up (`docker compose up -d`). If anything fails, fix it — do not open a PR
on red.

## 2. Confirm e2e coverage

- If this change **touches auth or adds/changes a route or model**, there must be a Playwright spec
  under `tests/e2e/` exercising it. If there isn't, add one before shipping (see `/new-route`,
  `/new-model`, and the `davestack-e2e` skill). This is a hard rule for auth-affecting and route-
  adding changes.
- Docs-only or pure-refactor changes with no route/auth surface are exempt.

## 3. Commit — emoji format (NOT conventional commits)

- `{EMOJI} {short imperative}`, ≤ 72 chars. E.g. `🔐 add passkey management to account page`.
- Emoji-first is the enforced convention — do **not** use conventional-commit prefixes
  (`feat:`/`fix:`). A commit-msg hook rejects them.
- If not already on a feature branch, create one first (don't commit straight to `main`).

## 4. Open the PR

```
gh pr create --fill
```

- Fill in the PR template checklist if the repo has one (e2e spec, migration, `.env.example`, admin
  card as applicable).
- Do **not** push if the self-verify loop didn't pass.

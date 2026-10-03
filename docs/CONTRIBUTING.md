# Contributing

## Workflow

1. **Open an issue or discuss** larger changes before investing significant time, unless you
   are fixing an obvious bug.
2. **Branch** from `main` with a descriptive name.
3. **Keep changes focused** — one logical concern per pull request; avoid unrelated refactors.
4. **Match existing style** — TypeScript strictness, import style (`*.js` extensions in
   backend ESM output paths), and formatting consistent with surrounding files.

## Local checks

These are the same steps CI runs, in the same order:

```bash
npm ci
cd backend && npm ci && cd ..

npm run lint           # must be clean — CI fails on any error
npm run build          # frontend typecheck + bundle
npm run build-backend  # backend typecheck + compile

# Tests need a database and two servers. Playwright starts both itself.
npm test
```

### Database for tests

The suite needs a seeded database. It does **not** use `db:migrate` — that folder is
gitignored, so migrations are unavailable on a clean checkout. Use `db:push`:

```bash
cd backend
DATABASE_URL="file:./localtest.db" npx drizzle-kit push --force
DATABASE_URL="file:./localtest.db" npm run seed
cd ..

DATABASE_URL="file:./localtest.db" npm test
```

> `db:push --force` drops and recreates the schema, which **wipes the seeded rows**. Seed
> afterwards, every time — otherwise registration fails with
> `Language "es" is not supported`.

CI does the equivalent with `DATABASE_URL=file:./ci.db`, which keeps a run from ever
touching a shared or production database.

### Docker

`docker-compose up` runs the frontend and backend together. The backend reads
`DATABASE_URL` and `DATABASE_AUTH_TOKEN` from the environment; set
`DATABASE_URL=file:../sqlite.db` and omit the token for a local SQLite database.

## Testing

Playwright specs live in `tests/`, grouped by area:

| File | Covers |
|---|---|
| `pw-01-registration.spec.ts` | Registration, field rules, step gating, availability |
| `pw-02-login.spec.ts` | Login, credential errors, rate-limit lockout |
| `pw-03-session.spec.ts` | Session persistence, protected routes, logout |
| `api-errors.spec.ts` | Transport-layer failure handling |
| `auth.spec.ts` | Legacy happy-path suite (superseded by the `pw-*` files) |

Guidelines:

- **Assert on state, not on timing.** Prefer `aria-pressed`, input `type`, and
  `toBeVisible()` (which auto-waits) over bare `isVisible()` or text that changes shape.
- **Never rely on real network latency.** Where an in-flight state matters, induce it with
  `page.route()` and an explicit delay.
- **Create fixtures through the API**, not the UI. A UI-registration fixture couples setup
  to the flow under test, so one registration bug breaks every spec that needs an account.
- **Give each test unique identifiers.** They must also satisfy the 20-character username
  limit.
- Use Playwright's **default execution mode, not `mode: 'serial'`** unless ordering is
  genuinely required — serial mode means one failure skips everything after it.
- Keep the suite small. Prefer one test per rule over one test per manual case; several
  manual cases often exercise the same rule from different angles.

## Test-case IDs

Two independent numbering schemes, so dropping a case or adding an automated test never
forces a renumber of the other:

| Prefix | Meaning |
|---|---|
| `TC-AUTH-nnn` | Manual test case, executed by a person |
| `PW-nnn` | Automated Playwright test |

When you add or retire an automated test, update the mapping in
[`QA-TRACEABILITY.md`](QA-TRACEABILITY.md). It is the traceability record between manual
coverage and automation, and it goes stale silently if nobody maintains it.

## Backend

- Prefer `docker-compose up` when you need the backend running alongside the frontend.
- The database connection is driven by `DATABASE_URL` alone. Supplying
  `DATABASE_AUTH_TOKEN` without a remote URL has no effect.
- Never commit real `.env` files or secrets.
- **Every new rate limit belongs in `backend/src/constants/rateLimits.ts`**, read from the
  environment with a fallback — not as a constant in the route that uses it.
- **Validation rules belong in `backend/src/utils/validation.ts`** and are mirrored in
  `src/features/auth/validation.ts`. The server is always the authority; the client copy
  only shapes the experience. Keep the two in step — a mismatch shows up as a form that
  accepts something the API then rejects.
- New routes should be reflected in `docs/openapi.yaml` **and** `docs/API.md`. Note that
  `openapi.yaml` currently predates the newer auth endpoints; adding to it is a good
  contribution.

## Frontend

- Prefer extending existing components and stores over duplicating logic.
- **Every hook must sit above every early return** in a component. An early return placed
  before a hook makes the hook count depend on render state, and React throws
  *"Rendered more hooks than during the previous render"* the first time that state
  changes — which, for a session check, is on every page refresh.
- A `useEffect` that only sets state should be replaced by React's *adjust-state-during-
  render* pattern rather than silenced.
- After API contract changes, update the OpenAPI spec and the affected `apiClient` call
  sites.

## Commits and pull requests

- Write clear commit messages and PR descriptions in full sentences.
- Mention breaking API or environment changes prominently in the PR body.
- If you change a documented behaviour, update the docs in the same PR.

## Security

- `GET /auth/info/{userId}` takes a user id as a path parameter and does not verify
  ownership. Treat it, and similar aggregates, as sensitive; tightening access control is a
  valid contribution.
- Login is rate limited per `(email, ip)` **and** per IP, but the lockout state is
  in-memory and per-process. A multi-instance deployment needs shared storage.
- There is **no server-side token revocation**: `POST /auth/logout` only returns a message,
  and the SPA logs out by discarding the token locally. A leaked token stays valid for its
  full 7-day lifetime.
- The availability-lookup endpoint is anonymous and reveals whether a username or email is
  registered, so it is rate limited. Treat changes to its limit as security-sensitive.
- Do not log tokens, passwords, or third-party API keys. User-facing errors are generic on
  purpose; the real cause goes to the server log.
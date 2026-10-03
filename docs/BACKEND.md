# Backend module

Express 5 + TypeScript, Drizzle ORM, **LibSQL / Turso** (or local SQLite).
Entry point: `backend/src/server.ts`.

## Responsibilities

- **REST API** under `/api/v1` (routers in `backend/src/routes/`).
- **SQLite**-compatible persistence via LibSQL; schema in `backend/src/db/schema.ts`.
- **JWT** auth middleware — `backend/src/middleware/auth.ts`.
- **Rate limiting** — login brute-force protection and an availability-lookup throttle.
- **OpenAPI + Swagger UI** — spec at `docs/openapi.yaml`; UI at `/api-docs` when the spec
  is found at runtime.
- **Production SPA** — when `NODE_ENV=production` and `public/` exists next to `dist/`,
  static assets and an SPA fallback are served (see the Dockerfile layout).

## Layout

```
backend/src/
├── server.ts            entry: cors, json, swagger, /api/v1, static SPA, keep-alive
├── constants/
│   ├── levels.ts        CEFR-style level names
│   ├── tiers.ts         daily-goal tiers
│   └── rateLimits.ts    every rate limit, read from env (single source of truth)
├── db/
│   ├── schema.ts        Drizzle schema
│   ├── index.ts         client + db singletons
│   ├── migrate.ts       applies drizzle/migrations
│   ├── seed.ts          language seed (LingQ API, with offline fallback)
│   ├── setup.ts         FTS5 virtual tables + indexes
│   └── reset.ts         destructive reset
├── middleware/
│   ├── auth.ts          JWT verification
│   ├── loginRateLimit.ts per-(email,ip) and per-IP brute-force buckets
│   └── ipRateLimit.ts   generic fixed-window per-IP limiter
├── routes/              auth, library, reader, vocab, phrases, upload
├── services/            lingq import, learning analytics, vocab history
└── utils/               validation, timezone, lesson parser, stats engine, translation parser
```

## Routes (file → mount path)

| File | Mount | Notes |
|------|-------|-------|
| `auth.ts` | `/api/v1/auth` | Registration, login, session, preferences |
| `library.ts` | `/api/v1/library` | Courses, feed, LingQ import |
| `reader.ts` | `/api/v1/lessons` | Reader payload, parse, edit, progress, delete — despite the `/lessons` prefix |
| `vocab.ts` | `/api/v1/vocab` | Vocabulary CRUD, hints, tags, insights |
| `phrases.ts` | `/api/v1/phrases` | User phrase CRUD |
| `upload.ts` | `/api/v1/upload` | Cloudinary image/audio |

`GET /api/v1/health` is registered directly on the v1 router and needs no auth. CI polls it
as the readiness signal before running the test suite.

## Authentication

`middleware/auth.ts` verifies `Authorization: Bearer <jwt>` and rejects with **`401`** in
every failure case — missing, malformed, expired or tampered — each carrying a code
(`NO_TOKEN`, `TOKEN_EXPIRED`, `TOKEN_INVALID`). Signing in issues a token with a **7-day**
lifetime.

There is currently **no server-side revocation**: `POST /auth/logout` requires a valid
token and only returns a message. A leaked token stays usable until it expires. Adding a
`token_version` column to `users` (bumped on logout, checked in `authenticate`) is the
usual fix.

## Rate limiting

All limits live in `backend/src/constants/rateLimits.ts` and are read from the environment
on every request, with a fallback default. Nothing is hard-coded in a route.

| Limit | Scope | Env vars | Default |
|---|---|---|---|
| Login per account | `(email, ip)` | `MAX_LOGIN_ATTEMPTS`, `LOGIN_LOCKOUT_MINUTES` | 5 / 15 min |
| Login per IP | `ip` | `MAX_LOGIN_ATTEMPTS_PER_IP` | `max(MAX_LOGIN_ATTEMPTS × 4, 20)` |
| Availability lookup | `ip` | `AVAILABILITY_RATE_LIMIT`, `AVAILABILITY_RATE_WINDOW_SECONDS` | 30 / 60 s |

Once an account reaches its threshold, the login route short-circuits **before** running
bcrypt, so a locked-out attacker cannot use the endpoint as a CPU amplifier. The IP-wide
bucket is deliberately looser than the per-account one so a shared NAT or office connection
is not locked out by a few unrelated people mistyping.

> Both stores are **in-memory and per-process**. That is fine for a single instance; a
> multi-instance deployment would move them to shared storage (e.g. Redis) keyed the same
> way. The exported API would not need to change.

## Input validation

`utils/validation.ts` is the single source of truth for registration and login rules.
`src/features/auth/validation.ts` mirrors it on the client so the form can flag a field
before submitting, but **the server is the authority** — a client-side rule can never
substitute for it.

Errors are returned per field:

```json
{ "error": "…", "errors": { "username": "…" } }
```

Duplicate registrations are detected twice: an up-front `SELECT` (so a collision answers
`409` before bcrypt runs or a transaction opens) and the unique constraint itself as a
backstop for the concurrent-insert race. Classifying the constraint requires walking the
error's `cause` chain, because Drizzle wraps the driver error in a `DrizzleQueryError`
whose own message is only `Failed query: …`.

## Database

- **Connection:** `DATABASE_URL`. Defaults to `file:sqlite.db` relative to the process
  working directory. Any non-`file:` URL is treated as remote (Turso) and requires
  `DATABASE_AUTH_TOKEN`. Note the choice is driven by `DATABASE_URL` alone — supplying a
  token without a remote URL has no effect.
- **Schema push (development and CI):** `npm run db:push` — creates or updates tables
  directly from `schema.ts`. This is what CI uses.
- **Migrations:** `npm run db:migrate` applies SQL from `drizzle/migrations`.
  **This folder is gitignored**, so `db:migrate` fails on a clean checkout with
  *"No file … found in ./drizzle/migrations"*. Use `db:push` unless you have deliberately
  committed the generated migrations.
- **Generate migrations:** `npm run db:generate`.
- **Reset:** `npm run db:reset` — destructive.
- **Seed:** `npm run seed` populates languages from the LingQ API. If that call fails it
  **falls back to a built-in list and still exits 0**, so a third-party outage cannot fail
  the pipeline. Only a genuine database error exits non-zero.

## Uploads & Cloud Storage

Media is stored on **Cloudinary**.

- In development, files are held with `multer.memoryStorage()` and streamed to Cloudinary.
- **Local disk storage is not used**, which keeps ephemeral hosts (e.g. Render) working.
- Required: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

## Optional LingQ integration

- **Hints:** `GET /vocab/hints` can call LingQ's API using `LINGQ_TOKEN`, caching results in
  `external_hints_cache`. On an API failure it returns an empty array rather than a 500, so
  the vocabulary screen stays usable.
- **Import:** the `/library/lingq-*` routes use a user-supplied API key and may fall back to
  environment keys in `lingq.service.ts`.

## CORS

Wide open — `origin: '*'` with a fixed method and header allow-list. Tighten before any
deployment that is not purely server-rendered.

## Keep-alive

If `RENDER_EXTERNAL_URL` is set, the server pings its own `/api/v1/health` every 10 minutes
to stop the host from idling the free tier out. It is a no-op when that variable is absent.

## Environment variables

| Variable | Used for | Default |
|---|---|---|
| `DATABASE_URL` | Database connection | `file:sqlite.db` |
| `DATABASE_AUTH_TOKEN` | Auth token for a remote database | — |
| `JWT_SECRET` | Token signing key | — (required) |
| `PORT` | HTTP port | `3000` |
| `NODE_ENV` | Enables static SPA serving when `production` | — |
| `RENDER_EXTERNAL_URL` | Enables the keep-alive self-ping | — |
| `CLOUDINARY_*` | Image/audio uploads (3 vars) | — |
| `LINGQ_TOKEN` | Optional LingQ vocabulary hints | — |
| `MAX_LOGIN_ATTEMPTS` | Login failures per account | `5` |
| `LOGIN_LOCKOUT_MINUTES` | Lockout duration | `15` |
| `MAX_LOGIN_ATTEMPTS_PER_IP` | Login failures per IP | `max(…×4, 20)` |
| `AVAILABILITY_RATE_LIMIT` | Availability requests per IP per window | `30` |
| `AVAILABILITY_RATE_WINDOW_SECONDS` | That window | `60` |

See [`../.env.example`](../.env.example) for a copyable template.

## Scripts

```bash
npm run dev          # tsx watch src/server.ts
npm run build        # tsc → dist/
npm run start        # node dist/server.js
npm run lint         # eslint src
npm run db:generate  # drizzle-kit generate
npm run db:migrate   # apply migrations (needs committed migration files)
npm run db:push      # push schema.ts straight to the database
npm run db:reset     # destructive reset
npm run seed         # populate languages
```
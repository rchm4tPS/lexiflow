# Lexiflow

A full-stack language-learning web app inspired by [LingQ](https://www.lingq.com): read
lessons with clickable words, track **LingQs** (words you are learning), known vocabulary,
phrases, courses, streaks, and daily goals. The UI is a React 19 + Vite SPA; the API is
Express 5 with SQLite via Drizzle ORM (Turso/LibSQL in production).

## Features

- **Account & profile** — Two-step sign-up, JWT login (7-day tokens), **multi-language
  enrolment**, daily goal tier, streaks and daily stats (listening, words read, LingQs
  created/learned).
- **Library** — Own courses, guided course catalog, lesson feed, "continue studying",
  bookmarks, completion progress, per-language filtering.
- **Reader** — Tokenized lessons with word states (new / learning / known), phrase LingQs,
  audio, pagination, swipe-to-turn-page, coins for stage progression.
- **Vocabulary & phrases** — Searchable lists, tags, hints (optional LingQ API + cache),
  batch operations, Markov-style learning insights on the profile.
- **Import — two independent paths**
  - *Manual*: the user writes or pastes their own text. Create a course, then submit the
    text — the endpoint creates the lesson **and** tokenizes it.
  - *LingQ*: the user supplies a LingQ API key. Browse recommended courses, tick a batch
    (max 10, also the daily quota) and import exactly what was chosen.
- **Uploads** — Authenticated image/audio uploads to Cloudinary.
- **Analytics** — Streaks, daily-goal progress and 30-day activity charts.

## Tech stack

| Layer | Choices |
|---|---|
| Frontend | React 19, Vite 8, TypeScript 5.9, Tailwind CSS 4, Zustand 5, React Router 7, Recharts, lucide-react, sweetalert2 |
| Backend | Node 20, Express 5, TypeScript, Drizzle ORM, LibSQL/Turso or SQLite, jsonwebtoken, bcryptjs, Cloudinary, Swagger UI |
| Testing | Playwright (Chromium) |
| CI | GitHub Actions |

## Repository layout

```
lexiflow/
├── src/                        # React frontend
│   ├── api/                    # apiClient (single network boundary) + auth event bus
│   ├── features/               # auth, library, reader, lesson, vocabulary, import, profile
│   ├── components/             # layout, ui, common
│   ├── views/                  # one component per route
│   ├── store/                  # useAuthStore, useReaderStore
│   ├── hooks/  constants/  types/
│   └── App.tsx  main.tsx
├── backend/
│   ├── drizzle.config.ts       # Drizzle Kit config (note: .config, not -config)
│   ├── drizzle/                # generated migrations (gitignored — see below)
│   └── src/
│       ├── server.ts           # entry: cors, swagger, /api/v1, static SPA, keep-alive
│       ├── routes/             # auth, library, reader, vocab, phrases, upload
│       ├── middleware/         # JWT auth + rate limiters (login, per-IP)
│       ├── constants/          # levels, tiers, rateLimits
│       ├── db/                 # schema, client, migrate, push, seed, reset
│       ├── services/           # LingQ import, learning analytics, vocab history
│       └── utils/              # validation, timezone, lesson/translation parsers, stats
├── tests/                      # Playwright specs (pw-01…pw-03, api-errors, auth)
├── docs/
│   ├── openapi.yaml            # OpenAPI 3 spec — machine-readable source of truth
│   ├── API.md                  # Narrative API guide, auth, rate limits, error shapes
│   ├── BACKEND.md              # Backend architecture, database, env vars, scripts
│   ├── FRONTEND.md             # Routing, session lifecycle, state, API client
│   ├── CONTRIBUTING.md         # Workflow, conventions, testing, security notes
│   └── QA-TRACEABILITY.md      # Manual TC ↔ automated PW coverage matrix
├── .github/workflows/ci.yml    # Lint → build → seed → start app → Playwright → artifacts
├── Dockerfile                  # Multi-stage: Vite build + API + static SPA
├── docker-compose.yml          # backend + frontend services
└── package.json                # Root scripts and frontend dependencies
```

## Getting started

### Prerequisites

- Node.js 20+ (matches CI)
- npm

### Local development (recommended)

Run the API and the Vite dev server in two terminals.

1. **Backend**

   ```bash
   cd backend
   cp .env.example .env        # set JWT_SECRET (required for login)
   npm install
   npm run db:push              # create/update tables from schema.ts
   npm run dev
   ```

   > **Use `db:push`, not `db:migrate`.** `backend/drizzle/migrations` is gitignored, so
   > migration files are absent on a fresh clone and `db:migrate` fails with
   > *"No file … found in ./drizzle/migrations"*. `db:push` applies `schema.ts` directly.

2. **Frontend** (repository root)

   ```bash
   npm install
   npm run dev
   ```

3. **Seed languages** (needed for registration to succeed)

   ```bash
   cd backend && npm run seed
   ```

   Seeds from the LingQ API, falling back to a built-in list if it is unreachable.

The frontend calls the **relative** path `/api/v1/…`. Vite proxies `/api` to
`VITE_API_URL` (default `http://localhost:3000`). A trailing `/api/v1` on that variable is
stripped automatically — see the comment in `vite.config.ts`.

### Running the tests

The suite needs a seeded database; Playwright starts both servers itself.

```bash
cd backend
DATABASE_URL="file:./localtest.db" npx drizzle-kit push --force
DATABASE_URL="file:./localtest.db" npm run seed
cd ..

DATABASE_URL="file:./localtest.db" npm test
```

> `db:push --force` **drops and recreates** the schema, wiping seeded rows. Seed afterwards
> every time, or registration fails with `Language "es" is not supported`.

### Production-style build (local)

```bash
npm run install-all     # installs root + backend dependencies
npm run build           # frontend typecheck + bundle → dist/
npm run build-backend   # backend compile → backend/dist
```

The server serves the SPA from `../public` relative to `backend/dist` when
`NODE_ENV=production`. The Dockerfile does this automatically.

### Docker

```bash
docker compose build
docker compose up
```

- **Ports:** `3000` (API) and `5173` (frontend).
- **Environment:** set `JWT_SECRET`, and either `DATABASE_URL=file:../sqlite.db` (local
  SQLite) or a Turso URL plus `DATABASE_AUTH_TOKEN`.

## Environment variables

Both `.env.example` files document these. The root one also carries `VITE_API_URL`.

### Frontend

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Proxy target for the dev server. Origin only, or origin + `/api/v1` — both work. Default `http://localhost:3000`. |

### Backend

| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | HTTP port | `3000` |
| `NODE_ENV` | `production` enables static SPA serving | — |
| `JWT_SECRET` | Token signing key (**required** for login) | — |
| `DATABASE_URL` | `file:…` for local SQLite, otherwise a Turso URL | `file:sqlite.db` |
| `DATABASE_AUTH_TOKEN` | Only used for a remote database | — |
| `CLOUDINARY_NAME` / `_API_KEY` / `_API_SECRET` | Image and audio uploads | — |
| `LINGQ_TOKEN` | Optional server-side vocabulary hints | — |
| `RENDER_EXTERNAL_URL` | Enables the keep-alive self-ping (no-op otherwise) | — |
| `MAX_LOGIN_ATTEMPTS` | Failed logins per `(email, ip)` before lockout | `5` |
| `LOGIN_LOCKOUT_MINUTES` | Lockout duration | `15` |
| `MAX_LOGIN_ATTEMPTS_PER_IP` | Failed logins per IP across any address | `max(…×4, 20)` |
| `AVAILABILITY_RATE_LIMIT` | Availability-lookup requests per IP per window | `30` |
| `AVAILABILITY_RATE_WINDOW_SECONDS` | That window | `60` |

> `DATABASE_URL` must begin with `file:` for local SQLite. Anything else is treated as a
> remote URL and `DATABASE_AUTH_TOKEN` is attached to it.

Never commit a real `.env`. Both `.env` files are gitignored.

## API documentation

- **Spec:** [`docs/openapi.yaml`](docs/openapi.yaml) — Swagger Editor, Redoc, or codegen.
- **Interactive UI:** with the backend running, open **http://localhost:3000/api-docs**.
  The server loads the spec from `docs/openapi.yaml`, or from `openapi.yaml` beside the
  compiled output in the Docker image; if it cannot find it, the API still runs.
- **Narrative guide:** [`docs/API.md`](docs/API.md).

## Scripts

| Root | Purpose |
|------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production bundle |
| `npm run build-backend` | Compile the backend |
| `npm run build-all` | Both builds |
| `npm run lint` | ESLint across the repo |
| `npm test` | Playwright suite |

Backend scripts are listed in [`docs/BACKEND.md`](docs/BACKEND.md).

## CI

`.github/workflows/ci.yml` runs on every push and pull request to `main`:

lint → build frontend and backend → push schema + seed → install browsers → **start the app
and poll `/api/v1/health`** → Playwright → upload the HTML report (and traces on failure).

Failures on a pull request leave a `playwright-traces` artifact containing screenshots and
the trace, so a red build is diagnosable from the Actions tab alone.

## Known limitations

- **Logout is client-side.** The JWT is not revoked server-side and stays valid for its
  full 7-day lifetime even after the user logs out.
- **`GET /auth/info/{userId}` is unauthenticated** and does not verify that the caller owns
  the id.
- **Rate-limit and session state are in-memory and per-process** — a multi-instance
  deployment would need shared storage.
- **`drizzle/migrations` is gitignored**, so schema changes rely on `db:push`.

Planned work is tracked in [`.claude/plans/`](.claude/plans/).

## Contributing

See [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) for workflow, local checks, testing
conventions, and the TC-\*/PW-\* test-case ID scheme.

## Further reading

- [`docs/BACKEND.md`](docs/BACKEND.md) — architecture, database, rate limits, env vars.
- [`docs/FRONTEND.md`](docs/FRONTEND.md) — routing, session lifecycle, state, API client.
- [`docs/QA-TRACEABILITY.md`](docs/QA-TRACEABILITY.md) — what is automated, what is not.

## License

ISC — see `package.json` and `backend/package.json`.
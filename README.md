# Lexiflow

A full-stack language-learning web app inspired by [LingQ](https://www.lingq.com): read lessons with clickable words, track **LingQs** (words you are learning), known vocabulary, phrases, courses, streaks, and daily goals. The UI is a React (Vite) SPA; the API is Express with SQLite (Drizzle ORM).

## Features

- **Account & profile** — Sign up, JWT login, target language, daily goal tier, streaks and daily stats (listening, words read, LingQs created/learned).
- **Library** — Own courses, guided course catalog, lesson feed, “continue studying”, bookmarks, completion progress.
- **Reader** — Tokenized lessons with word states (new / learning / known), phrase LingQs, audio, pagination, keyboard shortcuts, coins for stage progression.
- **Vocabulary & phrases** — Searchable lists, tags, hints (optional LingQ API + cache), batch operations, Markov-style learning insights on the profile.
- **Import** — Create lessons from raw text; optional one-time import of recommended content from LingQ (per language) using a user API key.
- **Uploads** — Authenticated image/audio uploads for lesson metadata.

## Repository layout

```
lingq-clone/
├── src/                    # React app (views, features, stores, API client)
├── backend/
│   ├── src/
│   │   ├── routes/         # Express routers (auth, library, lessons, vocab, phrases, upload)
│   │   ├── db/             # Drizzle schema, migrations, seed
│   │   ├── middleware/     # JWT authentication
│   │   ├── services/       # LingQ import, analytics, vocab history
│   │   └── utils/          # Lesson parsing, stats engine
│   └── uploads/            # Local image/audio storage (created at runtime)
├── docs/
│   ├── openapi.yaml        # OpenAPI 3 specification (Swagger)
│   ├── API.md              # API overview and links
│   ├── BACKEND.md          # Backend module notes
│   ├── FRONTEND.md         # Frontend module notes
│   └── CONTRIBUTING.md     # Contribution guidelines
├── Dockerfile              # Multi-stage: Vite build + API + static SPA in production
├── docker-compose.yml      # Single service with SQLite on a volume
└── package.json            # Root scripts and frontend dependencies
```

## API documentation (Swagger / OpenAPI)

- **Spec file:** [`docs/openapi.yaml`](docs/openapi.yaml) — use in [Swagger Editor](https://editor.swagger.io), Redoc, or codegen tools.
- **Interactive UI:** With the backend running, open **http://localhost:3000/api-docs** (Swagger UI). The server loads the spec from `docs/openapi.yaml` (local dev) or `openapi.yaml` next to the compiled output (Docker image).

See [`docs/API.md`](docs/API.md) for a short endpoint map and authentication notes.

## Getting started

### Prerequisites

- Node.js 20+ (matches [CI](.github/workflows/ci.yml))
- npm

### Local development (recommended)

Run the API and the Vite dev server in two terminals. The frontend is configured to call `http://localhost:3000/api/v1` (see `src/api/client.ts`).

1. **Backend**

   ```bash
   cd backend
   cp .env.example .env
   # Edit .env — set JWT_SECRET (required for auth)
   npm install
   npm run db:migrate   # if your clone expects migrations applied
   npm run dev
   ```

   SQLite file path defaults to `DATABASE_URL` or `sqlite.db` in the **current working directory** (usually `backend/` when you run `npm run dev`).

2. **Frontend** (repository root)

   ```bash
   npm install
   npm run dev
   ```

   Open the URL Vite prints (typically http://localhost:5173).

3. **Optional seed data**

   ```bash
   cd backend && npm run seed
   ```

### Production-style build (local)

```bash
npm run install-all
npm run build
npm run build-backend
```

Copy the SPA into the folder the server expects (`../public` relative to `backend/dist`):

```bash
rm -rf backend/public && mkdir -p backend/public && cp -r dist/* backend/public/
cd backend && NODE_ENV=production node dist/server.js
```

The Docker image performs the equivalent layout automatically; for day-to-day work, **local dev with two terminals** is simpler.

### Docker

```bash
docker compose build
docker compose up
```

- **Port:** `3000` (API + SPA in production mode inside the container).
- **Environment:** Set a strong `JWT_SECRET` in `docker-compose.yml` (or override via env). `DATABASE_URL=/app/data/sqlite.db` keeps the database on the mounted `./data` volume.
- After dependency changes, run `npm install` in `backend/` so `package-lock.json` stays in sync (required for reproducible Docker builds).

## Environment variables (backend)

| Variable | Purpose |
|----------|---------|
| `PORT` | HTTP port (default `3000`) |
| `JWT_SECRET` | Signing key for JWTs (**required** for login) |
| `DATABASE_URL` | SQLite file path (default `sqlite.db`) |
| `LINGQ_TOKEN` / `LINGQ_API_KEY` | Optional; server-side hints and LingQ import helpers |
| `NODE_ENV` | `production` enables static SPA + stricter deployment assumptions |

Copy `backend/.env.example` to `backend/.env`.

## Contributing

See [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) for branch hygiene, CI, and code-style expectations.

## Further reading

- [`docs/BACKEND.md`](docs/BACKEND.md) — database, routes, uploads, migrations.
- [`docs/FRONTEND.md`](docs/FRONTEND.md) — routing, state, feature folders.

## License

See `backend/package.json` (ISC) and root `package.json` for package metadata.

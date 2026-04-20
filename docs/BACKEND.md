# Backend module

Express 5 + TypeScript, Drizzle ORM, **LibSQL / Turso** (or local SQLite). Entry point: `backend/src/server.ts`.

## Responsibilities

- **REST API** under `/api/v1` (routers in `backend/src/routes/`).
- **SQLite** persistence; schema in `backend/src/db/schema.ts`.
- **JWT** auth middleware: `backend/src/middleware/auth.ts` (`Authorization: Bearer …`).
- **OpenAPI + Swagger UI** — spec at repo `docs/openapi.yaml`; UI at `/api-docs` when the file is found at runtime.
- **Production SPA** — if `NODE_ENV=production` and `public/` exists next to `dist/`, static assets and SPA fallback are served (see Dockerfile layout).

## Database

- **File location:** Controlled by `DATABASE_URL` (default `sqlite.db` relative to the process working directory).
- **Migrations:** `npm run db:migrate` (`backend/src/db/migrate.ts`). Drizzle Kit config: `backend/drizzle.config.ts`.
- **Seed:** `npm run seed` (`backend/src/db/seed.ts`).

## Routes (file → mount path)

| File | Mount |
|------|--------|
| `auth.ts` | `/api/v1/auth` |
| `library.ts` | `/api/v1/library` |
| `reader.ts` | `/api/v1/lessons` |
| `vocab.ts` | `/api/v1/vocab` |
| `phrases.ts` | `/api/v1/phrases` |
| `upload.ts` | `/api/v1/upload` |

`reader.ts` implements lesson **reader**, **parse**, **edit**, **progress**, and **delete** despite the `/lessons` prefix.

## Uploads & Cloud Storage

The application uses **Cloudinary** for persistent media storage. 
- In development, files are uploaded via `multer.memoryStorage()` and streamed directly to Cloudinary.
- **Local storage is NOT used** for uploads to ensure compatibility with ephemeral environments like Render.
- Required Env: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

## Optional LingQ integration

- **Hints:** `GET /vocab/hints` can call LingQ’s API using `LINGQ_TOKEN` and cache results in `external_hints_cache`.
- **Import:** `POST /library/lingq-import` uses the user-supplied API key (and may fall back to env keys in `lingq.service.ts`).

## Scripts

```bash
npm run dev          # tsx watch src/server.ts
npm run build        # tsc → dist/
npm run start        # node dist/server.js
npm run db:generate  # drizzle-kit generate
npm run db:migrate
npm run db:push
npm run seed
```

# HTTP API overview

All versioned JSON endpoints live under **`/api/v1`**. The OpenAPI description is the source of truth for request/response shapes: [`openapi.yaml`](openapi.yaml).

## Base URL

| Context | Base |
|--------|------|
| Backend (Direct) | `http://localhost:3000/api/v1` |
| Frontend (Vite) | `http://localhost:5173/api` (proxied to backend) |
| Docker Compose | `http://localhost:5173/api` (Frontend) / `http://localhost:3000/api/v1` (Backend) |

## Authentication

Most routes expect:

```http
Authorization: Bearer <jwt>
```

Obtain `<jwt>` from **`POST /auth/login`** (`token` in the JSON body). Registration (**`POST /auth/register`**) returns a success message only; sign in afterward to get a token.

**`GET /auth/verify`** (with bearer token) reloads the signed-in user from the database and returns the same `user` fields as login (`id`, `username`, `email`, `fullName`, `preferences`). Clients should call it on startup to keep `localStorage` / session state in sync after a refresh.

**Public routes** (no bearer token in the current implementation) include:

- `GET /auth/languages`
- `POST /auth/register`, `POST /auth/login`
- `GET /auth/info/{userId}` (aggregated stats; treat as sensitive in production deployments)

## Quick endpoint map

| Area | Prefix | Examples |
|------|--------|------------|
| Health | — | `GET /health` |
| Auth | `/auth` | login, verify, preferences, profile insights, language reset |
| Library | `/library` | courses, feed, my-lessons, guided-courses, bookmarks, LingQ import |
| Lessons | `/lessons` | reader payload, parse, edit, progress, delete |
| Vocabulary | `/vocab` | list, upsert, batch, hints, tags, insights, batch delete |
| Phrases | `/phrases` | list, create, update, batch delete |
| Upload | `/upload` | `POST /image`, `POST /audio` (multipart field `file`) |

## Stats & Timezones

Endpoints that write to daily stats or streaks (e.g., `PUT /lessons/{id}/progress`, `POST /vocab/upsert`, `POST /phrases`) respect the **`x-timezone-offset`** header. This should be the client's UTC offset in minutes (e.g., `-420` for Jakarta). If omitted, UTC midnight is used.

## Static files & Uploads

Uploaded assets (images/audio) are stored on **Cloudinary CDN**. 
- The upload endpoints (**`POST /upload/image`**, **`POST /upload/audio`**) return an absolute Cloudinary URL.
- Local storage (`/uploads/...`) is **deprecated** and no longer served by the application.

## Swagger UI

Start the backend and open **http://localhost:3000/api-docs** to try requests interactively (authorize with your bearer token in the UI).

## External tools

- Import [`openapi.yaml`](openapi.yaml) into [Swagger Editor](https://editor.swagger.io) or run a local preview, e.g. `npx @redocly/cli preview-docs docs/openapi.yaml`.

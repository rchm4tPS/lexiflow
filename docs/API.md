# HTTP API overview

Narrative guide to the API. The OpenAPI description is the machine-readable source of
truth for request/response shapes: [`openapi.yaml`](openapi.yaml).

Every route the backend registers is now documented in the spec, and every path in the
spec corresponds to a real route.

## Base URL

| Context | Base |
|--------|------|
| Backend (direct) | `http://localhost:3000/api/v1` |
| Frontend (dev) | `http://localhost:5173/api/v1` — proxied to the backend by Vite |
| Docker Compose | same two, on the same ports |

The frontend always calls the **relative** path `/api/v1/...`. In development Vite proxies `/api` to `VITE_API_URL`; in production the built bundle is served by the backend on the same origin.

> **Gotcha:** Vite's proxy *prepends* the target's path. `VITE_API_URL` may therefore be given either as `http://localhost:3000` or `http://localhost:3000/api/v1` — a trailing `/api/v1` is stripped automatically. Setting it to anything else (e.g. including a path prefix beyond `/api/v1`) will produce `/api/v1/api/v1/...` and a 404.

## Authentication

Most routes expect:

```http
Authorization: Bearer <jwt>
```

Obtain `<jwt>` from **`POST /auth/login`** (`token` in the JSON body). Registration (**`POST /auth/register`**) returns a success message only; sign in afterward to get a token.

**`GET /auth/verify`** (with bearer token) reloads the signed-in user from the database and returns the same `user` fields as login (`id`, `username`, `email`, `fullName`, `preferences`). Clients call it on startup to revalidate the stored token after a refresh.

### Public routes (no bearer token)

| Route | Purpose | Note |
|---|---|---|
| `POST /auth/register` | Create an account | |
| `POST /auth/login` | Exchange credentials for a token | Rate limited — see below |
| `GET /auth/languages` | Languages the app supports | |
| `GET /auth/info/{userId}` | Aggregated profile + stats | **Sensitive** — takes a user id as a path parameter and does not verify ownership. Treat as a hardening item. |
| `POST /auth/check-availability` | Is this username/email free? | Rate limited. See below. |
| `GET /auth/login-lockout` | Am I currently locked out? | Rate limited. See below. |

### Rate limiting

Three throttles protect authentication. All are configurable — see
[`../.env.example`](../.env.example) and `backend/src/constants/rateLimits.ts`.

| Scope | Key | Env vars | Default |
|---|---|---|---|
| Login, per account | `(email, ip)` | `MAX_LOGIN_ATTEMPTS`, `LOGIN_LOCKOUT_MINUTES` | 5 failures / 15 min |
| Login, per IP | `ip` | `MAX_LOGIN_ATTEMPTS_PER_IP` | `max(MAX_LOGIN_ATTEMPTS × 4, 20)` |
| Availability lookup | `ip` | `AVAILABILITY_RATE_LIMIT`, `AVAILABILITY_RATE_WINDOW_SECONDS` | 30 per 60 s |

Responses:

- **Login lockout** — `429` with `{ error, code: "LOCKED_OUT", retryAfter }` (seconds). `retryAfter` lets a client resume the countdown after a reload.
- **Availability throttle** — `429` with `{ error, code: "RATE_LIMITED", retryAfter }`.

The IP-wide login bucket exists so an attacker cannot sidestep the per-account limit by rotating email addresses.

### Registration validation

`POST /auth/register` rejects invalid input with `400` and a **per-field** error map, so a form can highlight the offending input:

```json
{
  "error": "Username must be 20 characters or fewer.",
  "errors": { "username": "Username must be 20 characters or fewer." }
}
```

Rules enforced (identically on the client):

| Field | Rules |
|---|---|
| `username` | 3–20 chars; ASCII letters, digits, underscore only; must contain at least one letter. Compared case-insensitively for uniqueness. |
| `fullName` | 2–100 chars; letters (any script, including accents/umlauts), spaces, apostrophes and hyphens. No digits or other symbols. |
| `email` | Local part of `[A-Za-z0-9._%+-]` segments, then a dotted domain ending in an alphabetic TLD. Rejects `=`, `}`, `"`, `|`, `\` and similar, which RFC 5322 permits but no mail provider issues. Max 254 total, 64 in the local part. |
| `password` | 6–128 characters. **Not trimmed** — leading/trailing spaces are significant. |
| `targetLanguages` | At least one, at most 10 distinct codes, all supported. |

Outer whitespace on `username`, `fullName` and `email` is **trimmed before validation and before storage**.

### Duplicate registration

A username or email that is already taken returns **`409`** with a per-field message
(`"That username is already taken…"`, `"An account with this email already exists."`).
Both are matched case-insensitively. The unique-constraint violation is parsed from the
driver's error chain — a `DrizzleQueryError` wraps the real `LibsqlError`, so the
`cause` chain has to be walked to find it.

`POST /auth/check-availability` offers the same answer early, while the user is still on
step 1 of the sign-up form. It is advisory only: `/register` re-checks and owns the
authoritative answer, because two people can pick the same name between the two calls.

### Multiple target languages

`targetLanguages` is an array. The **first entry becomes the user's primary language**
and is stored in `preferences.targetLanguage`; a `user_languages` and a `streaks` row are
written per language, so per-language stats keep working.

The singular `targetLanguage` is still accepted for backward compatibility with older
clients.

## Quick endpoint map

| Area | Prefix | Examples |
|------|--------|------------|
| Health | — | `GET /health` |
| Auth | `/auth` | login, register, verify, check-availability, login-lockout, logout, preferences, profile insights, language reset |
| Library | `/library` | courses, feed, my-lessons, guided-courses, bookmarks, LingQ discovery and import |
| Lessons | `/lessons` | reader payload, parse, edit, progress, reset, delete |
| Vocabulary | `/vocab` | list, upsert, batch, hints, tags, insights, batch delete |
| Phrases | `/phrases` | list, create, update, batch delete |
| Upload | `/upload` | `POST /image`, `POST /audio` (multipart field `file`) |

### The two import paths

Both exist, are independent, and never overlap.

**Manual import** — the user writes or pastes their own text. Nothing is fetched
externally.

| Step | Endpoint |
|---|---|
| 1. Create the destination course | `POST /library/courses` |
| 2. Submit the text | `POST /lessons/parse` |
| 3. (optional) revise | `PUT /lessons/{id}` |

`POST /lessons/parse` is named for tokenization but does **both** jobs — it inserts the
lesson row *and* tokenizes `rawText` into LingQ tokens and phrases. It returns `lessonId`
plus the generated tokens. `courseId` must reference a course the caller owns.

**LingQ import** — the user supplies a LingQ API key and content is pulled from LingQ.

| Step | Endpoint |
|---|---|
| 1. See what's already imported | `GET /library/lingq-imported-ids` |
| 2. Browse recommended courses | `GET /library/lingq-courses` |
| 3. Browse lessons in a course | `GET /library/lingq-lessons` |
| 4. Import the chosen batch | `POST /library/lingq-import-selected` |
| 5. (optional) fetch a translation | `GET /library/lingq-translation/{lessonId}` |

Import is **discover-then-select**, not a bulk copy: `POST /library/lingq-import-selected`
takes the exact batch the user ticked, at most 10 per call (which is also the daily quota).
It returns a single JSON result — an earlier bulk endpoint that streamed newline-delimited
progress logs no longer exists.

### `POST /auth/logout`

This endpoint **requires a valid bearer token and performs no server-side invalidation** —
it returns a message only. It is not called by the frontend; the SPA logs out by discarding
the token from `localStorage`. Until server-side invalidation exists (a `token_version`
column or a revocation list), a leaked token remains usable until its 7-day expiry.

## Stats & Timezones

Endpoints that write to daily stats or streaks (e.g., `PUT /lessons/{id}/progress`,
`POST /vocab/upsert`, `POST /phrases`) respect the **`x-timezone-offset`** header. This
should be the client's UTC offset in minutes (e.g. `-420` for Jakarta). If omitted, UTC
midnight is used.

## Static files & Uploads

Uploaded assets (images/audio) are stored on **Cloudinary CDN**.
- `POST /upload/image` and `POST /upload/audio` return an absolute Cloudinary URL.
- Files are held in memory (`multer.memoryStorage()`) and streamed straight to Cloudinary —
  nothing is written to local disk, which keeps ephemeral hosts (e.g. Render) working.
- Local storage (`/uploads/...`) is **deprecated** and no longer served.

## Error shapes

| Status | Meaning | Body |
|---|---|---|
| `400` | Validation failed | `{ error, errors: { field: message } }` |
| `401` | Bad or missing credentials | `{ error, code }` |
| `404` | Not found | `{ error }` |
| `409` | Duplicate username / email | `{ error, errors: { field } }` |
| `429` | Rate limited | `{ error, code, retryAfter }` |
| `500` | Unexpected server fault | Generic message; the real cause is logged server-side and **not** returned |

Authentication failures from `authenticate` are always `401` with a machine-readable
`code`: `NO_TOKEN`, `TOKEN_EXPIRED` or `TOKEN_INVALID`. Clients use this to distinguish
an expiry (worth telling the user about) from a corrupt token.

## Swagger UI

Start the backend and open **http://localhost:3000/api-docs**. The UI is only mounted when
`docs/openapi.yaml` can be located at runtime; if it is missing the API still runs and a
warning is logged.

## External tools

- Import [`openapi.yaml`](openapi.yaml) into [Swagger Editor](https://editor.swagger.io)
- Preview locally: `npx @redocly/cli preview-docs docs/openapi.yaml`
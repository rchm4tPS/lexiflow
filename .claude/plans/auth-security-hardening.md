# Auth Security Hardening — Deferred Work

Two related gaps found while documenting the API. Neither is a crash or a broken
flow; both are **disclosure and lifetime** problems on the authentication path.
Both were deliberately left unimplemented — they are schema/API design decisions,
not test-automation fixes.

**Status:** planned, not started.
**Related:** [`docs/API.md`](../../docs/API.md), [`docs/BACKEND.md`](../../docs/BACKEND.md),
[`docs/CONTRIBUTING.md`](../../docs/CONTRIBUTING.md) all currently describe the
current (unhardened) behaviour.

---

## Item 1 — `GET /auth/info/{userId}` has no ownership check

### Current state

`backend/src/routes/auth.ts:97` registers the route with **no `authenticate`
middleware**. Any caller who knows a user id receives that user's aggregated
profile: streak, daily totals, coin balance, vocabulary counts, 7-day and 30-day
activity charts, and enrolled languages.

```ts
router.get('/info/:userId', async (req: AuthRequest, res) => {   // no `authenticate`
  const userId = req.params.userId;}
)
```

### Why it matters

* **Information disclosure.** Progress, balance and study habits are personal.
* **Enumeration.** The route accepts arbitrary ids, so it doubles as a "does this
  user exist" oracle (404 vs 200).
* Ids are UUIDv4, so they are not practically guessable — but they do leak
  through URLs, logs, browser history and shared links.

### Callers (verified — nothing legitimately breaks)

| Caller | Sends a token? | Uses its own id? |
|---|---|---|
| `useReaderStore.initializeUserState(user.id)` | yes | yes |
| `App` on session revalidation | yes | yes |

Every legitimate call already has a valid token **and** passes its own id. So
adding an ownership check breaks no known client.

### Recommendation

Make it authenticated and verify ownership.

```ts
router.get('/info/:userId', authenticate, async (req: AuthRequest, res) => {
  if (req.user?.id !== req.params.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  ...
```

**Why not just authenticate?** Because any authenticated user could then read any
*other* user by id. The id comparison is the part that matters.

**Consider also** normalising 403 vs 404. Returning `404` for another user's id
avoids confirming the account exists, at the cost of a slightly less honest
error. Either is defensible; pick one and be consistent.

### Changes by file

| File | Change |
|---|---|
| `backend/src/routes/auth.ts` | Add `authenticate`; compare `req.user.id` to `req.params.userId` |
| `docs/openapi.yaml` | Remove "public route" wording from `/auth/info/{userId}`; add `security: [bearerAuth]` and a `403` response |
| `docs/API.md` | Move it out of the public-routes table; update the sensitivity note |
| `docs/CONTRIBUTING.md` | Remove the "treat as sensitive" bullet under Security |
| `tests/` | See test plan below |

### Test plan

Two Playwright cases, and both need care:

* `PW-023` — a logged-in user can load their own info. (Positive control; proves
  the new guard does not over-block.)
* `PW-024` — a logged-in user requesting **another** user's id gets 403.

Use two API-created fixtures (`createUser` in `tests/fixtures.ts`) and drive the
second request with `page.request` carrying fixture A's token and fixture B's id,
so the test does not depend on UI navigation.

Update `docs/QA-TRACEABILITY.md` — **TC-AUTH-047…050 are currently marked
Manual** and cover related widget content. This item does not close them, so
their status should stay Manual; record the new PW ids separately.

### Risk

Low. The only risk is an unknown client calling it unauthenticated. The frontend
call site was verified above.

---

## Item 2 — No server-side JWT revocation

### Current state

`POST /auth/logout` (`backend/src/routes/auth.ts:559`) requires a valid token
and returns a message. It invalidates nothing:

```ts
// For JWT, logout is handled client-side by discarding the token
// In a production app, you might want to implement token blacklisting
```

The frontend does not even call it. `useAuthStore.logout()` removes
`lingq_token` / `lingq_user` from `localStorage`, bumps the client-side session
epoch, and resets the reader store.

Tokens are signed with `expiresIn: '7d'` and there is no revocation list and no
token version on the user record.

### Why frontend-only is not sufficient

Clearing `localStorage` correctly signs **that browser** out. It does nothing
about:

* a token copied out of devtools **before** the user logged out
* a token exfiltrated via XSS or a malicious extension
* a shared, sold, or cache-restored device

In every one of those cases the token keeps working from anywhere until natural
expiry — up to **7 days**. Client-side clearing is necessary but not sufficient.

### Option A — `token_version` on the user record (recommended)

1. Add `token_version INTEGER NOT NULL DEFAULT 0` to `users`
   (`backend/src/db/schema.ts`).
2. Put `tv` in the JWT payload at login (`POST /auth/login`).
3. In `authenticate`, load the user's current `token_version` and reject on
   mismatch with `401` + `code: "TOKEN_INVALID"`.
4. On logout, `UPDATE users SET token_version = token_version + 1`.

**Why this one.** It works across every device and every process instance, needs
no new infrastructure, and one increment invalidates a user's *entire* token
family instantly — which is usually what someone means by "log me out".

**Cost.** One indexed column read per authenticated request. Acceptable here:
most routes already hit the database.

**Caveat.** Logout-from-one-device logs the user out **everywhere**. If
per-device logout is wanted later, move the version onto a per-device row
instead of `users`.

### Option B — in-memory deny-list of revoked JTIs

Keep a `Set` of revoked token ids until their natural expiry.

* **Pro:** no schema change, cheap.
* **Con:** resets on every deploy, and is per-process — so it does **not** work
  across multiple instances. The login rate-limit state already has exactly this
  limitation; reusing the pattern would inherit it.

Only reasonable as a stopgap for a single-instance deployment.

### Option C — refresh tokens (larger change)

Access token ~15 min + long-lived refresh token; revocation becomes "deny the
refresh token". This also fixes the 7-day exposure rather than shortening it.

More work, and it introduces refresh-token storage and rotation concerns. Best
combined with Option A — version the refresh token instead of the access token.

### Recommendation

**Option A now**, Option C later if the 7-day window is the real concern.
Independent of either, **shorten `expiresIn` from `7d` to something shorter** —
that alone meaningfully reduces the exposure window and is a one-line change.

### Changes by file

| File | Change |
|---|---|
| `backend/src/db/schema.ts` | Add `token_version` to `users` |
| `backend/src/routes/auth.ts` | Issue `tv` in the JWT; increment it on logout |
| `backend/src/middleware/auth.ts` | Compare `tv` against the stored value → `401 TOKEN_INVALID` |
| `src/services/userService.ts` | **Optionally** add `logout()` that actually calls the endpoint |
| `src/store/useAuthStore.ts` | Call it fire-and-forget during logout |
| `docs/openapi.yaml` | `/auth/logout` — remove "performs no server-side invalidation" |
| `docs/API.md`, `BACKEND.md`, `CONTRIBUTING.md` | Remove the corresponding caveats |
| `.env.example` | If token lifetime becomes configurable, add it |

### Migration note — read before starting

`drizzle/migrations` is **gitignored**, so `npm run db:migrate` fails on a clean
checkout, and CI initialises with `db:push`. Adding a column therefore means:

* local: `DATABASE_URL=… npx drizzle-kit push`
* CI / production: `db:push` already covers it, **but** `push` alters the table
  in place and cannot be relied on for a data-preserving production change
  without review.

Decide deliberately whether this project should commit migration files going
forward. That decision is a prerequisite for the item, not part of it.

### Test plan

* `PW-025` — after logout, the same token is rejected by a protected endpoint
  with `401`. Currently this **passes vacuously** because the frontend discards
  the token; it must be driven by replaying a captured token via `page.request`.
* `PW-026` — tokens issued before a version bump are rejected after it.

Both need the raw token, so capture it from `localStorage` before logging out.

---

## Sequencing

1. Item 1 first — small, isolated, no schema, no migration question.
2. Decide the migration policy for Item 2.
3. Item 2, then consider Option C.

## Open questions for the owner

* Should logout invalidate the user's tokens on **all** devices, or only the
  current one? This decides Option A on `users` vs on a per-device row.
* Is 7 days the intended session lifetime, or just a default nobody revisited?
* Is `POST /auth/logout` expected to be part of the public API contract, or is
  client-side logout acceptable as the documented behaviour?
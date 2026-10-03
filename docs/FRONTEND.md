# Frontend module

React 19 + TypeScript, Vite 8, Tailwind CSS 4, Zustand 5, React Router 7.

## Entry and routing

- **Bootstrap:** `src/main.tsx` (wrapped in `<StrictMode>`), `src/App.tsx`.
- **Authenticated area:** everything under `/me/:lang/…`, rendered inside `MainLayout`
  (`src/components/layout/MainLayout.tsx`), which provides the scrolling `<main>`, the
  `Header` and the mobile `BottomNav`.

| Path | View | Purpose |
|---|---|---|
| `/login` | `LoginView` | Public; redirects to the workspace if already authenticated |
| `/signup` | `SignUpView` | Public; two-step registration |
| `/` | — | Redirects to `/me/:lang` |
| `/me/:lang` | — | Redirects to `library` |
| `/me/:lang/library` | `LibraryView` | Lesson feed / guided courses, with a left sidebar of tabs |
| `/me/:lang/library/guided` | `LibraryView` | Guided-course feed |
| `/me/:lang/course/:courseId` | `LibraryView` | Lessons inside a course |
| `/me/:lang/my-lessons` | `LibraryView` | Continue studying |
| `/me/:lang/my-lessons/completed` | `LibraryView` | Completed lessons |
| `/me/:lang/vocabulary` | `LibraryView` → `VocabularyView` | Vocabulary table and toolbar |
| `/me/:lang/reader/:lessonId` | `ReaderView` | The reader |
| `/me/:lang/import` | `ImportLessonView` | Manual or LingQ import |
| `/me/:lang/import/edit/:lessonId` | `EditLessonView` | Edit an existing lesson |
| `/me/:lang/metrics` | `MetricsView` | Progress and analytics charts |
| `/me/:lang/profile` | `ProfileView` | Profile and logout |

The `:lang` segment is a source of truth, not decoration — `MainLayout` syncs it into the
store, and `App` falls back to `en` when no language is resolved.

## Session lifecycle

`App` holds the session in one of three states (`status` in `useAuthStore`):

| State | When | What renders |
|---|---|---|
| `loading` | A token exists but has not been re-verified | A "Checking your session…" splash |
| `authenticated` | `GET /auth/verify` succeeded | The protected routes |
| `anonymous` | No token, or verification failed | The public routes |

Routing on the *verified* state rather than on token presence is deliberate: deciding from
`localStorage` alone briefly renders a protected shell behind a dead token and then crashes
React with *"Rendered more hooks than during the previous render"*.

Every route hook in `App` sits **above** all early returns, for the same reason.

Any `401` from a protected endpoint ends the session immediately via
`src/api/authEvents.ts` → `endSession()`, which clears stored keys, resets the reader store
and routes to `/login` with an explanation. That is what turns an expired token into a
redirect instead of a stuck screen — including when the token is corrupted mid-session.

## State

| Store | Owns |
|---|---|
| `src/store/useAuthStore.ts` | Session: token, user, `status`, sign-in, sign-out, forced sign-out |
| `src/store/useReaderStore.ts` | Reader and library data: tokens, phrases, pagination, per-language stats, streaks, recent lessons |

Persisted under `localStorage`:

| Key | Contents |
|---|---|
| `lingq_token` | JWT |
| `lingq_user` | Cached user object |
| `lingq_last_login_email` | Pre-fills the login form; cleared whenever that session ends |

`useAuthStore` owns these keys in one place so logout, expiry and failed verification all
clear the same set.

### Session epoch

`apiClient` stamps every request with a `sessionEpoch` counter. When a session ends, the
counter is bumped and any response still in flight is discarded rather than being allowed
to write the previous account's data back into a store. It is **not** bumped on an
anonymous boot — there is no session to protect there, and doing so raced the lockout and
availability checks the login and sign-up screens fire on mount.

## API client

`src/api/client.ts` is the only place that talks to the network.

- **Base URL is always relative** (`/api/v1`). In development Vite proxies `/api` to
  `VITE_API_URL`; in production the bundle is served by the backend on the same origin.
- `VITE_API_URL` may end in `/api/v1` or not — `vite.config.ts` strips a trailing
  `/api/v1` because the proxy prepends the target's path and would otherwise produce
  `/api/v1/api/v1/...`.
- `VITE_API_URL` is the **only** environment variable the frontend reads.
- Every request carries `x-timezone-offset` so the server can compute the user's local
  day boundary.

### Error handling

| Situation | What the user sees |
|---|---|
| Field validation | `{ error, errors: { field } }` — each message renders beside its own input |
| `401` on a protected route | Session ends, redirect to `/login` with a reason |
| `502` / `503` / `504` | "The server is temporarily unavailable. Please try again in a moment." |
| Network failure | "Can't reach the server. Check your connection and try again." |
| Anything else | Generic message; the real cause is logged to the console, never shown |

Unparseable responses are logged with status, reason phrase, content type and a truncated
body so a gateway failure can be told apart from an application fault.

## Feature folders

| Folder | Contents |
|---|---|
| `src/features/auth/` | Shared `InputField`, `validation.ts` (mirrors the server rules), `useAvailabilityCheck` |
| `src/features/library/` | Lesson/course cards, sidebar, Continue Studying, daily goal, level-range dropdown |
| `src/features/reader/` | Reader panes, word/phrase rendering, settings, lesson-end summary |
| `src/features/lesson/` | `LessonForm`, `LessonSidebar` — shared by import and edit |
| `src/features/vocabulary/` | Vocabulary table and toolbar |
| `src/features/import/` | LingQ import step, create-course modal |
| `src/features/profile/` | Profile pieces |

`src/views/` holds one component per route; `src/hooks/`, `src/constants/`, `src/types/`
and `src/components/` hold cross-cutting code.

## Registration and login behaviour

- Sign-up is two steps. Step 1 is validated field-by-field on Continue; step 2 collects
  target languages and a daily goal.
- **Target languages are multi-select.** The first selection becomes the primary language
  and is marked `1st`; the last remaining selection cannot be deselected.
- **Daily goal is single-select.**
- Username and email are checked for availability **as you type** (debounced 500 ms) and
  again on blur. This is advisory — `/auth/register` re-checks and owns the answer.
- Password and confirmation fields have a visibility toggle that is always rendered,
  independent of focus or whether the field has content.
- Login validates both fields client-side before dispatching, then rate-limits server-side.
  On lockout the submit button is disabled and counts down, and the countdown is restored
  from `GET /auth/login-lockout` when the page is reloaded mid-lockout.

## Testing

The suite is Playwright, organised by area, and kept deliberately small and deterministic —
see [`QA-TRACEABILITY.md`](QA-TRACEABILITY.md) for the mapping between automated and manual
cases.

```bash
npm test
npx playwright test tests/pw-02-login.spec.ts   # one area
npx playwright test --ui                          # interactive debugger
```

## Scripts (repository root)

```bash
npm run dev            # Vite dev server
npm run build          # typecheck + production bundle → dist/
npm run preview        # preview the production build
npm run lint           # ESLint
npm run build-all      # frontend + backend builds
npm run build-backend  # backend build only
npm test               # Playwright
```

Docker Compose (`docker-compose up`) runs both services together; the frontend container
sets `VITE_API_URL=http://localhost:3000/api/v1`.
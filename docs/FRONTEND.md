# Frontend module

React 19 + TypeScript, Vite 8, Tailwind CSS 4, Zustand, React Router 7.

## Entry and routing

- **Bootstrap:** `src/main.tsx`, `src/App.tsx`.
- **Authenticated area:** Routes under `/me/:lang/…` with `MainLayout` (`src/components/layout/MainLayout.tsx`).
- **Redirects:** `/` and post-login send users to `/me/{language}/library` (language comes from user state / URL).

| Path (under `/me/:lang`) | View / purpose |
|--------------------------|----------------|
| `library`, `my-lessons`, `vocabulary`, `course/:courseId` | `LibraryView` (tabs / course shell) |
| `reader/:lessonId` | `ReaderView` |
| `import`, `import/edit/:lessonId` | Import / edit lesson |
| `profile` | Profile and analytics |

## State

- **Auth:** `src/store/useAuthStore.ts` — token in `localStorage` (`lingq_token` key used by `src/api/client.ts`).
- **Reader / language:** `src/store/useReaderStore.ts` — syncs language and reader session with the API.

## API client

`src/api/client.ts` interacts with the backend. 
- **Production:** Uses relative paths (served from the same origin).
- **Development (Direct):** Defaults to `http://localhost:3000/api/v1`.
- **Development (Docker):** Vite proxies `/api` requests to the `backend` container via `vite.config.ts`.

## Feature folders

Code is grouped by domain under `src/features/` (`auth`, `library`, `reader`, `vocabulary`, `lesson`, `import`, `profile`, etc.) with matching `src/views/` entry components.

## Scripts (repository root)

```bash
# Local Dev
npm run dev       # Vite dev server

# Docker Dev (Full Stack)
docker-compose up

# Production
npm run build     # Typecheck + production bundle → dist/
npm run preview   # Preview production build
npm run lint      # ESLint
```

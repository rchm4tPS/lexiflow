# Contributing

## Workflow

1. **Open an issue or discuss** larger changes before investing significant time, unless you are fixing an obvious bug.
2. **Branch** from `main` (or the default branch) with a descriptive name.
3. **Keep changes focused** — one logical concern per pull request; avoid unrelated refactors.
4. **Match existing style** — TypeScript strictness, import style (`*.js` extensions in backend ESM output paths), and formatting consistent with surrounding files.

## Local checks

Align with CI (`.github/workflows/ci.yml`):

```bash
npm ci
cd backend && npm ci
cd ..
npm run lint
npm run build
cd backend && npm run build
```

## Backend

- Run from `backend/` so `DATABASE_URL` / `sqlite.db` paths are predictable.
- Never commit real `.env` files or secrets.
- New routes should be reflected in **`docs/openapi.yaml`** and, when relevant, in **`docs/API.md`**.

## Frontend

- Prefer extending existing components and stores over duplicating logic.
- After API contract changes, update the OpenAPI spec and any affected `apiClient` call sites.

## Commits and pull requests

- Write clear commit messages and PR descriptions in full sentences.
- Mention breaking API or env changes prominently in the PR body.

## Security

- Treat `GET /auth/info/{userId}` and similar aggregates as sensitive; hardening access control is a valid contribution area.
- Do not log tokens, passwords, or third-party API keys.

# Copilot / AI Agent Instructions for this repo

This file contains concise, actionable guidance for AI coding agents working on this project.

1) Big picture
- Frontend single-page app built with Vite + React (TypeScript). Entry: `src/app/main.tsx`.
- Routing: uses react-router v7 `createBrowserRouter` in `src/app/routers/index.tsx`.
- State: Redux Toolkit store exported from `src/app/store/index.ts` with reducers combined in `src/app/store/rootReducer.ts`.
- API surface: network helpers live under `src/utils/` — see `src/utils/api.ts` and `src/utils/auth.ts` for auth token patterns and the `VITE_API_BASE_URL` env var.

2) Build / run / debug
- Local dev: `npm install` then `npm run dev` (runs `vite`).
- Production build: `npm run build` (runs `tsc -b && vite build`). Note: the repo compiles TypeScript project references before Vite build.
- Preview build: `npm run preview`.
- Linting: `npm run lint`.

3) Important conventions & patterns
- Environment variables: runtime API URL is `VITE_API_BASE_URL` (seen in `src/utils/api.ts` and `src/utils/auth.ts`). Use `import.meta.env.VITE_API_BASE_URL`.
- Auth tokens: stored in `localStorage` via helpers in `src/utils/auth.ts`. Use `getAuthToken()` when attaching Authorization headers.
- localStorage: **always use `src/utils/storageHelper.ts`** for DRY code (getStorageJSON, setStorageJSON, getStorageItem, etc). Avoids duplication of `typeof window`, `try/catch JSON.parse`, and localStorage checks.
- API responses: code expects both raw objects and Hydra collections — see `HydraResponse<T>` handling in `src/utils/api.ts`.
- Routing structure: top-level `Layout` component (in `src/app/layouts/Layout.tsx`) mounts nested pages via children routes; add new pages by adding route entries in `src/app/routers/index.tsx`.
- Styling: project uses SCSS. Global imports are in `src/app/main.tsx` -> `src/styles/index.scss` and component modules use `*.module.scss`.

4) Files & locations to inspect when changing a feature
- App shell & router: `src/app/main.tsx`, `src/app/routers/index.tsx`, `src/app/layouts/Layout.tsx`.
- State: `src/app/store/index.ts`, `src/app/store/rootReducer.ts`.
- API & auth: `src/utils/api.ts`, `src/utils/auth.ts`, `src/utils/storageHelper.ts` (centralized localStorage), `src/utils/apiHelper.ts`.
- Pages & entities: `src/pages/*`, `src/entities/*` (use these for feature boundaries).
- Storage management: All localStorage access goes through `src/utils/storageHelper.ts` — use `getStorageJSON<T>()`, `setStorageJSON()`, `getStorageItem()` for DRY code.

5) Pull-request and coding hints for AI reviewers
- Keep changes minimal and local to the feature; update `store/rootReducer.ts` when adding reducers.
- When adding API calls, follow `fetch` usage and re-use `getAuthToken()` to attach `Authorization` header.
- For routing, prefer adding routes to `src/app/routers/index.tsx` (do not create ad-hoc router instances elsewhere).
- Preserve existing SCSS module naming (`*.module.scss`) and import styles at the component level.

6) Quick examples
- Add API call with auth header:

```ts
const token = getAuthToken();
fetch(`${import.meta.env.VITE_API_BASE_URL}/api/xyz`, {
  headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }
})
```

- Work with localStorage safely (DO THIS):

```ts
import { getStorageJSON, setStorageJSON, getStorageItem } from '../utils/storageHelper';

// Get JSON data with automatic parsing and null check
const userData = getStorageJSON<UserData>('userData');

// Set JSON data with automatic stringify
setStorageJSON('userData', { name: 'John', email: 'john@example.com' });

// Get string value
const cityId = getStorageItem('selectedCity');
```

- Add route (example snippet to append in `src/app/routers/index.tsx`):

```tsx
{ path: 'my-feature', element: <MyFeaturePage /> }
```

7) Known gaps discovered by static inspection
- `rootReducer.ts` is a placeholder with a `temp` reducer — adding real slices requires updating this file.
- No test suite discovered; run manual checks using dev server and `npm run build`.
- README only includes an env placeholder for `REACT_APP_API_BASE_URL` — canonical env var used by source is `VITE_API_BASE_URL`.

8) When you are unsure
- Search for similar patterns under `src/pages` and `src/entities` before introducing new infra.
- If you change the TypeScript config or project references, ensure `npm run build` (`tsc -b`) still succeeds.

If anything here is unclear or you want me to expand examples for a specific area (routing, auth, API shapes, or store slices), tell me which area to expand.

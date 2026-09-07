# AGENTS.md: AI Coding Guide for Frontend

## Quick Reference
- **Framework**: Vite + React 19 + TypeScript + Redux Toolkit + react-router v7
- **Entry**: `src/app/main.tsx` → `src/app/routers/index.tsx`
- **State**: Redux Toolkit (`configureStore` in `src/app/store/index.ts`; reducers defined in `src/app/store/rootReducer.ts`)
- **Styling**: SCSS modules (`*.module.scss`) imported at component level; global imports in `src/app/main.tsx` → `src/styles/index.scss`
- **API**: Centralized fetch wrapper in `src/utils/apiUtils.ts` (universalApiRequest); auth tokens in `src/utils/authUtils.ts`
- **Build**: `npm run build` runs `tsc -b` (TypeScript project references) then `vite build`; `npm run dev` runs Vite dev server

---

## Architecture

### Top-Level Data Flow
```
main.tsx (boot)
  ├─ preloadData() → dataCacheUtils (warm cities, categories, occupations)
  ├─ loadAppMessages() → appMessagesUtils (load i18n strings)
  ├─ Redux Provider
  ├─ ThemeProvider (dark/light from localStorage)
  └─ AppRouter
      └─ Layout (scroll restoration, token refresh loop, auth modal)
          └─ Page routes (nested children)
```

### Critical App Flow: Authentication & Token Refresh
1. **Login**: Auth modal → API POST `/api/...` → `setAuthToken()` (stores JWT in localStorage + expiry).
2. **Token Expiry**: `setupTokenRefresh()` (called in Layout) runs 60-second polling:
   - If expired: logs out, clears localStorage, fires `logout` event.
   - If 5 minutes to expiry: calls `/api/refresh_token` (uses httpOnly cookie) silently.
3. **401 Handling**: `universalApiRequest` catches HTTP 401 → calls `handleUnauthorized()` → attempts refresh once → retries original request or throws.
4. **Logout**: `logout()` clears localStorage first (immediate UI update), then hits `/api/invalidate_token` and `/api/logout` on the server.

**Key**: Token refresh uses httpOnly cookies; JWT stored in localStorage for header attachment.

### OAuth Flow
Separate top-level routes (not nested under Layout) handle OAuth:
- `/auth/google` → `OAuthRedirectPage` (initiates flow)
- `/auth/google/callback` → `OAuthCallbackPage` (handles callback)
- Same for Facebook, Instagram, Telegram
- After successful login: sets token and navigates to home

### Layout & Scroll Position
`Layout` component (wrapping all main pages) manages:
- Scroll position per history entry: stored in sessionStorage as `scroll:<location.key>` (updated on every scroll via RAF).
- On back/forward (navigation type 'POP'): restores saved scroll with retry loop (async content loads).
- On new navigation (PUSH/REPLACE): scrolls to top.
- Global auth modal triggered via custom `openAuthModal` event or Header prop.

---

## Essential Utilities

### Authentication (`src/utils/authUtils.ts`)
- `getAuthToken()`: Returns JWT from localStorage or null.
- `setAuthToken(token)`: Stores JWT + calculates/stores expiry (defaults to 1 hour if no expiry given).
- `isAuthenticated()`: Checks token exists and is not expired.
- `refreshToken()`: POST to `/api/refresh_token` (uses httpOnly cookie); returns true if successful.
- `handleUnauthorized()`: Called on HTTP 401; tries refresh once; on failure logs out and fires `logout` event.
- `fetchCurrentUser()`: GET `/api/users/me` with caching (30s TTL) + in-flight deduplication + auto-refresh on 401.
- `setupTokenRefresh(onTokenExpired?)`: Starts polling loop; logs out on expiry or attempts silent refresh 5 min before.
- `getUserData() / setUserData()`: JSON getter/setter from localStorage key `userData`.
- `getUserRole() / setUserRole()`: Normalizes role formats ('client' ↔ 'ROLE_CLIENT').

### API Requests (`src/utils/apiUtils.ts`)
- `universalApiRequest(endpoint, options)`: Central HTTP wrapper.
  - Auto-appends `?locale=<stored_i18nextLng>` (suppress with `locale: false`).
  - Attaches `Authorization: Bearer <token>` when token exists (unless `requiresAuth: false`).
  - On 401: calls `handleUnauthorized()` and retries once; throws on failure.
  - Throws `ApiError` with `code` and `message` extracted from response body.
  - Returns parsed JSON (or null for empty responses).
- `parsePagedResponse<T>(rawData, page, pageSize, hydraResponse?)`: Handles both Hydra LD+JSON (`hydra:member` + `hydra:totalItems`) and plain arrays; returns `{ items, hasMore }`.
- `ticketToTicketView(ticket)`: Maps backend Ticket → frontend TicketView with locale-aware defaults.
- `getTicketFullAddress(ticket)`: Builds full address from province, city, district, suburb, etc. (handles both `addresses[]` and `address` object).
- `getTicketShortAddress(ticket)`: City + district only.
- `getTicketAuthor(ticket)`: Extracts author/master name + id + image URL.
- `applyFavoriteSort(tickets, sortKey)`: Client-side sort for favorites (newest, oldest, price-asc/desc, reviews, rating).

### Storage (`src/utils/storageUtils.ts`)
- All localStorage/sessionStorage access guarded with `isClientSide()` (prevents SSR crashes).
- `getStorageItem(key) / setStorageItem(key, value)`: String getter/setter.
- `getStorageJSON<T>(key) / setStorageJSON(key, value)`: JSON with error handling.
- `removeStorageItem(key) / removeStorageItems(...keys)`: Remove single or multiple items.
- `getSessionItem(key) / setSessionItem(key, value)`: sessionStorage equivalents.
- `getDefaultLocale()`: Returns stored i18nextLng ('tj' / 'ru' / 'eng') or defaults to 'tj'.

### Data Caching (`src/utils/dataCacheUtils.ts`)
- `preloadData()`: Warm all static data (cities, occupations, etc.).
- `clearCache(key?)`: Invalidate by key or all if key omitted.
- Subscribes to `languageChanged` event to clear cache on language switch.

### Config (`src/utils/configUtils.ts`)
- `API_BASE_URL` = `import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'`.
- Dev server proxies `/api` and `/uploads` to `VITE_PROXY_BASE_URL` (see `vite.config.ts`).

---

## Routing & Pages

### Router Structure (`src/app/routers/index.tsx`)
- Single top-level `<Layout>` with nested children routes for main pages (home, favorites, chats, profile, tickets, legal, support).
- OAuth/auth confirmation routes live outside Layout (full-page flows).
- Routes defined via `ROUTE_PATTERNS` imported from `src/app/routers/routes.ts`.
- Add new pages: import component at top, add route entry in `children` array.

### Page Directories (`src/pages/*`)
Organized by feature:
- `main/` — homepage
- `favorites/` — saved tickets
- `chats/` — messaging
- `profile/` — user profiles (private at `/profile`, public at `/profile/:id`)
- `tickets/` — ticket CRUD (`ticket/`, `me/`, `crud/`, `category/`)
- `auth/` — auth confirmations
- `OAuth/` — OAuth callbacks
- `legal/` — privacy, terms, public offer
- `support/` — tech support

---

## Redux & State

### Store Setup (`src/app/store/index.ts`)
- `configureStore` with combined `rootReducer`.
- `RootState` and `AppDispatch` types exported for use in hooks.
- devTools enabled outside production.

### Root Reducer (`src/app/store/rootReducer.ts`)
- **Currently**: Only a placeholder `temp` reducer.
- **Pattern**: When adding a slice, import its reducer and add as key:
  ```ts
  import ticketsReducer from '../../entities/store/ticketsSlice';
  const rootReducer = combineReducers({
      tickets: ticketsReducer,
      // ... other slices
  });
  ```

---

## Entities & Type System

### Entity Organization (`src/entities/`)
- `Api/`: Raw backend shapes (e.g., `Ticket`, `User`, `Category`, `Occupation`).
- `view/`: Frontend view models (e.g., `TicketView`, `ProfileView`).
- `index.ts`: Exports both API shapes and view types; re-exports common types from `src/types/common.ts`.

### Common Types (`src/types/common.ts`)
- `Language`: 'tj' | 'ru' | 'eng'
- `SortByType`: 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'reviews-asc' | 'reviews-desc' | 'rating-asc' | 'rating-desc'
- `UserRole`: 'client' | 'master'

---

## Shared Components & Widgets

### UI Organization
- `src/shared/ui/`: Reusable components (Header, Footer, Modal, Auth, etc.)
- `src/widgets/`: Feature-specific composed widgets (ActionsDropdown, Banners, DateWidget, Sorting, ThemeToggle, etc.)
- Component README files exist in some directories (e.g., `src/shared/ui/Photo/Preview/README.md`).

### Theme System (`src/contexts/ThemeContext.tsx`)
- Theme (dark/light) persisted to localStorage and restored on boot.
- Toggle via `ThemeToggle` widget.

### Internationalization
- `src/locales/i18n.ts`: i18next config.
- Languages: Tajik (tj), Russian (ru), English (eng).
- Language change fires `languageChanged` event → clears data cache → reloads messages.
- All API requests append `?locale=` query param (suppress with `locale: false` in `universalApiRequest` options).

---

## Development Workflows

### Local Development
```bash
npm install
npm run dev  # Vite dev server + HMR
# Opens with self-signed SSL (basicSsl plugin)
# Dev server proxies /api and /uploads to VITE_PROXY_BASE_URL env var
```

### Build & Preview
```bash
npm run build   # tsc -b (compile TS references) + vite build
npm run preview # Preview production build locally
npm run lint    # ESLint check
```

### Environment Setup
- Copy `.env.example` to `.env.local` (if exists), set:
  - `VITE_API_BASE_URL`: Backend API base URL (defaults to `http://localhost:3000`)
  - `VITE_PROXY_BASE_URL`: Dev server proxy target (only used in dev mode)

### Debugging
- Redux DevTools available in dev (check browser extension).
- Console logs preserved in dev; stripped in production via esbuild config.
- React DevTools for component inspection.

---

## Project-Specific Patterns & Conventions

### Error Handling
- `ApiError` class (from `appMessagesUtils.ts`) wraps HTTP errors with `code` and `message`.
- Example: `catch (error) { if (error instanceof ApiError) { /* handle by code */ } }`

### Image URLs
- `formatTicketImageUrl(url)`: Formats ticket image URLs for display.
- `formatProfileImageUrl(url)`: Formats profile image URLs.
- Located in `src/utils/imageUtils.ts`.

### Text & Date Formatting
- `src/utils/textUtils.ts`: Text manipulation (truncate, capitalize, etc.).
- `src/utils/timeUtils.ts`: Date/time conversions.
- `useDateFormat()` hook for locale-aware date formatting.

### Pagination
- `parsePagedResponse()` returns `{ items, hasMore }` for infinite scroll.
- `pageSizeUtils.ts`: Constants for default page sizes.

### Favorites Management
- `useFavorites()` hook (in `src/hooks/`) for favorite ticket operations.

### Chat Utilities
- `chatUtils.ts`: Message parsing, formatting, etc.

---

## Build & Deployment

### Production Build
- Runs `tsc -b` (compiles TypeScript project references).
- Then `vite build` (esbuild minification + bundling).
- Console statements and debugger removed by esbuild config.

### Project References
- `tsconfig.json` references `tsconfig.app.json` (source) and `tsconfig.node.json` (build tools).
- `tsc -b` ensures correct compilation order.

---

## Common Tasks for AI Agents

### Add a New Page Route
1. Create page component in `src/pages/<feature>/<PageName>.tsx`.
2. Import at top of `src/app/routers/index.tsx`.
3. Add route entry (with `ROUTE_PATTERNS` key) to Layout's `children` array.
4. Add route constant to `src/app/routers/routes.ts` if needed.

### Add an API Call
1. Use `universalApiRequest()` from `src/utils/apiUtils.ts`.
2. Attach auth token automatically; let wrapper handle 401 refresh.
3. For paginated endpoints: use `parsePagedResponse()` to extract items and `hasMore`.

### Store User Data
- Use helpers in `src/utils/authUtils.ts`: `setUserData()`, `getUserData()`, `setUserRole()`, `setUserEmail()`, etc.
- Or use direct storage utils: `setStorageJSON()`, `getStorageJSON()` (guarded for SSR).

### Handle Theme Changes
- Toggle via `ThemeToggle` widget; theme context manages CSS class on root.
- Theme persists to localStorage automatically.

### Debug Authentication Flow
- Check localStorage keys: `authToken`, `tokenExpiry`, `userData`, `userRole`, `userEmail`, `userOccupation`, `selectedCity`.
- Verify `setupTokenRefresh()` is called in Layout on mount.
- Inspect `fetch` calls in DevTools Network tab for `Authorization` header presence.

---

## Known Limitations & TODOs

- Redux store is mostly empty (temp placeholder); add slices as features expand.
- React.StrictMode disabled to prevent double-fetching in dev; re-enable when features stabilize.
- Test suite not discovered; rely on dev server checks and `npm run build` validation.
- README only mentions `REACT_APP_API_BASE_URL`; canonical env var is `VITE_API_BASE_URL`.

---

## Quick Links
- **Copilot Instructions**: `.github/copilot-instructions.md` (existing AI guidance)
- **Build Scripts**: `package.json` scripts section
- **Vite Config**: `vite.config.ts` (dev proxy, plugins, esbuild options)
- **Styling Guide**: `guides/` directory (dark theme, i18n, optimization, etc.)
- **OAuth Integration**: `guides/OAUTH_INTEGRATION.md`, page at `src/pages/OAuth/`
- **UUID Migration (backend ids int→string, 09.2026)**: `guides/UUID_MIGRATION_GUIDE.md` — read before touching any code that parses an id out of an IRI (`\d+` regexes) or coerces an id with `Number()`/`parseInt()`


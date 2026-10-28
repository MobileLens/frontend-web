# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MobileLens web frontend: a smartphone catalog (browse/search phones, view specs, compare up to 4 phones, read reviews) plus an admin panel. Plain JavaScript (JSX, no TypeScript), React 19, React Router 7, Vite 8. The README is the unmodified Vite template and has no project-specific info.

## Commands

```bash
npm run dev      # Vite dev server with HMR
npm run build    # production build to dist/
npm run lint     # ESLint (flat config, eslint.config.js)
npm run preview  # serve the built dist/
```

There is no test framework or test script configured. `npm run lint` currently fails with pre-existing `react-hooks/set-state-in-effect` errors in `AuthContext.jsx` and `PhoneSpecifications.jsx`; lint a subset with `npx eslint <path>`.

## Backend / API

- There is no backend in this repo. In dev, `vite.config.js` proxies `/api` and `/media` to `https://mobilelens.duckdns.org` (the deployed backend). A commented-out block in the same file points both at `http://localhost:3000` for a local backend — swap the active `defineConfig` to use it.
- All API calls use relative paths (`/api/...`) and go through `apiFetch` in `src/api/client.js`, which:
  - attaches `Authorization: Bearer <token>` from localStorage when present,
  - sets `Content-Type: application/json` unless the body is `FormData`,
  - throws `Error` with the server's `message`/`error` field on non-2xx (plus `status`, `code`, `field` from the backend's `{error, code, field}` body), returns `null` on 204.
- Backend source lives in the sibling repo `../backend-api` (Hono + better-auth + Drizzle/SQLite; routes in `api/src/routes/`). Facts that bite: **all updates are `PATCH` (no `PUT` route exists)**; `/api/admin/*` needs moderator+, several routes admin-only; `/api/smartphones` paginates with `page`/`limit` (max 50) and returns `{data, page, limit, total}`; `GET /api/smartphones/:id` includes only *approved* `cameras`; media/image URLs from the API are absolute (production host or 1-hour signed `/api/media/private/...` links) — use them directly in `<img>`/`<a>`, never `fetch()` them or set `crossOrigin` (no CORS on the media host).
- Endpoint wrappers live in `src/api/*.js`, one file per domain (`smartphones`, `reviews`, `auth`, `admin`). The backend's response shape is inconsistent (bare object vs. `{ data: ... }` wrapper), so wrappers normalize it — e.g. `getSmartphones`/`searchSmartphones` return `data.data`, `reviews.js` handles array, `{data: [...]}`, or a single object. Follow that pattern when adding endpoints rather than unwrapping in pages.
- Auth endpoints are `/api/auth/sign-up/email` and `/api/auth/sign-in/email`; `Login.jsx` probes several possible token fields (`token`, `accessToken`, `data.token`, `data.accessToken`).

## Architecture notes

- Routing is all in `src/App.jsx` (`BrowserRouter` wrapped in `AuthProvider`, `Navbar` rendered above `Routes`). Key params: `/phone/:phoneId`, `/phone/:phoneId/reviews`, `/review/:reviewId`, `/compare`, `/admin_panel`.
- Pages live in `src/pages/<Name>/<Name>.jsx` with a co-located `<Name>.css`; shared components in `src/components/<Name>/`. Styling is plain CSS. The shared design tokens pages actually use (`--card-bg`, `--text-primary`, `--border-color`, `--primary`, `--spec-bg`, …, light + dark via `prefers-color-scheme`) are in `src/styles/theme.css`, imported globally in `main.jsx`. `src/index.css` holds leftover Vite-template tokens and a global `#root { text-align: center }`; `src/App.css` is not imported anywhere.
- **Auth state is token-in-localStorage**, managed by `src/utils/auth.js` (`authToken` key). `Navbar` derives logged-in state from `isLoggedIn()` and listens to the `storage` event. `src/context/AuthContext.jsx` (`useAuth`) exists but nothing consumes it, and `src/data/dummyUsers.js` is unused leftover mock data. There is no role check or route guard — `/admin_panel` is reachable by anyone; authorization is up to the backend.
- **Compare list is client-side only**: `src/api/compare.js` (despite living in `api/`) stores selected phones in localStorage under `comparePhones`, max 4.
- `PhoneBrowse` and `SearchResults` are placeholder stubs; browsing and search are actually implemented on `Home`.
- **Admin panel** (`src/pages/AdminPanel/`, lazy-loaded in `App.jsx` so Recharts stays out of the main bundle):
  - `AdminPanel.jsx` is the shell: loads `/api/admin/dashboard` once, shows "access denied" on 401/403, derives `isAdmin` from `dashboard.recentBans` (null for moderators), renders the sidebar and the active tab with props `{ isAdmin, stats, dashboard, counts, onChanged }`. Tabs call `onChanged()` after a mutation to refresh sidebar badge counts.
  - `tabs/` holds one component per tab plus their modals (`PhoneEditorModal`, `ReviewModal`, `UserModal`); `components/` holds `Modal`, `DataTable`, `StatCard`, `ChartCard`, `Charts` (Recharts wrappers), `StatusBadge`, `Icon`.
  - Data loading uses `useAsyncData(loader)` (`useAsyncData.js`): pass a `useCallback`-wrapped async loader; it returns `{ data, loading, error, reload, setData }`. This pattern avoids the `react-hooks/set-state-in-effect` lint error that the older pages hit.
  - All admin endpoint wrappers are in `src/api/admin.js`. Non-component helpers (`formatDate`, `phoneLabel`, `asArray`, `ROLES`, …) live in `format.js` because `react-refresh/only-export-components` forbids exporting them from `.jsx` component files.
  - The backend exposes no time-series stats; overview charts are aggregated client-side from the users/bans lists.

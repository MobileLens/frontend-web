# MobileLens – web frontend

React + Vite client for MobileLens, a catalogue of smartphone cameras: specs, sample photos,
comparisons and reviews. Live at <https://mobilelens.github.io/frontend-web/>.

## Running locally

```sh
npm install
npm run dev
```

The dev server proxies `/api` and `/media` to the production backend. To use a local
[backend-api](https://github.com/MobileLens/backend-api) instead:

```sh
API_TARGET=http://localhost:3000 npm run dev
```

Other scripts: `npm run build`, `npm run preview`, `npm run lint`.

## Configuration

| Variable | Used by | Purpose |
| --- | --- | --- |
| `API_TARGET` | dev server | Backend the `/api` and `/media` proxy points to |
| `VITE_API_URL` | build | Backend origin when the app is hosted elsewhere (empty = same origin) |
| `BASE_PATH` | build | Path the app is served from, e.g. `/frontend-web/` on GitHub Pages |

## Features

- **Catalogue** (`/browse`): search, filters for brand, release date, camera and video specs.
- **Phone page** (`/phone/:id`): specs per camera, sample photo gallery, favourites, compare.
- **Compare** (`/compare`): 2–4 phones side by side (kept in the browser).
- **Reviews** (`/phone/:id/reviews`, `/review/:id`).
- **Account** (`/account`): profile, e-mail, password, reviewer invitation, data export, deletion.
- **Admin panel** (`/admin_panel`, moderators and admins):
  - Overview: statistics, reviews waiting for verification, recent bans and hidden reviews.
  - Reviews: publish or return pending reviews; admins restore or delete hidden ones.
    Admins hide published reviews and delete comments from the review page.
  - Camera submissions: approve (optionally with corrections) or reject.
  - Photos & videos: verify, delete or correct the details of uploaded samples.
  - Phones: add, edit and verify phones, upload images, add/edit/delete cameras and video
    modes, merge duplicates; admins delete phones.
  - Brands: add and edit; admins delete empty brands.
  - Users: offer the reviewer role; admins change roles, ban/unban and delete accounts,
    and see bans, reviewer offers and the role change log.

## Styling and branding

Colours live in `src/styles/theme.css` (light and dark), taken from the
[brand-assets](https://github.com/MobileLens/brand-assets) palette: black and white, with red only
for errors and destructive actions. Shared buttons, inputs and cards are in `src/styles/shared.css`.
The logo (`src/assets/brand/`), favicons, app icons and web manifest (`public/`) are copied from
brand-assets.

## Deployment

Every push to `main` builds the app and publishes it to GitHub Pages
(`.github/workflows/deploy.yml`).

# MobileLens – web frontend

React + Vite client for MobileLens, a catalogue of smartphone cameras: specs, sample photos,
comparisons and reviews. Live at <https://mobilelens.me/>.

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
| `BASE_PATH` | build | Path the app is served from, `/` on the custom domain, `/<repo>/` on a plain GitHub Pages URL |

## Features

- **Catalogue** (`/browse`): search and the filters of the mobile apps (brands, required lenses, options per
  lens, any rear lens, every rear lens, front camera), with a live result count. Filters live in the URL.
- **Phone page** (`/phone/:id`): a tab per lens with specs grouped as in the mobile apps, sample photos, favourites.
- **Compare** (`/compare`): 2–4 phones side by side (kept in the browser), lenses matched by role. The best
  value is judged on the 35 mm equivalent aperture and the max usable resolution.
- **Reviews** (`/phone/:id/reviews`, `/review/:id`): likes and comments.
- **Account** (`/account`): username, e-mail, password, reviewer invitation, data export, deletion.
  Password reset at `/forgot-password` and `/reset-password`.
- **Theme**: auto, light or dark, stored in the browser.
- **Admin panel** (`/admin_panel`, moderators and admins):
  - Overview: queues waiting for a moderator (reviews, cameras, gallery photos and videos, phones), statistics,
    recent bans and hidden reviews.
  - Reviews: publish or return pending reviews; admins restore or delete hidden ones.
    Admins hide published reviews and delete comments from the review page.
  - Camera submissions, grouped by phone: approve all, approve (optionally with corrections) or reject one,
    and correct the phone itself.
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

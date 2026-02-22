# Coltivio Web

The web presence for [Coltivio](https://coltivio.ch) — open-source farm management software built by farmers, for farmers.

This repository contains two deployable units:

| Package | Domain | Description |
|---|---|---|
| `/` (root) | `app.coltivio.ch` | React SPA — the web app (contacts, orders, sponsorships) |
| `landing/` | `coltivio.ch` | Astro static site — the marketing landing page |

The companion mobile app (iOS/Android) lives in a separate repository.

## Features

**Mobile app (via this web app)**
- Field work: plot management, crop rotation planning, field activity logging, Excel export
- Animal husbandry: livestock overview, treatment journal with withdrawal periods, turnout journal, official exports

**Web app**
- Contact management with labels
- Order book (track deliveries and payments)
- Sponsorship management with newsletter dispatch

## Tech stack

- **Web app:** React 19, TanStack Router, TanStack Query, Supabase, Tailwind CSS v4, shadcn/ui, Vite 7
- **Landing:** Astro 5, React islands, Tailwind CSS v4
- **Auth & DB:** Supabase (PostgreSQL + Row Level Security)
- **Package manager:** pnpm (workspace)
- **Deployment:** Cloudflare Pages

## Getting started

**Prerequisites:** Node.js 20+, pnpm 9+

```sh
git clone https://github.com/coltivio/coltivio-web
cd coltivio-web
pnpm install
```

Copy the environment file and fill in your Supabase credentials:

```sh
cp .env.example .env
```

```sh
# Run the web app (http://localhost:4000)
pnpm dev

# Run the landing page (http://localhost:4321)
pnpm --filter coltivio-landing dev
```

## Environment variables

**Web app** (`.env`):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
```

**Landing** (`landing/.env`):
```
PUBLIC_API_URL=
PUBLIC_APP_URL=
```

## Deployment

Deploys to Cloudflare Pages via [wrangler](https://developers.cloudflare.com/workers/wrangler/). See `CONTRIBUTING.md` for first-time setup.

```sh
pnpm deploy:landing   # coltivio.ch
pnpm deploy:app       # app.coltivio.ch
pnpm deploy           # both
```

## i18n

The landing page supports German (default), French, Italian, and English. Translations live in `src/i18n/locales/` (web app) and `landing/src/i18n/translations.ts`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[AGPL-3.0 with Commons Clause](./LICENSE) — free to use and self-host, not for resale.

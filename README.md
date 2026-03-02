# Coltivio Web

The web app for [Coltivio](https://coltivio.ch) — open-source farm management software built by farmers, for farmers.

Deployed at `app.coltivio.ch`. The landing page lives in [coltivio-landing](https://github.com/coltivio/coltivio-landing). The companion mobile app (iOS/Android) lives in a separate repository.

## Features

**Mobile app (via this web app)**
- Field work: plot management, crop rotation planning, field activity logging, Excel export
- Animal husbandry: livestock overview, treatment journal with withdrawal periods, turnout journal, official exports

**Web app**
- Contact management with labels
- Order book (track deliveries and payments)
- Sponsorship management with newsletter dispatch

## Tech stack

- **Web app:** React 19, TanStack Router, TanStack Query, Supabase, Tailwind CSS v4, shadcn/ui, MapLibre GL, Vite 7
- **Auth & DB:** Supabase (PostgreSQL + Row Level Security)
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
```

## Environment variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
```

## i18n

The app supports German (default), French, Italian, and English. Translations live in `src/i18n/locales/`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[AGPL-3.0 with Commons Clause](./LICENSE) — free to use and self-host, not for resale.

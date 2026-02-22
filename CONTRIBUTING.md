# Contributing to Coltivio Web

Thanks for your interest in contributing. Coltivio is built by a small team of farmers and developers — practical improvements that come from real field experience are especially welcome.

## Before you start

- For bug fixes and small improvements, open a PR directly.
- For new features or larger changes, open an issue first to discuss the approach.
- By contributing, you agree your work will be licensed under the same [AGPL-3.0 + Commons Clause](./LICENSE) terms as the rest of the project.

## Setup

**Prerequisites:** Node.js 20+, pnpm 9+

```sh
git clone https://github.com/coltivio/coltivio-web
cd coltivio-web
pnpm install
```

You'll need a Supabase project (or a local Supabase stack via `supabase start`):

```sh
cp .env.example .env
# fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
```

## Development

```sh
# Web app — http://localhost:4000
pnpm dev

# Landing page — http://localhost:4321
pnpm --filter coltivio-landing dev

# Run tests
pnpm test

# Typecheck
npx tsc --noEmit
```

## Project structure

```
coltivio-web/
├── src/
│   ├── routes/          # TanStack Router file-based routes
│   │   ├── _authed/     # Auth-gated app routes
│   │   └── index.tsx    # Redirects to /login
│   ├── components/      # Shared UI components
│   ├── api/             # openapi-fetch client + generated types
│   ├── i18n/locales/    # App translations (de, fr, it, en)
│   └── context/         # Supabase auth context
├── landing/             # Astro landing site (coltivio.ch)
│   └── src/
│       ├── pages/       # index.astro + [lang]/index.astro
│       ├── components/  # Landing.astro, NewsletterForm, LanguageSwitcher
│       ├── layouts/     # Base.astro (HTML shell + SEO)
│       └── i18n/        # Landing translations
└── public/              # Shared static assets (logo, screenshots, etc.)
```

## Code style

- TypeScript everywhere — no `any`, avoid `as` casts
- Prefer longer functions over premature abstractions
- Add comments only where logic isn't self-evident
- Run `npx tsc --noEmit` before submitting a PR

## Adding translations

Translations for the web app are in `src/i18n/locales/{de,fr,it,en}.json`. Landing translations are in `landing/src/i18n/translations.ts`. Please add entries for all four languages when adding new strings, or mark missing ones with a `// TODO` comment.

## Submitting a PR

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `npx tsc --noEmit` and `pnpm test`
4. Open a PR with a clear description of what and why

PRs are merged with **squash merge** — commit history on your branch doesn't matter, only the PR title and description do.

## Deployment (maintainers)

First-time Cloudflare Pages setup:

```sh
wrangler login
wrangler pages project create coltivio-app
wrangler pages project create coltivio-landing
# Then add custom domains in the CF Pages dashboard
```

Create production env files (gitignored):

```sh
# .env.production
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=...

# landing/.env.production
PUBLIC_API_URL=...
PUBLIC_APP_URL=...
```

Deploy:

```sh
pnpm deploy          # both
pnpm deploy:app      # app only
pnpm deploy:landing  # landing only
```

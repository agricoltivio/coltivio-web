# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
pnpm dev          # Start dev server at http://localhost:4000
pnpm test         # Run tests (vitest)
npx tsc --noEmit  # Typecheck
pnpm build        # Build for production
pnpm generate:api-types  # Regenerate src/api/schema.d.ts from openapi.json
```

## Architecture

**Routing:** File-based routing via TanStack Router. Routes live in `src/routes/`. The `_authed/` directory wraps all authenticated routes — `route.tsx` enforces auth via `beforeLoad` and renders the sidebar layout. `routeTree.gen.ts` is auto-generated; do not edit it manually. The string argument to `createFileRoute(...)` is also auto-filled by the router plugin when `pnpm dev` or `pnpm build` runs — leave it as an empty string or placeholder when creating a new route file.

**Auth:** Supabase auth is managed in `src/context/SupabaseAuthContext.tsx`. The `auth` state is passed into the router context (`ColtivioRouterContext`) and available in all route `beforeLoad`/`loader` functions.

**Data fetching:** TanStack Query with a typed `openapi-fetch` client. API types are generated from `openapi.json` into `src/api/schema.d.ts`. All domain types (Animal, Treatment, Drug, etc.) are derived from the generated schema in `src/api/types.ts`. Query option factories live in `src/api/*.queries.ts` — one file per domain.

**API client:** `src/api/client.ts` creates an `openapi-fetch` client with an auth middleware that injects the Supabase JWT as a Bearer token. The base URL comes from `VITE_API_URL`.

**i18n:** `react-i18next` with four locales (de, fr, it, en) in `src/i18n/locales/`. German is the default. Add keys to all four locale files when adding user-facing strings.

**UI:** shadcn/ui components (Radix primitives + Tailwind v4). Shared form components in `src/components/`. Generic `DataTable` uses TanStack Table.

## Environment variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
```

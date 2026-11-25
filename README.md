# Focus Planner

Paper-and-ink weekly / monthly / 12-week planner. Expo (iOS, iPad, Android, web) + Supabase (EU).

Design reference: the Lovable prototype (`Focus Flow Planner`). This repo is the from-scratch build.

## Stack

- **App**: Expo SDK 58, Expo Router, TypeScript (strict), react-query, zod. One codebase → iPhone/iPad (TestFlight), Mac (iPad build on Apple Silicon), Android (later), web/PWA.
- **Backend**: Supabase — Postgres with row-level security on every table, Auth (magic link + 6-digit code; Sign in with Apple once the developer account exists), migrations in `supabase/migrations`.
- **Secrets**: none in the app. The publishable key is public by design; data access is enforced by RLS. On native the session is AES-encrypted in AsyncStorage with the key in the Keychain (`src/lib/secure-session-storage.ts`).

## Layout

```
src/app/            routes (expo-router): _layout, sign-in, auth/callback, (app)/{index,today,month,food,quarter,settings}
src/components/     ui primitives, screen scaffold, header, date nav, new-week dialog
src/data/           supabase-backed hooks: auth, document (autosave row), items (lists), week, daily, month, food, quarter, profile
src/lib/            pure logic (dates, shapes, quarter-goals, planner-opening) + supabase client + env
src/theme/          tokens
supabase/           config + migrations
```

## Setup

1. **Supabase**: create a project in an EU region. Then either `npx supabase link --project-ref <ref> && npm run db:push`, or paste `supabase/migrations/*.sql` into the SQL editor.
   - Auth → URL configuration: add `focusplanner://auth/callback` and your web origin + `/auth/callback` to redirect URLs.
   - Auth → Email templates → *Magic Link*: include `{{ .Token }}` in the body so the 6-digit code works alongside the link. Example: `Your code: {{ .Token }}` plus the `{{ .ConfirmationURL }}` link.
   - Auth → Providers → Email: keep "Confirm email" off for internal testing (magic link already proves the address).
2. **App**: `cp .env.example .env.local`, fill in the project URL and publishable key, then `npm install`.
3. `npm run web` for the browser, `npm run ios` for a simulator. Secure Store needs a development build on device: `npx eas-cli@latest build --profile development --platform ios`.

## Scripts

`npm run typecheck` · `npm run lint` · `npm test` · `npm run build:web` (production web build, what Cloudflare deploys) · `npm run db:push`

## Releasing (milestone 1 — internal TestFlight)

Requires an Apple Developer account. Then: `npx eas-cli@latest build --profile preview --platform ios` and `npx eas-cli@latest submit --platform ios`. The same build installs on iPad and Apple Silicon Macs.

## Decisions

- Normalized tables for things that are lists (month items, food items, goals, steps); jsonb for small fixed-shape arrays (week day boxes, daily tasks, cooking schedule). jsonb columns are checked on read with small plain functions (`src/lib/shapes.ts`, `daily-layout.ts`) — no validation library, it cost ~800 KB on web.
- Autosave: edits apply locally at once, upsert ~0.6 s after typing stops and on unmount. Lists use optimistic updates.
- Offline **reads** come from react-query's cache; offline **writes** are not queued yet (milestone 2).
- Web load speed (keep these when changing the build):
  - `npm run build:web` turns on Expo tree shaking (`EXPO_UNSTABLE_TREE_SHAKING`), so only the icons and date functions actually imported are shipped. `metro.config.js` enables the import support it needs.
  - Route splitting (`asyncRoutes.web: "production"` in `app.json`): each page's code loads when first opened; `src/lib/preload-pages.web.ts` fetches the main pages' code in the background once the app is idle.
  - `react-native-reanimated`/`worklets` are not in the web build (`metro.config.js` gives web a "not installed" stand-in; gesture handler loads them optionally). Phones are unaffected.
  - Web fonts are WOFF2 subsets in `assets/fonts` (`src/theme/fonts.web.ts`, ~165 KB vs ~710 KB TTF) and never hold the first paint longer than 1.5 s. Phones use the TTFs.
  - Result (Nov 2026): before the first page ~500 KB compressed JS instead of ~1.1 MB; Week page visible ~2× sooner on a slow connection.
- Data loading: the Week page loads the week's journal entries in one request (`useDailyWeek`); 12W loads only the current cycle's actions (`oneOf` filter); the new-week prompt loads goals only when it can show.
- Fixed a DST bug from the prototype: week-of-quarter now uses calendar days, not ms/86400000.

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

`npm run typecheck` · `npm run lint` · `npm test` · `npm run export:web` · `npm run db:push`

## Releasing (milestone 1 — internal TestFlight)

Requires an Apple Developer account. Then: `npx eas-cli@latest build --profile preview --platform ios` and `npx eas-cli@latest submit --platform ios`. The same build installs on iPad and Apple Silicon Macs.

## Decisions

- Normalized tables for things that are lists (month items, food items, goals, steps); jsonb for small fixed-shape arrays (week day boxes, daily tasks, cooking schedule). jsonb columns are validated with zod on read.
- Autosave: edits apply locally at once, upsert ~0.6 s after typing stops and on unmount. Lists use optimistic updates.
- Offline **reads** come from react-query's cache; offline **writes** are not queued yet (milestone 2).
- Fixed a DST bug from the prototype: week-of-quarter now uses calendar days, not ms/86400000.

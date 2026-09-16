# KBS Main Courante — Phase 1 (MVP)

Mobile app replacing KBS Assistance's paper logbook: geolocated clock-in/out,
offline incident logging against a standardized checklist, background sync,
and a text end-of-shift report. See `docs/Cahier_des_charges_KBS_Assistance_Main_Courante.docx`
for the full multi-phase specification — this repo currently implements
**Phase 1 only**.

## Stack

- React Native + TypeScript via Expo (dev client required — see below)
- Supabase (Postgres, Auth, Row Level Security, Storage)
- Local-first: expo-sqlite (durable data) + MMKV (fast scalar cache)

## Prerequisites

- Node.js 20+
- Docker Desktop running (required by the local Supabase stack)
- Expo Go **cannot** be used for this project — `react-native-mmkv` is a
  native module not included in Expo Go. Use an EAS development build or
  run on a simulator/device via `expo run:android` / `expo run:ios`.

## Local dev setup

1. `npm install`
2. Copy `.env.example` to `.env`.
3. Start the local Supabase stack:
   ```
   npx supabase start
   ```
   This applies everything in `supabase/migrations/` and `supabase/seed.sql`.
   Copy the printed `API URL` and `anon key` into `.env`.
4. Create test accounts (admin-provisioned, no in-app sign-up in this app).
   `supabase start` prints a `service_role key` — use it to call the Auth
   admin API directly, which reliably sets metadata regardless of which
   Studio version you have (Studio's per-user page may also let you edit
   "Raw User Meta Data" as a fallback, but the API call below always works):
   ```
   curl -X POST 'http://127.0.0.1:54321/auth/v1/admin/users' \
     -H "apikey: <service_role key>" \
     -H "Authorization: Bearer <service_role key>" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "dirigeant@kbs-assistance.local",
       "password": "changeme123",
       "email_confirm": true,
       "user_metadata": { "role": "dirigeant", "full_name": "Test Dirigeant" }
     }'
   ```
   Repeat with `"role": "agent"` for one or two agent accounts. A `profiles`
   row is created automatically by the `handle_new_user` trigger (see
   `supabase/migrations/..._profiles.sql`).
5. Run the app:
   ```
   npx expo run:android   # or: npx expo run:ios
   ```

## Project structure

- `src/lib` — Supabase client, TanStack Query client, location helper
- `src/db` — local SQLite schema/migrations + repositories (source of truth offline)
- `src/sync` — the offline→online sync engine
- `src/store` — Zustand stores (auth, connectivity, sync status)
- `src/constants/referenceList.ts` — the fixed 8-category/55-item incident checklist
- `src/navigation`, `src/features`, `src/components` — UI
- `supabase/migrations` — Postgres schema + RLS policies
- `supabase/seed.sql` — dev-only sample sites

See the build plan for the full architecture and slice-by-slice build order.

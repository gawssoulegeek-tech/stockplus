# StockPlus

A French-language inventory, POS, and SaaS management app for shop owners — tracks stock, sales, quotations, credit/debts, and gives AI-assisted business insights (Gemini). Migrated from a Vercel/v0 Next.js + Firebase/Genkit app into this Replit pnpm-workspace stack (Vite+React frontend, Express API), keeping Supabase as the auth/data backend.

## Run & Operate

- `pnpm --filter @workspace/stockplus run dev` — run the frontend (Vite)
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required env (already configured as secrets): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + wouter (routing) + shadcn/ui, artifact `stockplus`
- API: Express, artifact `api-server`, mounted at `/api/*`
- Auth + DB: Supabase (`@supabase/supabase-js`), NOT the workspace's Drizzle/Postgres — this app does not use `DATABASE_URL`
- AI: Google Gemini via direct REST calls (business insights, invoice/product-photo/POS-scan extraction)

## Where things live

- `artifacts/stockplus/src/pages/` — route-level pages (wouter), `dashboard/` subfolder for the authenticated app shell
- `artifacts/stockplus/src/pages/dashboard/layout.tsx` — auth guard + boutique/profile loading (redirects to `/login` or `/pending-approval` based on Supabase session + boutique status)
- `artifacts/stockplus/src/supabase/client.ts` — browser Supabase client; `src/supabase/auth-service.ts` — profile/boutique helpers
- `artifacts/api-server/src/routes/` — Express routes for auth/signup, boutique, saas, setup, cron, and `ai.ts` (Gemini calls)
- `artifacts/api-server/supabase-fixes/001_fix_users_select_recursion.sql` — pending manual fix for a Supabase RLS bug (see Gotchas)
- `.migration-backup/` — original Next.js/Firebase source kept for reference only, not part of the running app

## Architecture decisions

- Server-side signup (`/api/auth/signup`) creates the Supabase Auth user via the service-role admin client; the client then explicitly calls `signInWithPassword` afterward to get its own session, since admin-side `setSession` does not propagate to the browser.
- AI features call Gemini directly via REST from `api-server` rather than through Genkit (which was Next.js/Firebase-specific and was removed).
- All API routes are mounted at `/api/*` at the workspace root, so `stockplus` frontend code fetches plain `/api/...` paths (no BASE_URL prefixing needed).

## Product

- Multi-tenant shop management: registration creates a "boutique" pending superadmin approval, then owners get a dashboard for POS, inventory (incl. stock moves and China import tracking), sales, quotations, credit/debts, reports, team/user management, settings, and AI-assisted insights.
- A `superadmin` role has a `/saas` view to approve/manage boutiques across the platform.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Known Supabase RLS bug (unresolved by user choice):** the `users_select` RLS policy on Supabase has a self-referencing subquery causing Postgres error 42P17 (infinite recursion) on some profile lookups. Fix SQL is ready at `artifacts/api-server/supabase-fixes/001_fix_users_select_recursion.sql` — user opted to skip applying it for now; it should be run once in the Supabase SQL Editor when convenient.
- This app's data lives entirely in Supabase, not the workspace's built-in Postgres/Drizzle DB — don't reach for `@workspace/db` or `DATABASE_URL` here.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Authoritative migration plan: `.local/tasks/task-1.md`

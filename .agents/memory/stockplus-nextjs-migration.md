---
name: StockPlus Next.js migration
description: Vite+React+Express → Next.js 15 App Router migration in pnpm monorepo; key pitfalls encountered and resolved.
---

## Key decisions and pitfalls

### 1. `src/pages/` conflicts with Pages Router
Next.js auto-detects any `pages/` directory (even inside `src/`) as a Pages Router directory.
**Fix:** Rename `src/pages/` → `src/views/` and update all `@/pages/` imports to `@/views/`.
**How to apply:** After any Next.js scaffolding, never keep component directories named `pages/`.

### 2. wouter → next/navigation compat layer
All `import { Link, useLocation } from 'wouter'` replaced with a compat shim at `src/lib/compat/wouter.tsx`.
The sed to replace imports must handle BOTH single and double quotes separately.
**Why:** `sed "s|from \"wouter\"|...|"` only catches double-quoted imports; single-quoted ones require a separate pass.

### 3. Supabase env vars in Next.js
- Client-side: needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `next.config.ts` maps secrets `SUPABASE_URL`/`SUPABASE_ANON_KEY` → `NEXT_PUBLIC_*` at build time via the `env:` section.
- Server-side Route Handlers use `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` directly.

### 4. Cross-origin warning in Replit dev
Next.js 15 warns about cross-origin `/_next/*` requests from Replit proxy domain.
**Fix:** Add `allowedDevOrigins: ['*.riker.replit.dev', '*.replit.dev']` to `next.config.ts`.

### 5. Vercel deployment notes
- User deploys from Vercel UI, pointing root directory to `artifacts/stockplus/`.
- Required env vars in Vercel: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY`.
- `next.config.ts` handles the `NEXT_PUBLIC_*` mapping automatically.

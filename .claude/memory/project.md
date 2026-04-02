---
name: CPS Staff Portal project context
description: Phases, data model, routes, access rules, branding assets, and pending items for the CPS internal portal
type: project
---

Internal multi-app dashboard for Chicago Public Schools staff. Demo-first — get approval, then expand.

**Why:** User needs a working demo to show CPS for approval before full buildout.

**Current phase:** Phase 2 COMPLETE — ISBE Grants app fully built and passing build. Next: demo, then Phase 3 (Non-ISBE Grants or Payroll TBD).

**How to apply:** Prioritize demoable features. Don't add audit logging, permission caching, or session strategy optimizations until demo-approved.

---

## Versions (actual — differ from training data)

- **Next.js 16.2.2** — breaking changes vs 15
- **React 19.2.4**
- **Prisma 7.6.0** — URLs in prisma.config.ts, not schema.prisma
- **NextAuth v5.0.0-beta.30**
- **@auth/prisma-adapter 2.11.1**
- **@prisma/adapter-neon 7.6.0**
- **Tailwind CSS v4** — no tailwind.config.ts; use `@theme {}` in globals.css
- **shadcn 4.1.2**

## Tech stack

- Next.js 16 App Router, TypeScript
- NextAuth v5 with Google provider + Prisma adapter
- Prisma 7 + Neon Postgres (WebSocket adapter via `ws`)
- Tailwind v4 + shadcn/ui
- Vercel deployment

## CPS Branding

- Primary cobalt: `#003DA5`
- Font: Helvetica Neue, Helvetica, Arial, sans-serif (NO Geist)
- Logo: `public/cps-logo-2024_cobaltblue.svg`
  - TopNav: white (brightness-0 invert) on cobalt header
  - Login page: full color inside white card

## Google Auth

- `@cps.edu` domain restriction in `signIn` callback
- `DEV_ALLOWED_EMAILS=aziz@flowlyst.io` bypasses domain restriction for dev

## Super admin

- Email: `aziz@flowlyst.io`
- Seeded via `prisma/seed.ts` with `super_admin` role

## What's built — Phase 1 (complete)

Routes: `/`, `/login`, `/dashboard`, `/admin/users`, `/admin/roles`, `/admin/apps`, `/admin/settings`

## What's built — Phase 2 ISBE Grants (complete)

### Data model additions
- `SystemSetting` — key PK, value string (`ai_provider`, `ai_model`)
- `Contract` — contractNo (unique), grantValues String[], fiscalYear, commitmentAmount Decimal, ISBE metadata
- `GrantAssignment` — contractId + userId + role "editor"|"viewer"
- `FsgReport` — contractId + period "current"|"next"
- `BudgetUpload` — contractId + fiscalYear Int

### Routes
- `/grants-isbe` — contract list (search + FY filter)
- `/grants-isbe/[contractId]` — contract detail (Info / Budget / FSG tabs)
- `/grants-isbe/import` — director-only CSV bulk import (upserts by contractNo; fiscal year set at import time)

### AI parsing
- `src/lib/fsg-parser.ts` — multi-provider (Claude, OpenAI, Google); provider/model from SystemSetting
- Admin UI to switch provider: `/admin/settings`

### Access model
- One editor per contract (reassignable); directors always have full edit via role permission
- `grants_coordinator` role: view + edit; `grants_director` role: view + edit + manage

## Key files

- `prisma/schema.prisma` — full data model
- `prisma.config.ts` — datasource URL for CLI
- `src/lib/auth.ts` — NextAuth config
- `src/lib/prisma.ts` — Neon WebSocket adapter singleton
- `src/lib/fsg-parser.ts` — multi-provider AI PDF parser
- `src/lib/budget-parser.ts` — CSV/Excel budget parser (xlsx stub needs `npm install xlsx`)
- `middleware.ts` — auth guard + admin RBAC
- `src/app/globals.css` — CPS design tokens in @theme block
- `src/components/layout/TopNav.tsx` — top navigation with CPS logo
- `src/app/(auth)/login/page.tsx` — login page with CPS logo

## Environment variables

- `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- `ALLOWED_EMAIL_DOMAINS=cps.edu`, `DEV_ALLOWED_EMAILS=aziz@flowlyst.io`
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`

## Permission rules — ISBE Grants (confirmed correct)

- `grants_isbe:manage` = director-level — can view all contracts, assign/reassign, import
- `grants_isbe:edit` = coordinator-level — can edit/upload on contracts assigned to them as editor
- `grants_isbe:view` = base access — required to enter the app at all

**Per-contract access:**
- `editor` assignment → can upload budget, FSG, edit contract data
- `viewer` assignment → read-only; cannot upload or edit anything
- Directors bypass per-contract assignments — they always have full access via role permission

**FSG next period tab:** hidden for viewers when no next-period report has been uploaded yet (intentional — nothing to show)

## Pending items

- `npm install xlsx` — Excel budget parsing (needs user approval)
- Per-grant AI provider selector (future work)
- Analysis pages: Cash Summary, ISBE report, Reconciliation (not yet built — need requirements)

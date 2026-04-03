---
name: CPS Staff Portal project context
description: Phases, data model, routes, components, access rules, branding assets, business rules, and pending items for the CPS internal portal
type: project
---

Internal multi-app dashboard platform for Chicago Public Schools (CPS) staff. Demo-first — get approval, then expand.

**Why:** User needs a working demo to show CPS for approval before full buildout.

**Current phase:** Phase 2 COMPLETE — ISBE Grants app fully built and passing build. Next: demo, then Phase 3 (Non-ISBE Grants or Payroll TBD).

**How to apply:** Prioritize demoable features. Don't add audit logging, permission caching, or session strategy optimizations until demo-approved.

---

## Versions (actual — differ from training data)

- **Next.js 16.2.2** — breaking changes vs 15; always read node_modules/next/dist/docs/ before writing Next.js code
- **React 19.2.4**
- **Prisma 7.6.0** — URLs in prisma.config.ts, not schema.prisma
- **NextAuth v5.0.0-beta.30**
- **@auth/prisma-adapter 2.11.1**
- **@prisma/adapter-neon 7.6.0** — uses `new PrismaNeon({ connectionString })` + `neonConfig.webSocketConstructor = ws`
- **Tailwind CSS v4** — no tailwind.config.ts; use `@import "tailwindcss"` + `@theme {}` in globals.css
- **shadcn 4.1.2** — installs `tw-animate-css`, `@base-ui/react` as deps automatically

## Tech stack

- Next.js 16 App Router, TypeScript
- NextAuth v5 with Google provider + Prisma adapter
- Prisma 7 + Neon Postgres (WebSocket adapter via `ws`)
- Tailwind v4 + shadcn/ui
- Vercel deployment

## CPS Branding

- Primary cobalt: `#003DA5`
- Primary dark: `#002d7a`, Primary light: `#e8eef9`
- Font: Helvetica Neue, Helvetica, Arial, sans-serif (NO Geist — shadcn adds it, always remove from layout.tsx)
- Style: clean, institutional, accessibility-first
- Design tokens defined in `src/app/globals.css` using `@theme {}` block
- Logo: `public/cps-logo-2024_cobaltblue.svg`
  - TopNav: rendered with `brightness-0 invert` (white on cobalt header)
  - Login page: rendered full color inside white card

## Google Auth

- `@cps.edu` domain restriction in `signIn` callback in `src/lib/auth.ts`
- `DEV_ALLOWED_EMAILS=aziz@flowlyst.io` bypasses domain restriction for dev
- Personal Google Cloud project (External/Testing OAuth, up to 100 test users)
- No CPS Workspace admin console access yet

## Super admin

- Email: `aziz@flowlyst.io`
- Seeded via `prisma/seed.ts` with `super_admin` role

---

## What's built — Phase 1 (complete)

**Routes:** `/`, `/login`, `/dashboard`, `/admin/users`, `/admin/roles`, `/admin/apps`, `/admin/settings`

**API:** `/api/auth/[...nextauth]`, `/api/admin/users`, `/api/admin/users/[userId]`, `/api/admin/users/[userId]/roles`, `/api/admin/roles/[roleId]/permissions`, `/api/admin/apps/[appId]`, `/api/admin/settings`

---

## What's built — Phase 2 ISBE Grants (complete)

### Data model additions (all migrated)

- `SystemSetting` — key PK, value string (stores `ai_provider`, `ai_model`)
- `Contract` — contractNo (unique), grantValues String[], fiscalYear, commitmentAmount Decimal, all ISBE metadata fields
- `GrantAssignment` — contractId + userId + role "editor"|"viewer", unique[contractId, userId]
- `FsgReport` — contractId + period "current"|"next", unique[contractId, period], parsedData Json
- `BudgetUpload` — contractId + fiscalYear Int, unique[contractId, fiscalYear], parsedData Json

### Roles seeded

- `grants_coordinator` — grants_isbe: view + edit
- `grants_director` — grants_isbe: view + edit + manage
- ISBE Grants app tile set to `isActive: true`
- System settings seeded: `ai_provider: "claude"`, `ai_model: "claude-opus-4-6"`

### Routes added

**Pages:**
- `/grants-isbe` — contract list (role-filtered, search + FY filter)
- `/grants-isbe/[contractId]` — contract detail (Info / Budget / FSG tabs)
- `/grants-isbe/import` — director-only CSV bulk import

**API:**
- `/api/grants-isbe` — GET list + POST bulk upsert
- `/api/grants-isbe/[contractId]` — GET + PATCH
- `/api/grants-isbe/[contractId]/assign` — PATCH (reassign editor) + DELETE
- `/api/grants-isbe/[contractId]/fsg` — GET + POST + DELETE
- `/api/grants-isbe/[contractId]/fsg/upload` — POST multipart → AI parse
- `/api/grants-isbe/[contractId]/budget` — GET + POST
- `/api/grants-isbe/[contractId]/budget/upload` — POST multipart → parse

### Key components

- `GrantListClient.tsx` — search + FY filter, status badges (Not Started / Batch Pending / Up to Date / Budget Only / FSG Only)
- `GrantDetailClient.tsx` — tab shell + grant value badges + Reassign button for directors
- `GrantInfoTab.tsx` — read-only field grid
- `GrantBudgetTab.tsx` — parsed budget table or upload prompt
- `GrantFsgTab.tsx` — current/next period toggle, parsed FSG table or upload prompt
- `AssignEditorPanel.tsx` — modal; demotes old editor, upserts new
- `MasterImportClient.tsx` — CSV parser with column mapping, preview, POST to API

### AI parsing (multi-provider)

- `src/lib/fsg-parser.ts` — reads `ai_provider` + `ai_model` from SystemSetting at parse time
  - **Claude** — Anthropic API, `document` content type (native PDF support)
  - **OpenAI** — Responses API, `input_file` with `data:application/pdf;base64,...`
  - **Google** — Generative Language API, `inline_data` with `application/pdf`
  - All share one `EXTRACTION_PROMPT` constant
- Admin UI to switch provider/model: `/admin/settings`

### Budget parsing

- `src/lib/budget-parser.ts` — CSV works; `.xlsx` stub (returns empty) — needs `npm install xlsx` (pending user approval)

---

## Core model decisions (confirmed with Annabelle, director)

- **Primary identifier = Contract Number** (ISBE's unique ID, e.g. `2026-4300-00-15016299025`)
- **Grant Values** = CPS Oracle fund numbers (440054, 440055, etc.) — multiple per contract, stored as String[]; one FSG covers all
- **Budget** comes from ISBE Frizz website — one Excel file per contract, no bulk download
- **FSG** comes from CPS Oracle — one PDF per contract; TWO during fiscal year crossover
- **FSG parsing**: CID-encoded fonts → AI vision required; provider configurable via SystemSetting
- **Batch code "Need"** = ISBE hasn't assigned batch code yet → FSG not available
- **FSG next period tab:** hidden for viewers when no next-period report has been uploaded yet (intentional)

## Permission rules — ISBE Grants (confirmed correct)

- `grants_isbe:manage` = director-level — can view all contracts, assign/reassign, import
- `grants_isbe:edit` = coordinator-level — can edit/upload on contracts assigned to them as editor
- `grants_isbe:view` = base access — required to enter the app at all

**Per-contract access:**
- `editor` assignment → can upload budget, FSG, edit contract data
- `viewer` assignment → read-only; cannot upload or edit anything
- Directors bypass per-contract assignments — always full access via role permission

---

## Key files

- `prisma/schema.prisma` — full data model (NO url/directUrl in datasource)
- `prisma.config.ts` — loads .env.local via dotenv, sets datasource.url for CLI
- `src/lib/auth.ts` — NextAuth config with domain restriction + session role hydration
- `src/lib/prisma.ts` — Neon WebSocket adapter singleton
- `src/lib/fsg-parser.ts` — multi-provider AI PDF parser
- `src/lib/budget-parser.ts` — CSV/Excel budget parser
- `middleware.ts` — auth guard + admin RBAC
- `src/app/globals.css` — CPS design tokens in @theme block
- `src/components/layout/TopNav.tsx` — top navigation with CPS logo
- `src/app/(auth)/login/page.tsx` — login page with CPS logo
- `prisma/seed.ts` — permissions, roles, app tiles, super admin, system settings

## Environment variables

- `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- `ALLOWED_EMAIL_DOMAINS=cps.edu`, `DEV_ALLOWED_EMAILS=aziz@flowlyst.io`
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`

---

## Pending items

- `npm install xlsx` — Excel budget parsing (needs user approval before installing)
- Per-grant AI provider selector (future work)
- Analysis pages: Cash Summary, ISBE report, Reconciliation (not yet built — need requirements)

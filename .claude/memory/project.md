---
name: CPS Staff Portal project context
description: Phases, data model, routes, components, access rules, branding assets, business rules, and pending items for the CPS internal portal
type: project
---

Internal multi-app dashboard platform for Chicago Public Schools (CPS) staff. Demo-first — get approval, then expand.

**Why:** User needs a working demo to show CPS for approval before full buildout.

**Current phase:** Phase 2.5+ IN PROGRESS on branch `feature/analysis-pages`. Analysis pages built and significantly hardened. ISBE Report tab fully redesigned (dynamic rows, manual inputs, footnotes from DB). Admin settings redesigned with sidebar layout.

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
  - Latest prompt update teaches CPS FSG structure explicitly:
    - first column = function description
    - second column = function/account code aligned to budget account code
    - header `1..8` maps to object codes `100..800`
    - parser should extract report metadata (`reportTitle`, `grantName`, `reportDate`, generated/run date info) in addition to line items
  - Upload flow now tries the configured provider first, then falls back to other providers with available API keys if the first provider is quota-blocked or errors
- Admin UI to switch provider/model: `/admin/settings`

### Budget parsing

- `src/lib/budget-parser.ts` — supports:
  - wide ISBE Frizz Excel/CSV export with separate `Acct` + `Obj` columns
  - compact 4-column CSV export like `docs/Budget.csv` where:
    - column B = combined account cell such as `1000 Instruction`
    - column C = object cell such as `Salaries (100)`
    - column D = amount
- Excel uploads prompt user to choose the budget worksheet when workbook has multiple tabs
- Parser now throws a clear error if no recognizable budget rows are found instead of silently storing an empty upload

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

## What's built — Phase 2.5+ ISBE Report redesign + Reconciliation redesign (merged to main 2026-04-08)

### New Contract fields (migrated)
- `isbeVoucheredToDate Decimal?` — Line 32, manual input per contract
- `isbeOutstandingObligs Decimal?` — Line 34, manual input per contract
- `isbeCarryover Decimal?` — Carryover for commitment amount breakdown, manual input

### SystemSetting changes
- `isbe_footnotes` — JSON key: `{ style: "number"|"letter"|"bullet", items: string[] }`
- Old keys `isbe_footnote_1/2/3` are stale in DB (harmless), no longer used

### ISBE Report tab (`GrantIsbeReportTab`)
- Expenditure table: fully dynamic from FSG parsed data — no hardcoded function codes
- Only non-zero rows shown; function description from `functionDescription` FSG field; object header label from `description` FSG field
- Cash Summary: L32 (Vouchered) and L34 (Outstanding Obligations) are editable inputs; Carryover is editable inside Commitment Amount breakdown; L33/L35/L38/L39 auto-calculated; Save button PATCHes contract
- Footnotes rendered from DB with computed prefix (number/letter/bullet)

### Admin Settings redesign
- Sidebar layout: left nav (AI Parsing / ISBE Footnotes), right content panel
- ISBE Footnotes section: dynamic list, add/delete/edit items, style picker (1·2·3 / A·B·C / •)

### No-hardcoding rule
- Added to CLAUDE.md: domain data (labels, footnotes, rates, reference lists) must live in DB or come from uploads — never hardcoded in component code

### Reconciliation tab redesign (complete)
- **Schema**: added `reconciliationAdjustments Json?` to Contract — stores `{ "acct|obj": { overrun, adjustment } }` per contract, persisted via PATCH
- **Columns**: Object/Desc | Budget | FSG Current | FSG Next | Total Program Cost | Budget Line Overrun (manual) | No Budget (formula: `total ≠ 0 && budget is null → -total`) | Adjustment (manual) | Cumulative Total | YTD Unexpended Balance
- **Grouped by function code**: collapsible section headers (click to collapse, "Collapse All / Expand All" button). Collapsed = summary view. No redundant function code repetition in detail rows.
- **Manual inputs**: `NumberInput` component — comma-formatted when unfocused, raw when focused. Debounced auto-save (800ms) via PATCH.
- **CSS cascade sizing**: `text-[13px]` on `<table>`, `text-[14px]` on section header rows, `text-[11px]` on thead — no per-cell font overrides.
- **"Acct" renamed "Function Code"** in GrantBudgetTab and GrantFsgTab column headers.

---

## What's built — Phase 2.5 Analysis Pages (complete, merged to main)

- **Budget parser fixed**: now reads accountCode (col E), objectCode (col F), description stripped of parens (col C), amount (col D). Excel (.xlsx) support implemented via `xlsx` package.
- **Budget parser expanded further**: also supports compact 4-column budget CSV exports (`docs/Budget.csv` style) by deriving `accountCode` from combined account cell and `objectCode` from object description parentheses.
- **FSG parser updated**: FsgLine type now has `accountCode` + `objectCode` as separate fields. Prompt now encodes CPS-specific FSG rules, including object-header `1..8` to `100..800` mapping and extraction of top-of-report metadata. Existing FSG records may need re-upload to pick up the richer parsedData shape.
- **CashEntry model**: migrated to DB (`cash_entries` table). Manual ISBE invoice/receipt ledger per contract.
- **API routes**: `/api/grants-isbe/[contractId]/cash` (GET/POST) and `/cash/[entryId]` (PATCH/DELETE)
- **Three new tabs**: Cash Summary, ISBE Report, Reconciliation — all modern CPS-branded with stat cards, color coding, dynamic rows/columns from actual data (nothing hardcoded)
- **GrantBudgetTab**: supports Excel worksheet picking before upload, and displays accountCode when present
- **GrantFsgTab**: now surfaces report identity metadata (report title, grant name, report date, generated date/label, grant code, period)
- **Analysis tab hardening**: Reconciliation double-counting fixed (max ITD not sum), Cash Summary ordering fixed (accountingPeriodDate then createdAt)

---

## Pending items — what's next

**Validation still needed (pre-demo):**
1. Re-upload both FSG PDFs and verify `functionDescription` populates, object codes map `1..8 → 100..800`, ISBE Report table renders correctly
2. Test ISBE Report manual inputs persist (Vouchered to Date, Outstanding Obligations, Carryover)
3. Verify budget upload end-to-end (compact CSV + multi-tab Excel)
4. Reconciliation: validate against fresh re-uploaded FSG data; test Budget Line Overrun + Adjustment inputs save and reload

**After demo approval:**
- Phase 3: Non-ISBE Grants or Payroll (TBD)
- Per-grant AI provider selector
- Broader admin sidebar (users/roles/apps/settings unified nav)

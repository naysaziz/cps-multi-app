# CPS Staff Portal — Project Plan

## Overview

An internal multi-app dashboard platform for Chicago Public Schools (CPS) staff. Users sign in with Google, land on a tile-based dashboard, and access role-gated mini-apps. Each mini-app is an independent module that plugs into the shared shell.

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 16 App Router | SSR, route groups, middleware auth guards |
| Auth | NextAuth v5 (Auth.js) | Google provider, Prisma adapter, session hydrates roles/permissions |
| ORM | Prisma 7 + @prisma/adapter-neon | WebSocket adapter for Neon serverless |
| Database | Neon Postgres | Serverless; migrate to RDS/Azure post-approval |
| UI | Tailwind CSS v4 + shadcn/ui (New York) | CPS design tokens as CSS variables in globals.css |
| Deployment | Vercel | Zero-config Next.js + Neon branch-per-preview |

---

## CPS Branding

| Token | Value |
|-------|-------|
| Primary cobalt | `#003DA5` |
| Primary dark | `#002d7a` |
| Primary light | `#e8eef9` |
| Text | `#1a1a1a` |
| Muted | `#888888` |
| Background | `#f5f6f8` |
| Border | `#e2e4e9` |
| Font | Helvetica Neue, Helvetica, Arial, sans-serif |
| Logo | `public/cps-logo-2024_cobaltblue.svg` |

---

## Google Auth Strategy

- Personal Google Cloud project (External/Testing OAuth, up to 100 test users)
- `@cps.edu` domain restriction enforced in `signIn` callback
- `DEV_ALLOWED_EMAILS` env var bypasses domain restriction for development
- Super admin dev email: `aziz@flowlyst.io`
- **Migration path**: When CPS IT provides Workspace admin access → new OAuth app, update env vars in Vercel, zero code changes

---

## Permission System

**Convention**: `"resource:action"` strings — e.g., `"grants_isbe:view"`

**Resources**: `admin_users`, `admin_roles`, `admin_apps`, `grants_isbe`, `grants_non_isbe`, `payroll`, `payroll_final`

**Actions**: `view`, `edit`, `manage`, `delete`

Roles are collections of permissions. Users can have multiple roles. All loaded into `session.user.permissions[]` at login — no extra DB call needed in components.

**ISBE Grants permission levels:**
- `grants_isbe:manage` = director — view all contracts, assign/reassign, import, full access
- `grants_isbe:edit` = coordinator — upload/edit on contracts assigned to them as editor
- `grants_isbe:view` = base access — required to enter the app at all

Director check must always be: `isSuperAdmin || permissions.includes("grants_isbe:manage")` — never include `grants_isbe:edit` in a director check.

---

## Database Schema

```
users              — NextAuth user table + isActive flag
accounts           — NextAuth OAuth accounts (required)
sessions           — NextAuth sessions (required)
roles              — e.g. super_admin, grants_coordinator, grants_director
permissions        — resource × action pairs
user_roles         — many-to-many: users ↔ roles
role_permissions   — many-to-many: roles ↔ permissions
apps               — dashboard tiles: name, slug, route, icon, isActive, requiredPermission
system_settings    — key/value store: ai_provider, ai_model
contracts          — ISBE grant contracts (primary unit of work)
grant_assignments  — per-contract access: editor or viewer
fsg_reports        — FSG PDFs + AI-parsed expenditure data (current/next period)
budget_uploads     — ISBE Frizz budget files + parsed line items
cash_entries       — (Phase 2.5) manual ISBE payment transaction ledger
```

---

## File Structure

```
cps-app/
├── .claude/
│   ├── settings.json
│   └── memory/                        # Claude session memory
├── docs/PROJECT_PLAN.md               # This file
├── docs/Grant Worksheet_Template.xlsx # Reference template for analysis pages
├── CLAUDE.md                          # Claude Code project context
├── AGENTS.md                          # Notes on stack breaking changes
├── middleware.ts                      # Auth guard + admin RBAC
├── prisma/
│   ├── schema.prisma                  # Full data model
│   ├── prisma.config.ts               # Datasource URL for CLI (Prisma 7)
│   └── seed.ts                        # Permissions, roles, app tiles, super admin, system settings
├── public/cps-logo-2024_cobaltblue.svg
└── src/
    ├── app/
    │   ├── globals.css                # CPS design tokens (@theme block — Tailwind v4)
    │   ├── layout.tsx
    │   ├── (auth)/login/page.tsx      # Google sign-in (CPS branded)
    │   ├── (app)/
    │   │   ├── layout.tsx             # Auth shell + TopNav
    │   │   ├── dashboard/page.tsx     # App tile launcher
    │   │   ├── admin/                 # User/role/app/settings management (super_admin only)
    │   │   └── grants-isbe/
    │   │       ├── page.tsx           # Contract list
    │   │       ├── [contractId]/page.tsx  # Contract detail (Info/Budget/FSG/analysis tabs)
    │   │       └── import/page.tsx    # Director-only master CSV import
    │   └── api/
    │       ├── auth/[...nextauth]/
    │       ├── admin/
    │       └── grants-isbe/
    │           ├── route.ts           # GET list + POST bulk upsert
    │           └── [contractId]/
    │               ├── route.ts       # GET + PATCH
    │               ├── assign/        # PATCH (assign/reassign) + DELETE
    │               ├── fsg/           # GET + POST + DELETE + upload/
    │               ├── budget/        # GET + POST + upload/
    │               └── cash/          # GET + POST + [entryId]/ (Phase 2.5)
    ├── components/
    │   ├── ui/                        # shadcn primitives
    │   ├── layout/TopNav.tsx
    │   ├── dashboard/AppTile + AppGrid
    │   ├── admin/
    │   └── grants-isbe/
    │       ├── GrantListClient.tsx
    │       ├── GrantDetailClient.tsx
    │       ├── GrantInfoTab.tsx
    │       ├── GrantBudgetTab.tsx
    │       ├── GrantFsgTab.tsx
    │       ├── GrantCashSummaryTab.tsx    # Phase 2.5
    │       ├── GrantIsbeReportTab.tsx     # Phase 2.5
    │       ├── GrantReconciliationTab.tsx # Phase 2.5
    │       ├── AssignEditorPanel.tsx
    │       └── MasterImportClient.tsx
    ├── lib/
    │   ├── auth.ts                    # NextAuth config
    │   ├── prisma.ts                  # Neon WebSocket adapter singleton
    │   ├── fsg-parser.ts              # Multi-provider AI PDF parser
    │   ├── budget-parser.ts           # CSV/Excel budget parser
    │   └── utils.ts
    └── types/
        ├── next-auth.d.ts             # Session augmentation
        └── index.ts
```

---

## Phase Roadmap

### Phase 1 — Foundation ✅ Complete

- Google Auth + dashboard shell
- Role/permission system
- Admin panel: manage users, roles, app tiles, AI provider settings

### Phase 2 — ISBE Grants App ✅ Complete

Replaces ~70 manually managed Google Sheets. Coordinators upload data, directors review.

#### Data Sources

| Source | Format | Upload Method |
|--------|--------|---------------|
| Master grant list | CSV from master Google Sheet | Bulk import per fiscal year |
| Budget | Excel download from ISBE Frizz website | Individual upload per contract |
| FSG report | PDF from CPS Oracle financial system | Individual upload per contract → AI parsing |

#### Data Model

**Contract** — primary unit of work

| Field | Notes |
|-------|-------|
| `contractNo` | ISBE unique ID, e.g. `2026-4300-00-15016299025` — **primary identifier** |
| `grantName` | Full descriptive name |
| `fundingSource` | Always "Illinois State Board of Education" for ISBE grants |
| `grantValues` | CPS Oracle grant numbers — can be multiple (stored as array) |
| `batchCode` | ISBE batch code; `"Need"` = pending assignment → FSG not yet available |
| `fund` | 3-digit CPS fund code |
| `unit` | 4-5 digit CPS unit code |
| `revenueAccount` | 5-digit revenue account code |
| `aln` | Federal Assistance Listing Number |
| `programPeriod` | Text display string |
| `projectStartDate` / `projectEndDate` | Dates |
| `completionReportDate` / `finalReportDate` | Dates |
| `commitmentAmount` | Dollar amount from ISBE |
| `cpsBudgetPerson` | Budget staff name |
| `isbeContactPerson` / `isbePhone` / `isbeFax` | ISBE-side contact |
| `agencyLocation` | e.g. "Springfield, IL" |
| `arAmount` | Accounts receivable amount |
| `fiscalYear` | e.g. `2026` |

**FsgReport** — up to 2 per contract (current + next period during fiscal year crossover)

`parsedData` shape:
```typescript
{
  reportDate?: string
  grantValues?: string[]
  lines: Array<{
    accountCode: string   // function/program code: "1000", "2110"
    objectCode: string    // expenditure type: "100", "200"
    description: string
    currentPeriod: number
    inceptionToDate: number
  }>
  totalCurrentPeriod?: number
  totalInceptionToDate?: number
}
```

**BudgetUpload** — 1 per contract per fiscal year

`parsedData` shape:
```typescript
{
  lines: Array<{
    accountCode: string   // e.g. "1000", "2110"
    objectCode: string    // e.g. "100", "200"
    description: string
    amount: number
  }>
  totalAmount: number
}
```

ISBE Frizz budget Excel column mapping: col E = accountCode, col F = objectCode, col C = description (strip parens), col D = amount.

**GrantAssignment** — access control per contract (`editor` or `viewer`)

**CashEntry** — (Phase 2.5) manual ISBE payment transaction ledger

| Field | Notes |
|-------|-------|
| `contractId` | FK to Contract |
| `fiscalYear` | e.g. 2025, 2026 |
| `invoiceNo` | Invoice or receipt number |
| `claimPeriod` | Free text date range: "7/1/24–9/30/24" |
| `accountingPeriodDate` | Date booked in accounting system |
| `claimedAmount` | Positive = claim/accrual |
| `cashReceipts` | Negative = payment received from ISBE |
| `advanceOffset` | Advance or offset amount |
| `comments` | Free text |

#### Access Rules

- **Director** (`grants_isbe:manage` or `isSuperAdmin`) — view all contracts, assign/reassign, import
- **Coordinator** (`grants_isbe:edit`) — upload/edit only on contracts where assigned as `editor`
- **Viewer** (`grants_isbe:view`) — read-only; per-contract `viewer` assignment required
- **Per-contract roles**: `editor` = full upload/edit access; `viewer` = read-only

### Phase 2.5 — ISBE Grants Analysis Pages 🚧 In Planning

Three new tabs added to the contract detail page:

1. **Cash Summary** — manual ISBE payment transaction ledger with running A/R balance, FY subtotals
2. **ISBE Report** — standard ISBE expenditure form; FSG inception-to-date data pivoted by accountCode × objectCode; plus cash summary section
3. **Reconciliation** — budget vs FSG_Current vs FSG_Next by accountCode+objectCode, with per-line overrun flags and group subtotals

Also includes parser fixes:
- Budget parser: fix column mapping, add accountCode field, implement Excel (.xlsx) support
- FSG parser: update AI prompt to extract accountCode and objectCode as separate fields

Branch: `feature/analysis-pages`

### Future Phases

- Non-ISBE Grants app
- Payroll Efficiencies app
- Payroll Final Payout app
- Email invitations / onboarding flow
- Audit logging (government compliance)
- Additional school districts (post-CPS approval)

---

## Seed Data

Bootstrapped via `npx prisma db seed`:

- **Permissions**: resource × action pairs
- **Roles**: `super_admin`, `grants_coordinator` (view + edit), `grants_director` (view + edit + manage)
- **App tiles**: ISBE Grants (`isActive: true`), Non-ISBE Grants, Payroll Efficiencies, Payroll Final Payout
- **Super admin**: `aziz@flowlyst.io` → `super_admin` role
- **System settings**: `ai_provider: "claude"`, `ai_model: "claude-opus-4-6"`

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon pooled connection (app runtime) |
| `AUTH_SECRET` | NextAuth signing secret |
| `AUTH_URL` | Full app URL (e.g. https://app.vercel.app) |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `ALLOWED_EMAIL_DOMAINS` | e.g. `cps.edu` |
| `DEV_ALLOWED_EMAILS` | Dev bypass e.g. `aziz@flowlyst.io` |
| `ANTHROPIC_API_KEY` | Claude API for FSG parsing |
| `OPENAI_API_KEY` | OpenAI API (optional, alternate FSG parser) |
| `GOOGLE_AI_API_KEY` | Google AI (optional, alternate FSG parser) |

---

## Key Commands

```bash
npm run dev                    # Start dev server (use Node 22 — see AGENTS.md)
npm run build                  # Production build
npx prisma migrate dev         # Run migrations
npx prisma generate            # Regenerate client after schema changes
tsx prisma/seed.ts             # Seed initial data (configured in prisma.config.ts)
npx prisma studio              # GUI for database
```

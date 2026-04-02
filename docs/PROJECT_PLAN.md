# CPS Staff Portal — Project Plan

## Overview

An internal multi-app dashboard platform for Chicago Public Schools (CPS) staff. Users sign in with Google, land on a tile-based dashboard, and access role-gated mini-apps. Each mini-app is an independent module that plugs into the shared shell.

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 15 App Router | SSR, route groups, middleware auth guards |
| Auth | NextAuth v5 (Auth.js) | Google provider, Prisma adapter, session hydrates roles/permissions |
| ORM | Prisma + @prisma/adapter-neon | Serverless HTTP adapter for Neon |
| Database | Neon Postgres | Serverless; migrate to RDS/Azure post-approval |
| UI | Tailwind CSS + shadcn/ui (New York) | CPS design tokens as CSS variables |
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

---

## Database Schema

```
users              — NextAuth user table + isActive flag
accounts           — NextAuth OAuth accounts (required)
sessions           — NextAuth sessions (required)
roles              — e.g. super_admin, grants_admin, viewer (isSystem protects built-ins)
permissions        — resource × action pairs
user_roles         — many-to-many: users ↔ roles
role_permissions   — many-to-many: roles ↔ permissions
apps               — dashboard tiles: name, slug, route, icon, isActive, requiredPermission
```

---

## File Structure

```
cps-app/
├── .claude/settings.json              # Claude Code permissions config
├── docs/PROJECT_PLAN.md               # This file
├── CLAUDE.md                          # Claude Code project context
├── middleware.ts                      # Auth guard + admin RBAC
├── prisma/
│   ├── schema.prisma                  # Full data model
│   └── seed.ts                        # Permissions matrix, roles, app tiles, super admin
├── public/cps-logo.svg
└── src/
    ├── app/
    │   ├── globals.css                # CPS design tokens
    │   ├── layout.tsx
    │   ├── (auth)/login/page.tsx      # Google sign-in (CPS branded)
    │   ├── (app)/
    │   │   ├── layout.tsx             # Auth shell + TopNav
    │   │   ├── dashboard/page.tsx     # App tile launcher
    │   │   ├── admin/                 # User/role/app management (super_admin only)
    │   │   └── [appSlug]/page.tsx     # Future mini-app container
    │   └── api/
    │       ├── auth/[...nextauth]/
    │       └── admin/users/ + roles/
    ├── components/
    │   ├── ui/                        # shadcn primitives
    │   ├── layout/TopNav.tsx
    │   ├── dashboard/AppTile + AppGrid
    │   └── admin/UserTable + InviteUserModal + RoleCard + PermissionToggle
    ├── lib/
    │   ├── auth.ts                    # NextAuth config
    │   ├── prisma.ts                  # Neon-compatible singleton
    │   ├── permissions.ts             # hasPermission() helpers
    │   └── utils.ts                   # cn()
    └── types/
        ├── next-auth.d.ts             # Session augmentation
        └── index.ts
```

---

## Seed Data

Bootstrapped on first deploy via `npx prisma db seed`:

- **Permissions**: 28 total (7 resources × 4 actions)
- **Roles**: `super_admin` (all), `grants_admin` (isbe + non-isbe), `payroll_admin` (payroll + final), `viewer` (all:view)
- **App tiles**: ISBE Grants, Non-ISBE Grants, Payroll Efficiencies, Payroll Final Payout (all `isActive: false` until built)
- **Super admin**: `aziz@flowlyst.io` → `super_admin` role

---

## Phase Roadmap

### Phase 1 — Foundation (current)
- Google Auth + dashboard shell
- Role/permission system
- Admin panel: manage users, roles, app tiles

### Phase 2 — ISBE Grants App

Replaces ~70 manually managed Google Sheets. Coordinators upload data, directors review.

#### Data Sources

| Source | Format | Upload Method |
|--------|--------|---------------|
| Master grant list | CSV/Excel from master Google Sheet | Bulk import per fiscal year |
| Budget | Excel download from ISBE Frizz website | Individual upload per contract |
| FSG report | PDF from CPS Oracle financial system | Individual upload per contract → AI parsing |

#### Data Model

**Contract** — primary unit of work (1 row in master sheet = 1 contract)

| Field | Notes |
|-------|-------|
| `contractNo` | ISBE unique ID, e.g. `2026-4300-00-15016299025` — **primary identifier** |
| `grantName` | Full descriptive name |
| `fundingSource` | Always "Illinois State Board of Education" for this app |
| `grantValues` | CPS Oracle grant numbers — can be multiple (stored as array), e.g. `[440054, 440055]` |
| `batchCode` | ISBE batch code; `"Need"` = pending assignment |
| `fund` | 3-digit CPS fund code (220, 324, 332, 334, etc.) |
| `unit` | 4-5 digit CPS unit code (1000 = central office; others = specific schools) |
| `revenueAccount` | 5-digit revenue account code |
| `aln` | Federal Assistance Listing Number — blank = state-only grant; populated = federal pass-through |
| `programPeriod` | Text display string |
| `projectStartDate` / `projectEndDate` | Dates |
| `completionReportDate` / `finalReportDate` | Dates |
| `commitmentAmount` | Dollar amount from ISBE |
| `cpsBudgetPerson` | Budget staff name |
| `isbeContactPerson` / `isbePhone` / `isbeFax` | ISBE-side contact |
| `agencyLocation` | e.g. "Springfield, IL" |
| `isbeContactDirectoryUrl` | URL to ISBE contact page |
| `arAmount` | Accounts receivable amount |
| `fiscalYear` | e.g. `2026` |

**FsgReport** — 1 per contract normally; 2 during fiscal year crossover

| Field | Notes |
|-------|-------|
| `contractId` | FK to Contract |
| `period` | `"current"` or `"next"` (crossover only) |
| `pdfStorageKey` | File storage reference |
| `parsedData` | JSON of AI-extracted line items |
| `uploadedAt` / `uploadedBy` | Audit fields |

**BudgetUpload** — 1 per contract, from ISBE Frizz (Excel)

**GrantAssignment** — access control per contract

| Field | Notes |
|-------|-------|
| `contractId` | FK to Contract |
| `userId` | FK to User |
| `role` | `"editor"` or `"viewer"` |

#### Access Rules

- **One editor per contract** — assigned coordinator; reassignable (old editor loses edit)
- **Multiple viewers per contract** — anyone with `grants_isbe:view`
- **Directors (Annabelle, Alma)** — always have edit access to all contracts via role-level permission (`grants_isbe:edit`), no per-contract assignment needed
- Directors can reassign contracts between coordinators

#### Views

1. **Grant list** — table of all contracts for the current FY; coordinator sees only assigned; directors see all; filterable by status, coordinator, fund
2. **Grant detail** — contract metadata + budget + FSG tabs; shows all grantValues aggregated
3. **FSG upload + parse** — upload PDF → AI extracts line items → review/confirm → stored
4. **Budget upload** — drop Excel from Frizz → parsed and stored
5. **Master import** — bulk upload the FY master list CSV to seed all contracts for a new fiscal year

#### FSG Parsing Strategy

FSG PDFs use CID-encoded fonts — standard text extraction (pdfplumber, etc.) produces garbled output. Approach:
- Upload PDF to server → send to Claude API as vision input
- Extract structured data: expenditure lines by object code, amounts, period dates
- Return JSON → coordinator reviews → confirms → saved to DB

#### Key Business Rules

- `batchCode = "Need"` → FSG not yet available (ISBE hasn't issued batch code)
- Each FSG covers all `grantValues` under the contract (ISBE issues per contract, not per fund code)
- Budget comes from ISBE Frizz (not CPS Oracle) — one file per contract, no bulk download
- FSG comes from CPS Oracle — one PDF per contract per reporting period

### Future Phases
- Non-ISBE Grants app
- Payroll Efficiencies app
- Payroll Final Payout app
- Email invitations / onboarding flow
- Audit logging (government compliance)
- Additional school districts (post-CPS approval)

---

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon pooled connection (app runtime) |
| `DIRECT_URL` | Neon direct connection (prisma migrations) |
| `AUTH_SECRET` | NextAuth signing secret (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated allowed domains (e.g. `cps.edu`) |
| `DEV_ALLOWED_EMAILS` | Dev bypass emails (e.g. `aziz@flowlyst.io`) |

---

## Key Commands

```bash
npm run dev                    # Start dev server
npm run build                  # Production build
npx prisma migrate dev         # Run migrations
npx prisma generate            # Regenerate client after schema changes
npx prisma db seed             # Seed initial data
npx prisma studio              # GUI for database
```

---

## Verification Checklist

- [ ] `npm run dev` boots at `localhost:3000`
- [ ] `/dashboard` redirects unauthenticated users to `/login`
- [ ] Google sign-in works and lands on `/dashboard`
- [ ] Non-CPS email (without `DEV_ALLOWED_EMAILS`) → `?error=unauthorized_domain`
- [ ] Super admin sees "Admin" in TopNav → `/admin` accessible
- [ ] Admin can add user, assign role, see correct tiles appear
- [ ] Deactivated user rejected on next sign-in
- [ ] App tile hidden when user lacks `requiredPermission`

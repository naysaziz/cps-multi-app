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
- First real mini-app
- Grant data view, role-based access
- No email invitations needed yet — admin pre-creates users

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

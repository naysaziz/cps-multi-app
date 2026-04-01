# CPS Staff Portal — Claude Context

## What This Project Is

Internal multi-app dashboard for Chicago Public Schools staff. Users sign in with Google, land on a tile dashboard, and access role-gated mini-apps (Grants, Payroll, etc.). Built as a demo to get CPS approval — keep it fast and focused.

## Tech Stack

- **Next.js 15** App Router (TypeScript)
- **NextAuth v5** with Google provider + Prisma adapter
- **Prisma** ORM with `@prisma/adapter-neon` (HTTP adapter — required for serverless)
- **Neon Postgres** — `DATABASE_URL` = pooled, `DIRECT_URL` = direct (for migrations)
- **Tailwind CSS** + **shadcn/ui** (New York style)
- **Vercel** deployment

## Key Commands

```bash
npm run dev                    # Dev server → localhost:3000
npm run build                  # Production build
npx prisma migrate dev         # Run migrations (uses DIRECT_URL)
npx prisma generate            # Regenerate client after schema changes
npx prisma db seed             # Seed permissions, roles, app tiles, super admin
npx prisma studio              # Database GUI
```

## Critical Conventions

**Permission strings**: `"resource:action"` format — e.g., `"grants_isbe:view"`. Never use IDs.
Check in components: `session.user.permissions.includes("grants_isbe:view")`

**Route groups**:
- `(auth)/` — public pages (no shell)
- `(app)/` — authenticated shell with TopNav
- `(app)/admin/` — super_admin only

**Session shape** (augmented in `src/types/next-auth.d.ts`):
```ts
session.user.id
session.user.roles        // string[]
session.user.permissions  // string[] of "resource:action"
session.user.isSuperAdmin // boolean
```

**Neon Prisma client** must use the HTTP adapter — see `src/lib/prisma.ts`. Do not use standard PrismaClient directly.

## Do Not Change Without Discussion

- The NextAuth required tables (`Account`, `Session`, `VerificationToken`) — schema must match the adapter exactly
- Seeded system roles (`super_admin` with `isSystem: true`) — UI prevents deletion, don't bypass this
- The `resource:action` permission convention — changing it breaks all permission checks across the app

## Project Structure

See `docs/PROJECT_PLAN.md` for full file structure, schema, and phase roadmap.

## Super Admin

Dev super admin email: `aziz@flowlyst.io`

## Environment

Never read `.env`, `.env.local`, or any file with real credentials. Use `.env.example` to understand what variables are needed.

# CPS Staff Portal — Claude Context

## What This Project Is

Internal multi-app dashboard for Chicago Public Schools staff. Users sign in with Google, land on a tile dashboard, and access role-gated mini-apps (Grants, Payroll, etc.). Built as a demo to get CPS approval — keep it fast and focused.

## Tech Stack

Next.js 16 App Router · NextAuth v5 · Prisma 7 · Neon Postgres · Tailwind v4 · shadcn/ui · Vercel

See `.claude/memory/project.md` for actual installed versions and `.claude/memory/stack_gotchas.md` for breaking changes.

## Key Commands

```bash
npm run dev                    # Dev server → localhost:3000
npm run build                  # Production build
npx prisma migrate dev         # Run migrations
npx prisma generate            # Regenerate client after schema changes
tsx prisma/seed.ts             # Seed roles, permissions, app tiles, super admin
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
session.user.id;
session.user.roles; // string[]
session.user.permissions; // string[] of "resource:action"
session.user.isSuperAdmin; // boolean
```

**Neon Prisma client** must use the WebSocket adapter — see `src/lib/prisma.ts`. Do not use standard PrismaClient directly.

## Working Style

- Do not make any changes until you have 95% confidence in what you need to build. Ask follow-up questions until you reach that confidence.
- For exploration or research spanning 3+ files, use a Haiku sub-agent and return only summarized insights — don't read the entire codebase inline.
- Batch multi-step instructions into a single prompt where possible.
- Run /compact at ~60% context capacity (check with /context).
- Read only the files needed for the task — don't over-research before acting.

## No Hardcoding Rule

**Data must never be hardcoded in component or library code.** All domain data (reference tables, labels, footnotes, configuration values, lookup lists) must either live in the database or come from uploaded files. If reference data is needed in the UI, store it in `SystemSetting` or a dedicated DB model and fetch it server-side.

This includes: function code lists, object code labels, footnote text, rates, fiscal year defaults, and any other values that a user might need to change without a code deployment.

## Do Not Change Without Discussion

- The NextAuth required tables (`Account`, `Session`, `VerificationToken`) — schema must match the adapter exactly
- Seeded system roles (`super_admin` with `isSystem: true`) — UI prevents deletion, don't bypass this
- The `resource:action` permission convention — changing it breaks all permission checks across the app

## Project Structure

See `docs/PROJECT_PLAN.md` for full file structure, schema, and phase roadmap.

## Super Admin

Dev super admin email: `aziz@flowlyst.io`

## Memory

The `.claude/memory/` folder in this project is the primary source of truth for project context, stack decisions, workflow preferences, and accumulated knowledge. Always read the relevant files there at the start of a session. The index is at `.claude/memory/MEMORY.md`.

Do not rely on the auto-memory files at `~/.claude/projects/…/memory/` — those are stale. Use `.claude/memory/` instead.

## Environment

Never read `.env`, `.env.local`, or any file with real credentials. Use `.env.example` to understand what variables are needed.

## Applied Learning

- Next.js 16: `params` is a Promise — always `const { id } = await params`
- Prisma 7: `Decimal` → use `String(v)` at server boundary, never import Decimal
- shadcn init adds Geist font to layout.tsx — always remove it
- `grants_isbe:edit` = coordinator level — never use as director gate; use `grants_isbe:manage`
- FSG re-upload needed after parser prompt changes to get richer parsedData shape

---
name: CPS project stack gotchas
description: Breaking changes and environment issues discovered during build — must-know before writing code
type: feedback
---

## Node.js version

Homebrew Node at `/opt/homebrew/bin/node` (v19.3.0) takes precedence over nvm in PATH.

**Why:** Homebrew sets its bin dir early; nvm injects after. `nvm use` / `nvm alias default` don't fix it in current shell.

**How to apply:** Run `brew unlink node` once to remove the Homebrew node. Project requires Node 22.22.2+ (Prisma 7 needs 22.12+, Next.js 16 needs 20.9+). In Bash tool, prefix with `PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH"`. After fresh `npm install`, always run `npx prisma generate` before building.

---

## Next.js 16

Always check `node_modules/next/dist/docs/` before writing Next.js code — breaking changes vs 15.

**How to apply:** Before writing any new route, layout, or API handler, check `node_modules/next/dist/docs/01-app/`. `params` in dynamic routes is a Promise — always `const { id } = await params`.

---

## Prisma 7

1. `url` and `directUrl` NOT allowed in schema.prisma — put URL in `prisma.config.ts`
2. `directUrl` is NOT valid in prisma.config.ts datasource (type error) — don't add it
3. Runtime client: `new PrismaNeon({ connectionString: process.env.DATABASE_URL! })` + `neonConfig.webSocketConstructor = ws`
4. `provider = "prisma-client-js"` still works, generates to node_modules/@prisma/client
5. Seed command configured in `prisma.config.ts` under `migrations.seed`, NOT in package.json — use `tsx prisma/seed.ts` (ts-node with `--compiler-options` fails due to shell quoting issues in Prisma's command runner)
6. `Decimal` fields serialize as `{}` when passed to client components — `@prisma/client/runtime/library` subpath does NOT exist in Prisma 7; use `String(v)` at server boundary instead of importing Decimal

---

## Tailwind v4

No `tailwind.config.ts` — define tokens in `src/app/globals.css` under `@theme {}` block. Use `@import "tailwindcss"` at top. Use utility classes normally (`bg-cobalt`, `text-cobalt`).

---

## shadcn v4

`npx shadcn init` adds Geist font to layout.tsx automatically — always remove it and restore Helvetica Neue (CPS branding requirement). Also installs `tw-animate-css` and `@base-ui/react` as deps automatically.

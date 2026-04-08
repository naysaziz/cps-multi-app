---
name: CPS project stack gotchas
description: Breaking changes and environment issues discovered during build — must-know before writing code
type: feedback
---

## Node.js version

nvm node is active (`~/.nvm/versions/node/v20.19.5`). The Homebrew node conflict was resolved (`brew unlink node`). No PATH prefix needed in Bash commands.

**How to apply:** Just run `node`/`npm`/`npx` directly. After fresh `npm install`, always run `npx prisma generate` before building.

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

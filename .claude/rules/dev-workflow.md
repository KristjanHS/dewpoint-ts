<!-- docs-bloat-gate-override: fresh nextjs typescript dev-workflow rule, verified tsc lint build commands run clean -->
---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.mjs"
last_verified: 2026-06-24
---
# Dev Workflow (Next.js / TypeScript)

Stack: Next.js 15 (App Router, `app/`), React 18, TypeScript 5.7 (`strict`, `noEmit`). Package manager: **npm** (`package-lock.json`; Vercel `installCommand` is `npm install`). Deploy: Vercel (`framework: nextjs`, output `.next`).

## Verification gate
No test runner is configured. The verification gate before committing is **typecheck + lint + build**, in this order:
1. `npx tsc --noEmit` — `tsconfig` sets `noEmit`, so `tsc` is the typecheck, not a build. Must be clean.
2. `npm run lint` — runs `next lint` (ESLint 9 + `eslint-config-next`). Must report no warnings or errors.
3. `npm run build` (`next build`) — only when touching routing, server components, config, or build-time behavior; it's the slowest and catches what 1–2 miss.

Run each once per step. Don't re-run to "confirm" a clean result.

If you add tests, prefer **Vitest** (Vite-native, ESM-friendly) and add a `test` script + this gate — don't reach for Jest in a Next 15 / ESM project.

## Linting caveat
`next lint` is **deprecated** and removed in Next.js 16. When the Next major bumps, migrate to the ESLint CLI via `npx @next/codemod@canary next-lint-to-eslint-cli .` and update the `lint` script. Don't add a parallel lint path before then.

## Dev server
`npm run dev` (`next dev`). For a one-shot check that the app renders, prefer `npx tsc --noEmit` + `npm run build` over leaving a dev server running — the build surfaces RSC/route errors without a live server.

## Python legacy
The pre-TS migration residue (`python_legacy/`, `.flake8`, `.pre-commit-config.yaml`, the Python CI workflow, stale `*.code-workspace` files, local `.venv/`) was removed 2026-06-24. This is a TypeScript-only app. If a task is ever genuinely Python-side, confirm scope with the user first.

## tsconfig hygiene
`exclude` lists `src/app.backup` / `src/lib.backup`, which don't exist (live code is `app/` and `lib/` at root, not `src/`). Leave stale excludes alone unless cleaning them is the task — they're inert. Don't add new `.backup` dirs; delete dead code instead of shadowing it.

## Architecture
Small app — don't propose subpackages, barrel files, or generic abstractions. Keep route logic in `app/`, shared helpers in `lib/`. Don't build generic iteration for N=2.

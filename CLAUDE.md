# dewpoint-ts — Claude instructions

Next.js 15 (App Router, `app/`) + React 18 + TypeScript 5.7 (`strict`, `noEmit`), npm, deployed on Vercel. Weather/dewpoint app; charts via Plotly; data parsed with `xml2js`.

## Source of truth
Project conventions live in `.claude/rules/` (path-gated — auto-load when matching files are edited). This file is the index; do not duplicate rule content here.

| Rule (`.claude/rules/`) | Topic |
|---|---|
| `dev-workflow.md` | Verification gate (tsc → lint → build), npm, Vercel, TS-only (Python residue removed) |
| `api-routes.md` | App Router weather-proxy `GET` handlers (`dynamic`, fetch headers, error shape, `xml2js` typing) |
| `plan-hygiene.md` | When to write/archive plan & doc files |
| `rule-authoring.md` | Copy the shipped form verbatim when documenting a fix |

## Other AI agents
Other agents (Gemini Code Assist via `.gemini/config.yaml`, anything honoring `.aiignore`) defer to the rules in `.claude/rules/` as the single source of truth. Keep their configs lean — do not copy rule text into them.

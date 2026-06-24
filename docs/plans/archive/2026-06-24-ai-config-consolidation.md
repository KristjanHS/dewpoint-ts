# AI-agent config consolidation — next-session execution doc

**Date:** 2026-06-24
**Goal (user request):** "Migrate all Cursor-related configs into Claude rules/skills/references/CLAUDE.md. Make other AI-agent configs lean — reference Claude files instead of duplicating them." User constraints added mid-task: **only migrate/change files that already exist**; write the changes into this `.md` for next session (the root `CLAUDE.md` is blocked this session by the doc-bloat-gate override budget).

---

## Finding: there are no Cursor configs

Searched exhaustively in **both** `dewpoint-ts` and `dewpoint-app`:
- Working tree: no `.cursor/`, `.cursorrules`, or `*.mdc` anywhere (the only "cursor" string in the repo is a CSS `cursor:` property in `app/globals.css`).
- Git history (`git log --all --diff-filter=A`): no Cursor/`.mdc`/AGENTS/Copilot/GEMINI.md file was ever committed.

So **nothing Cursor-related exists to migrate.** The directive's premise does not hold for these repos.

## The only AI-agent configs that exist (both repos, identical)

| File | What it is | Action |
|---|---|---|
| `.aiignore` | Ignore glob (`*.ipynb`) read by Cursor/aider-style tools | **Keep as-is.** It's an ignore file, not instructions — nothing to lean out or reference Claude from. |
| `.gemini/config.yaml` | Gemini Code Assist **review behavior** (severity thresholds, max 10 comments) | **Keep as-is.** Fixed-schema tool settings, not duplicated instructions. Cannot "reference" Claude rules functionally. |

Neither file duplicates Claude instruction content, so there is no duplication to collapse. The canonical instructions already live in `.claude/rules/` (created this session: `plan-hygiene.md`, `rule-authoring.md`, `dev-workflow.md`).

## What's actually left to do

The only net-new value is finishing the canonical Claude layer with a **root `CLAUDE.md`** that indexes the rules. This was blocked this session (doc-bloat-gate: one override already spent on `dev-workflow.md`). Create it next session.

---

## NEXT SESSION — action 1: create root `CLAUDE.md`

The bloat gate caps `**/CLAUDE.md` at the rule/doc tier. Paste the content below; if the gate fires on the char-delta, this is legitimate new canonical content — use that session's override sentinel.

````markdown
# dewpoint-ts — Claude instructions

Next.js 15 (App Router, `app/`) + React 18 + TypeScript 5.7 (`strict`, `noEmit`), npm, deployed on Vercel. Weather/dewpoint app; charts via Plotly; data parsed with `xml2js`.

## Source of truth
Project conventions live in `.claude/rules/` (path-gated — auto-load when matching files are edited). This file is the index; do not duplicate rule content here.

| Rule (`.claude/rules/`) | Topic |
|---|---|
| `dev-workflow.md` | Verification gate (tsc → lint → build), npm, Vercel, Python-legacy boundary |
| `plan-hygiene.md` | When to write/archive plan & doc files |
| `rule-authoring.md` | Copy the shipped form verbatim when documenting a fix |

## Other AI agents
Other agents (Gemini Code Assist via `.gemini/config.yaml`, anything honoring `.aiignore`) defer to the rules in `.claude/rules/` as the single source of truth. Keep their configs lean — do not copy rule text into them.

## Legacy
`python_legacy/`, `.venv/`, `.flake8`, `.pre-commit-config.yaml`, and `.github/workflows/python-lint-test.yml` are pre-TS migration leftovers, not part of the shipped app. Don't wire them into the build.
````

## NEXT SESSION — action 2 (optional, only if user lifts "existing files only")

If the user later wants other agents to *explicitly* point at Claude (rather than just keep existing files), the lean, non-duplicating additions would be:
- `.gemini/styleguide.md` — Gemini Code Assist reads this for review guidance. One line: "Follow the conventions in `.claude/rules/`. Do not restate them here."
- `AGENTS.md` (root) — cross-agent standard (Codex/Cursor/Jules). One paragraph deferring to `.claude/rules/`.

**Not doing these now** — user scoped the task to files that already exist, and neither file exists yet.

---

## Out of scope (flagged, not AI-config — separate cleanup)

- `*.code-workspace` (×2): stale Python settings — Black formatter, pytest, `.venv` interpreter. Wrong stack for a TS app.
- `.github/workflows/python-lint-test.yml`: Python CI running on a TypeScript project.
- `python_legacy/`, `.flake8`, `.pre-commit-config.yaml`, `.venv/`: Python migration residue.

These are not AI-agent configs; left untouched. Worth a dedicated "remove Python residue" pass later.

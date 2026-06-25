---
paths:
  - "docs/**/*.md"
  - "**/CLAUDE.md"
  - ".claude/rules/**/*.md"
last_verified: 2026-06-25
---
# Plan / Doc Hygiene

Global CLAUDE.md already covers storage location, `git mv` closed plans → `docs/plans/archive/` + `.claudeignore`, and "consume superseded docs before archiving." This file holds only the dewpoint-specific deltas.

## When to write a plan doc
- No plan doc for ≤ 2 files changed AND ≤ 1 session of work — the commit message + diff is the record.
- Single plan doc for anything larger. This is a small app; don't pre-split into per-stage files.

## Archival deltas
- `git rm` (not `git mv`) a shipped plan whose rationale is fully captured in its commit messages — the git log is the audit trail and the archived md is a redundant second copy. Reserve `git mv` for plans whose design rationale exceeds the commits.
- Shipped plans left in `docs/plans/` auto-load into future sessions and masquerade as active work. When a survey finds one shipped, archive it the same session — don't just note it.
- Before archiving: grep the plan path across the repo + `CLAUDE.md` and update references to the new `archive/` location.
- If the plan has uncommitted working-tree edits (e.g. a resolution note added this session), `git add` them BEFORE `git mv` — `git mv` stages the rename against HEAD and silently drops the working-tree edits.

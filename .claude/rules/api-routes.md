---
paths:
  - "app/api/**/route.ts"
last_verified: 2026-06-24
---
# API Route Conventions

## Conventions

App Router `GET` handlers (`app/api/<name>/route.ts`) proxying external weather APIs. No dynamic `[id]` routes yet — when added, params are a Promise: `await context.params`.

- **Live data**: set `export const dynamic = "force-dynamic"`, else Next caches the response at build time.
- **External fetch**: `fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" })`, then `if (!response.ok) throw new Error(...)`.
- **Required env vars**: guard before use — `if (!apiKey) return NextResponse.json({ error: "Missing X" }, { status: 500 })`.
- **Errors**: `NextResponse.json({ error, detail? }, { status })`. No `{ success, data }` envelope — keep success payloads route-specific.
- **XML parsing** (`humidity`/`beach` via `xml2js`): prefer a typed shape over widening to `any`.

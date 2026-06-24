# Test Framework Design — dewpoint-ts

**Date:** 2026-06-24
**Status:** Approved design (not yet implemented)
**Stack:** Next.js 15 (App Router), React 18, TypeScript 5.7 (`strict`, `noEmit`), npm, Vercel

## Goal

Introduce automated tests to a project that currently has none. Tests should protect
the real bug-risk surface — data/parsing logic, API route behavior, and basic component
wiring — without imposing infrastructure disproportionate to a one-page app.

The verification gate today is `tsc → lint → build` (no test runner). This design adds a
`test` step between lint and build.

## Scope

**In scope (the "Mid" effort tier):**
- Unit tests for pure logic (`lib/dewpoint.ts`, `lib/geo.ts`).
- API route-handler tests (`app/api/*/route.ts`) with mocked `fetch`, env, and time.
- A component smoke test for `app/page.tsx` (jsdom + React Testing Library), with Plotly mocked.

**Out of scope:**
- Playwright / end-to-end browser tests.
- Visual regression.
- Testing Plotly's actual chart rendering (we test our wiring, not the library).

## Chosen approach

**Runner: Vitest**, per the existing `dev-workflow.md` rule (Vite-native, ESM-friendly;
do not reach for Jest in a Next 15 / ESM project).

**Environment strategy: Approach A — one config, per-file env override.**
- `vitest.config.ts` sets `environment: 'node'` as the default (most tests are pure logic
  + route handlers, which need no DOM).
- The single component test opts into the browser env with a `// @vitest-environment jsdom`
  docblock on line 1.
- A forgotten docblock fails loudly (DOM globals undefined), so the convention can't silently rot.

Rejected alternatives:
- **B. Vitest projects (workspace) split** — location-based node/jsdom separation. Correct
  once there are dozens of test files, but premature for this size and counter to the
  project's "don't build generic iteration for N=2" rule. A→B migration is near-zero cost later.
- **C. Two separate runners** — redundant; contradicts the small-app rules outright.

### Comparison matrix (1–5; lower is better for Complexity/Time/Risk)

| Criterion | A: Per-file override | B: Projects split | C: Two runners |
|---|:--:|:--:|:--:|
| Complexity | 2 | 3 | 5 |
| Time | 1 | 2 | 4 |
| Risk | 2 | 2 | 4 |
| Extensibility | 4 | 5 | 2 |
| Alignment (small-app rules) | 5 | 3 | 1 |

## Tooling & scripts

**devDependencies to add:**
- `vitest` — runner
- `@vitejs/plugin-react` — JSX/TSX transform for component tests
- `jsdom` — browser env for the component layer
- `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
- `vite-tsconfig-paths` — resolve the app's path aliases in tests

**`vitest.config.ts`:**
- `environment: 'node'` (default)
- `globals: true` (no per-file `describe/it/expect` imports)
- `setupFiles: ['./vitest.setup.ts']`
- plugins: `react()`, `tsconfigPaths()`

**`vitest.setup.ts`:** imports `@testing-library/jest-dom` matchers.

**`package.json` scripts:**
- `"test": "vitest run"` — one-shot, used by the gate / CI
- `"test:watch": "vitest"` — local dev

**Verification gate (update `dev-workflow.md`):** `tsc → lint → test → build`, with `test`
as the new step 3 (fast; runs before the slow build).

## Layout, naming & conventions

Tests are **co-located** with source (a parallel `__tests__/` tree reads worse at this size):

```
lib/dewpoint.test.ts          ← node env (default)
lib/geo.test.ts               ← node env (default)
app/api/weather/route.test.ts ← node env (default)
app/page.test.tsx             ← // @vitest-environment jsdom  (docblock, line 1)
vitest.config.ts
vitest.setup.ts
```

- `*.test.ts` for logic/route tests; `*.test.tsx` for component tests.
- Only the `.tsx` component file carries the `// @vitest-environment jsdom` docblock.
- `tsconfig.json` already globs `**/*.ts(x)`, so test files are typechecked by the gate's
  `tsc` step for free — no separate test tsconfig.
- **ESLint caveat:** `next lint` may flag test-only patterns. Confirm the existing config
  tolerates `*.test.ts` during implementation; only touch it if a real warning appears
  (the gate requires zero lint warnings).

## Route-test mechanics (no network, no real keys)

Route handlers are exported `async GET(req: Request)` functions — import and call them
directly with a hand-built `Request`, then assert on the returned `NextResponse`. No server,
no Next runtime.

Three seams to control per test:
1. **`fetch`** — stub the global with `vi.fn()` returning a minimal `Response`-shaped object
   (`{ ok, status, json: async () => (...), text: async () => "..." }`); reset via
   `vi.restoreAllMocks()` in `afterEach`.
2. **`process.env.OPENWEATHER_API_KEY`** — `vi.stubEnv(...)` / `vi.unstubAllEnvs()` to hit the
   missing-key branch deterministically.
3. **Response** — `NextResponse.json()` returns a `Response`; assert `res.status` and
   `await res.json()`.

**Time:** `pickClosestForecast` uses `Date.now()`. The happy path uses `vi.useFakeTimers()`
+ `vi.setSystemTime(...)` with forecast `dt` values built relative to the fixed clock, so the
"closest to +6h/+12h" assertion is stable.

**XML routes (`humidity`/`beach`):** same `fetch` stub, but the mocked response returns an XML
**string** via `.text()`, which `xml2js` parses; the test feeds realistic XML and asserts the
parsed shape.

### Weather route — branches to cover (template for the others)
- Missing API key → `500 { error: "Missing OPENWEATHER_API_KEY" }`
- No `city` and no `lat/lon` → `400 { error: "Provide either city or lat/lon" }`
- Upstream weather fetch `!ok` → propagates upstream status + `error: "Weather fetch failed"`
- Happy path: weather ok + forecast ok → `picked.sixHour`/`twelveHour` resolve to the closest
  forecast point (also exercises `pickClosestForecast` indirectly).

## First targets & rollout order

Each step is a standalone commit (recoverable if interrupted):

1. **`lib/dewpoint.test.ts`** — `dewPoint` vs a known reference value (~20 °C / 50 % RH ≈ 9.3 °C);
   the three `recommendation` branches (>2, <-2, between); `dewPointGrid` shape (8 temps × 7
   humidities, values rounded to 1 dp). Proves the config on the simplest target.
2. **`lib/geo.test.ts`** — `haversine` vs a known city-pair distance; `dmsToDecimal`;
   `degToCompass` boundaries (0°→N, 360° wrap); `findNearestStation` incl. empty-array → `null`.
3. **`app/api/weather/route.test.ts`** — the four branches above, with fetch/env/time stubs.
4. **`app/page.test.tsx`** — jsdom + RTL smoke test: renders, shows expected static text/controls.
   **Plotly is mocked** (`vi.mock`) — heavy canvas/WebGL lib that doesn't render meaningfully in
   jsdom and only adds flake.

`humidity`/`beach` route tests follow the weather template once the pattern is proven.

## Key decisions

1. **Vitest, not Jest** — mandated by `dev-workflow.md` for this ESM/Next 15 stack.
2. **One config + per-file docblock (A), not a projects split (B)** — least machinery that still
   separates node/jsdom; aligned with the small-app rules; cheap to migrate later if the suite grows.
3. **Co-located tests** — better readability at this size than a parallel test tree.
4. **Mock Plotly in component tests** — we assert our wiring, not the chart library's output.
5. **Fake timers for the forecast-picker happy path** — determinism over a real clock.
6. **`test` joins the verification gate before `build`** — fast feedback ahead of the slow step.

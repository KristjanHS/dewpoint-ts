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
- **Typecheck gotcha (must do before step 1):** `tsconfig.json` has `"types": ["node"]`, so
  `tsc` won't know the Vitest globals (`vi`, `describe`, `expect`) that `globals: true` injects
  at runtime — every test file would error under the gate's `tsc --noEmit` step. Add
  `"vitest/globals"` to the `tsconfig.json` `types` array (the app code doesn't import these, so a
  single shared tsconfig is fine — no separate test tsconfig needed). With that added, the existing
  `**/*.ts(x)` glob typechecks test files for free.
- **ESLint caveat:** `.eslintrc.json` extends only `next/core-web-vitals`, which won't flag
  `describe`/`it`/`expect`. The one real risk is `@typescript-eslint/no-explicit-any` (bundled in
  that config) firing on `vi.fn<any>()` patterns in route stubs — type the stubs concretely rather
  than reaching for `any`. Only touch the eslint config if a genuine warning appears (the gate
  requires zero warnings).

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
   `await res.json()`. **Risk to confirm first:** `NextResponse` (from `next/server`) running
   outside the Next server runtime is not a documented guarantee. Before writing all four weather
   branches, step 3 must open with a one-line smoke check (`await NextResponse.json({})` resolves
   cleanly under Vitest's node env). If it doesn't, add a thin `vi.mock('next/server', ...)` shim.
   Resolve this at the top of step 3, not mid-suite.

**Time:** `pickClosestForecast` uses `Date.now()`. The happy path uses `vi.useFakeTimers()`
+ `vi.setSystemTime(...)` with forecast `dt` values built relative to the fixed clock, so the
"closest to +6h/+12h" assertion is stable.

**XML routes (`humidity`/`beach`):** same `fetch` stub, but the mocked response returns an XML
**string** via `.text()`, which `xml2js` parses (`parseStringPromise`, confirmed in both routes).
The test feeds realistic XML and asserts on the **route handler's JSON output shape** (the
`NextResponse` body), not the intermediate `parsed` object — `parseStringPromise` returns `any`,
so assertions there aren't type-checked.

**`humidity` is NOT a simple "follow the weather template" case.** `app/api/humidity/route.ts`
runs a `for (hourOffset = 0; hourOffset < 4; hourOffset++)` loop that calls `fetch` repeatedly,
walking back hour-by-hour until a fetch yields usable data. The stub must therefore model the
sequence — e.g. `vi.fn()` with `.mockResolvedValueOnce(...)` returning empty/non-OK for the first
N calls then populated XML — and a test should cover both "first hour has data" and "falls back to
a later hour." Budget this as its own design beat when the humidity/beach tests come up, after the
weather pattern is proven.

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
   ⚠️ **This step surfaces a real production bug.** `degToCompass` uses `Math.round((deg / 45) % 8)`
   — the `% 8` is applied *before* rounding, so any bearing in `[337.5, 360)` rounds `7.5 → 8` and
   returns `dirs[8]` = `undefined`. The boundary test (`degToCompass(337.5)`) will (correctly) fail
   against the current code. **Fix `geo.ts` to `Math.round(deg / 45) % 8` in the same commit** — do
   not treat the red test as a framework problem and skip it. (Pre-existing defect; the test layer
   is doing its job by catching it.)
3. **`app/api/weather/route.test.ts`** — the four branches above, with fetch/env/time stubs.
   Open with the `NextResponse` smoke check noted in route-test mechanics.
4. **`app/page.test.tsx`** — jsdom + RTL smoke test: renders, shows expected static text/controls.
   **Plotly mock — mock the right layer.** `app/page.tsx` loads the chart via
   `const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })`. A bare
   `vi.mock('react-plotly.js')` mocks the npm package but **not** the `next/dynamic` wrapper, which
   under jsdom (no Next runtime) renders `null` or throws — the test wouldn't see the mock. Pick one:
   (a) `vi.mock('next/dynamic', ...)` returning a loader that synchronously renders a stub component;
   or (b) extract the `<Plot>` JSX into a small `PlotWrapper.tsx` and `vi.mock` that. Prefer (a) — no
   production refactor. Resolve this concretely before writing the test; it's the most likely step to
   stall. Reason for mocking at all: Plotly is a heavy canvas/WebGL lib that doesn't render
   meaningfully in jsdom and only adds flake — we assert our wiring, not the chart.

`humidity`/`beach` route tests follow the weather template once the pattern is proven.

## Key decisions

1. **Vitest, not Jest** — mandated by `dev-workflow.md` for this ESM/Next 15 stack.
2. **One config + per-file docblock (A), not a projects split (B)** — least machinery that still
   separates node/jsdom; aligned with the small-app rules; cheap to migrate later if the suite grows.
3. **Co-located tests** — better readability at this size than a parallel test tree.
4. **Mock Plotly at the `next/dynamic` layer** (not the `react-plotly.js` package) — the chart is
   dynamically imported, so the wrapper is what must be stubbed. We assert our wiring, not the chart.
5. **Fake timers for the forecast-picker happy path** — determinism over a real clock.
6. **`test` joins the verification gate before `build`** — fast feedback ahead of the slow step.

## Review corrections (2026-06-24, post-design architecture review)

A fresh-eyes architecture review (Next.js App Router + small-app lenses) ran against this doc
before implementation. Findings folded in above:

- **[was BLOCKER] Plotly mock targeted the wrong layer** — page uses `next/dynamic`; mock that, or
  extract a `PlotWrapper`. Resolved in route-test mechanics + step 4 + decision 4.
- **[was BLOCKER] `degToCompass` production bug** — `Math.round((deg/45) % 8)` returns `undefined`
  for `[337.5, 360)`. Step 2 now flags the expected red test and mandates fixing `geo.ts` in the
  same commit.
- **[was SHOULD-FIX] tsconfig `types: ["node"]`** — Vitest globals wouldn't typecheck; add
  `"vitest/globals"`. Corrected the earlier "typechecked for free" claim.
- **[was SHOULD-FIX] `NextResponse` outside the Next runtime** — added a smoke check at the top of
  step 3.
- **[was SHOULD-FIX] `humidity` multi-fetch loop** — documented the sequential-stub requirement;
  it's not a simple weather-template clone.
- ESLint `no-explicit-any` on `vi.fn<any>()` and the `@vitejs/plugin-react`-is-Vitest-only note
  captured as caveats.

// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import Page from "./page";

// Plotly is loaded via `dynamic(() => import("react-plotly.js"), { ssr: false })`.
// Under jsdom there is no Next runtime, so mock next/dynamic itself (not the
// react-plotly.js package) to return a synchronous stub — we assert our wiring,
// not the chart. See docs/plans/2026-06-24-test-framework-design.md, decision 4.
vi.mock("next/dynamic", () => ({
  default: () => function PlotStub() {
    return <div data-testid="plot-stub" />;
  },
}));

beforeEach(() => {
  // The mount effect fires fetchWeather(); give it a benign response so the
  // component settles instead of throwing on a real network call.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ weather: { main: {} } }),
    }))
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("<Page />", () => {
  it("renders the heading and core controls", () => {
    render(<Page />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Dew Point Advisor" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use GPS" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use City" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Location & Weather" })
    ).toBeInTheDocument();
  });

  it("renders the heatmap section with the mocked Plot stub", () => {
    render(<Page />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Dew point heatmap" })
    ).toBeInTheDocument();
    expect(screen.getByTestId("plot-stub")).toBeInTheDocument();
  });
});

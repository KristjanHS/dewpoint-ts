import { GET } from "./route";

// NextResponse.json() resolves cleanly under Vitest's node env (smoke-checked),
// so no next/server shim is needed — call GET directly with a hand-built Request.

type FetchResponse = Pick<Response, "ok" | "status"> & {
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

function makeRes(opts: Partial<FetchResponse>): FetchResponse {
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    json: opts.json ?? (async () => ({})),
    text: opts.text ?? (async () => ""),
  };
}

function req(query: string): Request {
  return new Request(`http://localhost/api/weather?${query}`);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("GET /api/weather", () => {
  it("returns 500 when OPENWEATHER_API_KEY is missing", async () => {
    vi.stubEnv("OPENWEATHER_API_KEY", "");
    const res = await GET(req("city=Tallinn"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Missing OPENWEATHER_API_KEY" });
  });

  it("returns 400 when neither city nor lat/lon is provided", async () => {
    vi.stubEnv("OPENWEATHER_API_KEY", "test-key");
    const res = await GET(req(""));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Provide either city or lat/lon" });
  });

  it("propagates the upstream status when the weather fetch is not ok", async () => {
    vi.stubEnv("OPENWEATHER_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => makeRes({ ok: false, status: 404, text: async () => "city not found" }))
    );
    const res = await GET(req("city=Nowhere"));
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string; detail: string };
    expect(body.error).toBe("Weather fetch failed");
    expect(body.detail).toBe("city not found");
  });

  it("resolves the closest forecast points for ~6h and ~12h on the happy path", async () => {
    vi.stubEnv("OPENWEATHER_API_KEY", "test-key");
    vi.useFakeTimers();
    const now = new Date("2026-01-01T00:00:00Z");
    vi.setSystemTime(now);
    const base = Math.floor(now.getTime() / 1000); // seconds

    const list = [
      { dt: base + 3 * 3600, dt_txt: "+3h", main: { temp: 3, humidity: 50 } },
      { dt: base + 6 * 3600, dt_txt: "+6h", main: { temp: 6, humidity: 60 } },
      { dt: base + 9 * 3600, dt_txt: "+9h", main: { temp: 9, humidity: 65 } },
      { dt: base + 12 * 3600, dt_txt: "+12h", main: { temp: 12, humidity: 70 } },
    ];

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeRes({ json: async () => ({ name: "Tallinn", coord: { lat: 59.4, lon: 24.7 } }) })
      )
      .mockResolvedValueOnce(makeRes({ json: async () => ({ list }) }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(req("city=Tallinn"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      picked: { sixHour: { dt_txt: string }; twelveHour: { dt_txt: string } };
    };
    expect(body.picked.sixHour.dt_txt).toBe("+6h");
    expect(body.picked.twelveHour.dt_txt).toBe("+12h");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

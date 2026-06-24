import { GET } from "./route";

// The beach route fetches one XML document of coastal stations. The mocked
// fetch returns the XML string via .text() for xml2js to parse; assertions
// target the route's JSON output shape, not the intermediate parsed object.

function xmlRes(xml: string) {
  return { ok: true, status: 200, text: async () => xml };
}

const STATIONS_XML = `<entries>
  <entry>
    <ametliknimi>Pirita</ametliknimi>
    <LaiusKraad>59</LaiusKraad><LaiusMinut>28</LaiusMinut><LaiusSekund>0</LaiusSekund>
    <PikkusKraad>24</PikkusKraad><PikkusMinut>49</PikkusMinut><PikkusSekund>0</PikkusSekund>
    <wt1ha>18,5</wt1ha>
    <ta1ha>20,1</ta1ha>
    <ws1hx>5,0</ws1hx>
    <wd10ma>180</wd10ma>
    <Time>2026-01-01 12:00</Time>
  </entry>
  <entry>
    <ametliknimi>Parnu</ametliknimi>
    <LaiusKraad>58</LaiusKraad><LaiusMinut>23</LaiusMinut><LaiusSekund>0</LaiusSekund>
    <PikkusKraad>24</PikkusKraad><PikkusMinut>29</PikkusMinut><PikkusSekund>0</PikkusSekund>
    <wt1ha>17,2</wt1ha>
  </entry>
</entries>`;

function req(query: string): Request {
  return new Request(`http://localhost/api/beach?${query}`);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("GET /api/beach", () => {
  it("returns 404 when the upstream fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503, text: async () => "" })));
    const res = await GET(req(""));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "No beach data available" });
  });

  it("returns all stations when no lat/lon is provided", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => xmlRes(STATIONS_XML)));
    const res = await GET(req(""));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { all: Array<{ name: string; temp: number }> };
    expect(body.all).toHaveLength(2);
    expect(body.all.map((s) => s.name)).toEqual(["Pirita", "Parnu"]);
    expect(body.all[0].temp).toBe(18.5); // "18,5" comma-decimal parsed
  });

  it("returns the nearest station plus all when lat/lon is provided", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => xmlRes(STATIONS_XML)));
    // Coordinates near Pirita (Tallinn) — expect it as nearest.
    const res = await GET(req("lat=59.47&lon=24.83"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      nearest: { name: string; distance: number };
      all: unknown[];
    };
    expect(body.nearest.name).toBe("Pirita");
    expect(body.nearest.distance).toBeGreaterThanOrEqual(0);
    expect(body.all).toHaveLength(2);
  });
});

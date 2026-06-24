import { GET } from "./route";

// The humidity route walks back hour-by-hour (hourOffset 0..3), calling fetch
// once per hour until a response yields usable stations. Tests model that
// sequence with mockResolvedValueOnce. The mocked fetch returns an XML string
// via .text(), which xml2js parses; assertions target the route's JSON output,
// not the intermediate parsed object.

function xmlRes(xml: string) {
  return { ok: true, status: 200, text: async () => xml };
}

function emptyRes() {
  return xmlRes("<entries></entries>");
}

const STATION_XML = `<entries>
  <entry>
    <Jaam>Tallinn-Harku</Jaam>
    <LaiusKraad>59</LaiusKraad><LaiusMinut>23</LaiusMinut><LaiusSekund>53</LaiusSekund>
    <PikkusKraad>24</PikkusKraad><PikkusMinut>36</PikkusMinut><PikkusSekund>9</PikkusSekund>
    <rhins>78</rhins>
  </entry>
</entries>`;

function req(query: string): Request {
  return new Request(`http://localhost/api/humidity?${query}`);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("GET /api/humidity", () => {
  it("returns 400 when lat/lon are missing", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "lat and lon parameters required" });
  });

  it("returns 400 when lat/lon are not numeric", async () => {
    const res = await GET(req("lat=abc&lon=xyz"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid lat/lon values" });
  });

  it("returns the nearest station when the first hour has data", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T05:30:00Z"));
    const fetchMock = vi.fn().mockResolvedValueOnce(xmlRes(STATION_XML));
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(req("lat=59.4&lon=24.6"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      nearest: { name: string; humidity: number; distance: number };
      hourStr: string;
      stationsCount: number;
    };
    expect(body.nearest.name).toBe("Tallinn-Harku");
    expect(body.nearest.humidity).toBe(78);
    expect(body.nearest.distance).toBeGreaterThanOrEqual(0);
    expect(body.hourStr).toBe("05");
    expect(body.stationsCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to a later hour when the first hour is empty", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T05:30:00Z"));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(emptyRes())
      .mockResolvedValueOnce(xmlRes(STATION_XML));
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(req("lat=59.4&lon=24.6"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { hourStr: string; nearest: { name: string } };
    expect(body.nearest.name).toBe("Tallinn-Harku");
    expect(body.hourStr).toBe("04"); // fell back one hour
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns 404 when no hour yields data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(emptyRes());
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(req("lat=59.4&lon=24.6"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "No recent humidity data available" });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

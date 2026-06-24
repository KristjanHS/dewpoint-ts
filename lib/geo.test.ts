import {
  haversine,
  dmsToDecimal,
  degToCompass,
  findNearestStation,
} from "./geo";

describe("haversine", () => {
  it("is zero for identical points", () => {
    expect(haversine(59.437, 24.7536, 59.437, 24.7536)).toBe(0);
  });

  it("equals ~111.19 km for one degree of latitude", () => {
    expect(haversine(0, 0, 1, 0)).toBeCloseTo(111.19, 0);
  });

  it("matches a known city pair (Tallinn → Helsinki ≈ 82 km)", () => {
    const d = haversine(59.437, 24.7536, 60.1699, 24.9384);
    expect(d).toBeGreaterThan(80);
    expect(d).toBeLessThan(84);
  });
});

describe("dmsToDecimal", () => {
  it("converts degrees/minutes/seconds to decimal degrees", () => {
    expect(dmsToDecimal(59, 26, 13)).toBeCloseTo(59.4369, 4);
  });

  it("returns the whole degree when minutes and seconds are zero", () => {
    expect(dmsToDecimal(24, 0, 0)).toBe(24);
  });
});

describe("degToCompass", () => {
  it("maps 0° to N", () => {
    expect(degToCompass(0)).toBe("N");
  });

  it("maps the cardinal/intercardinal boundaries", () => {
    expect(degToCompass(45)).toBe("NE");
    expect(degToCompass(90)).toBe("E");
    expect(degToCompass(180)).toBe("S");
    expect(degToCompass(270)).toBe("W");
  });

  it("wraps 360° back to N", () => {
    expect(degToCompass(360)).toBe("N");
  });

  // Regression: Math.round((deg/45) % 8) returned dirs[8] === undefined for
  // bearings in [337.5, 360). The fix is Math.round(deg/45) % 8.
  it("wraps the [337.5, 360) range to N instead of returning undefined", () => {
    expect(degToCompass(337.5)).toBe("N");
    expect(degToCompass(350)).toBe("N");
  });
});

describe("findNearestStation", () => {
  const stations = [
    { name: "far", lat: 0, lon: 0 },
    { name: "near", lat: 59.4, lon: 24.7 },
    { name: "mid", lat: 55, lon: 20 },
  ];

  it("returns the closest station with a distance field attached", () => {
    const result = findNearestStation(59.437, 24.7536, stations);
    expect(result?.name).toBe("near");
    expect(result?.distance).toBeGreaterThan(0);
    expect(result?.distance).toBeLessThan(10);
  });

  it("returns null for an empty station list", () => {
    expect(findNearestStation(59.437, 24.7536, [])).toBeNull();
  });
});

import { dewPoint, recommendation, dewPointGrid } from "./dewpoint";

describe("dewPoint", () => {
  it("matches a known reference value (~20 °C / 50 % RH ≈ 9.3 °C)", () => {
    expect(dewPoint(20, 50)).toBeCloseTo(9.3, 1);
  });

  it("equals the air temperature at 100 % RH", () => {
    expect(dewPoint(20, 100)).toBeCloseTo(20, 5);
  });
});

describe("recommendation", () => {
  it("recommends ventilation when indoor dew point is meaningfully higher (diff > 2)", () => {
    expect(recommendation(15, 10)).toBe(
      "Outdoor dew point is lower. Ventilate / run HRV."
    );
  });

  it("warns against ventilation when outdoor dew point is higher (diff < -2)", () => {
    expect(recommendation(10, 15)).toBe(
      "Outdoor dew point is higher. Keep HRV low to avoid moisture."
    );
  });

  it("reports minor impact when dew points are close (|diff| <= 2)", () => {
    expect(recommendation(12, 11)).toBe(
      "Dew points are close. Ventilation change has minor impact."
    );
  });

  // Boundaries are strict (> 2, < -2), so diff of exactly +/-2 is "close".
  it("treats diff of exactly +2 as close, not a ventilation trigger", () => {
    expect(recommendation(12, 10)).toBe(
      "Dew points are close. Ventilation change has minor impact."
    );
  });

  it("treats diff of exactly -2 as close, not a moisture warning", () => {
    expect(recommendation(10, 12)).toBe(
      "Dew points are close. Ventilation change has minor impact."
    );
  });
});

describe("dewPointGrid", () => {
  it("returns 8 temperatures (13..27 step 2) and 7 humidities (50..98 step 8)", () => {
    const { temperatures, humidities } = dewPointGrid();
    expect(temperatures).toEqual([13, 15, 17, 19, 21, 23, 25, 27]);
    expect(humidities).toEqual([50, 58, 66, 74, 82, 90, 98]);
  });

  it("produces a 7-row × 8-column grid (humidities × temperatures)", () => {
    const { grid } = dewPointGrid();
    expect(grid).toHaveLength(7);
    expect(grid.every((row) => row.length === 8)).toBe(true);
  });

  it("rounds every grid value to at most 1 decimal place", () => {
    const { grid } = dewPointGrid();
    for (const row of grid) {
      for (const value of row) {
        expect(Number(value.toFixed(1))).toBe(value);
      }
    }
  });
});

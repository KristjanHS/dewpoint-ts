export function dewPoint(tempC: number, rh: number): number {
  const a = 17.625;
  const b = 243.04;
  const alpha = Math.log(rh / 100) + (a * tempC) / (b + tempC);
  return (b * alpha) / (a - alpha);
}

export function recommendation(indoorDew: number, outdoorDew: number): string {
  const diff = indoorDew - outdoorDew;
  if (diff > 2) return "Outdoor dew point is lower. Ventilate / run HRV.";
  if (diff < -2) return "Outdoor dew point is higher. Keep HRV low to avoid moisture.";
  return "Dew points are close. Ventilation change has minor impact.";
}

export function dewPointGrid() {
  const temperatures = Array.from({ length: 8 }, (_, i) => 13 + i * 2);
  const humidities = Array.from({ length: 7 }, (_, i) => 50 + i * 8);
  const grid = humidities.map((rh) =>
    temperatures.map((t) => Number(dewPoint(t, rh).toFixed(1)))
  );
  return { temperatures, humidities, grid };
}

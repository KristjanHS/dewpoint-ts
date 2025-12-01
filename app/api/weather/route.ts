import { NextResponse } from "next/server";

const BASE = "https://api.openweathermap.org/data/2.5";

type ForecastPoint = {
  dt: number;
  main?: { temp?: number; humidity?: number };
  dt_txt?: string;
};

function pickClosestForecast(
  list: ForecastPoint[] | undefined,
  targetHours: number
) {
  if (!list || list.length === 0) return null;
  const target = Date.now() + targetHours * 60 * 60 * 1000;
  return list.reduce((closest, point) => {
    const diff = Math.abs(point.dt * 1000 - target);
    if (!closest) return { point, diff };
    return diff < closest.diff ? { point, diff } : closest;
  }, null as { point: ForecastPoint; diff: number } | null)?.point;
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENWEATHER_API_KEY" },
      { status: 500 }
    );
  }

  let locator = "";
  if (city) {
    locator = `q=${encodeURIComponent(city)}`;
  } else if (lat && lon) {
    locator = `lat=${lat}&lon=${lon}`;
  } else {
    return NextResponse.json(
      { error: "Provide either city or lat/lon" },
      { status: 400 }
    );
  }

  const weatherUrl = `${BASE}/weather?${locator}&units=metric&appid=${apiKey}`;
  const debug = { weatherUrl, forecastUrl: "" };

  const weatherRes = await fetch(weatherUrl, { cache: "no-store" });
  if (!weatherRes.ok) {
    const detail = await weatherRes.text();
    return NextResponse.json(
      { error: "Weather fetch failed", detail, debug },
      { status: weatherRes.status }
    );
  }
  const weather = await weatherRes.json();
  const coordLat = weather?.coord?.lat;
  const coordLon = weather?.coord?.lon;

  let forecast: any = null;
  let picked: { sixHour?: ForecastPoint; twelveHour?: ForecastPoint } = {};

  if (coordLat != null && coordLon != null) {
    const forecastUrl = `${BASE}/forecast?lat=${coordLat}&lon=${coordLon}&units=metric&appid=${apiKey}`;
    debug.forecastUrl = forecastUrl;
    const forecastRes = await fetch(forecastUrl, { cache: "no-store" });
    if (forecastRes.ok) {
      forecast = await forecastRes.json();
      const list: ForecastPoint[] = forecast?.list;
      picked = {
        sixHour: pickClosestForecast(list, 6),
        twelveHour: pickClosestForecast(list, 12)
      };
    }
  }

  return NextResponse.json({
    weather,
    forecast,
    picked,
    debug
  });
}

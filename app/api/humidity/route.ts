import { NextResponse } from "next/server";
import { parseStringPromise } from "xml2js";
import { findNearestStation } from "../../../lib/geo";

type HumidityStation = {
  name: string;
  lat: number;
  lon: number;
  humidity: number;
  timestamp: string;
};

export const dynamic = "force-dynamic";

async function fetchEstonianHumidity(
  dateStr: string,
  hourStr: string
): Promise<HumidityStation[]> {
  const url = `https://publicapi.envir.ee/v1/misc/observationAirHumidityMap?date=${dateStr}&hour=${hourStr}`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const xmlText = await response.text();
    const parsed = await parseStringPromise(xmlText);

    const stations: HumidityStation[] = [];
    const entries = parsed?.entries?.entry || [];

    for (const entry of entries) {
      try {
        const stationData: any = {};
        for (const key in entry) {
          const cleanKey = key;
          stationData[cleanKey] = entry[key]?.[0] || null;
        }

        // Convert coordinates
        const lat =
          parseFloat(stationData.LaiusKraad || 0) +
          parseFloat(stationData.LaiusMinut || 0) / 60 +
          parseFloat(stationData.LaiusSekund || 0) / 3600;

        const lon =
          parseFloat(stationData.PikkusKraad || 0) +
          parseFloat(stationData.PikkusMinut || 0) / 60 +
          parseFloat(stationData.PikkusSekund || 0) / 3600;

        // Parse humidity
        const rh = stationData.rhins;
        if (
          rh &&
          rh.toLowerCase() !== "null" &&
          !isNaN(lat) &&
          !isNaN(lon)
        ) {
          const humidity = parseFloat(rh);
          if (!isNaN(humidity)) {
            stations.push({
              name: stationData.Jaam || "Unknown",
              lat,
              lon,
              humidity,
              timestamp: `${dateStr} ${hourStr}:00`,
            });
          }
        }
      } catch (err) {
        continue;
      }
    }

    return stations;
  } catch (error) {
    console.error("Error fetching humidity data:", error);
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const timezone = searchParams.get("timezone") || "Europe/Tallinn";

  if (!lat || !lon) {
    return NextResponse.json(
      { error: "lat and lon parameters required" },
      { status: 400 }
    );
  }

  const userLat = parseFloat(lat);
  const userLon = parseFloat(lon);

  if (isNaN(userLat) || isNaN(userLon)) {
    return NextResponse.json(
      { error: "Invalid lat/lon values" },
      { status: 400 }
    );
  }

  // Try to fetch data for the last few hours
  const now = new Date();
  
  for (let hourOffset = 0; hourOffset < 4; hourOffset++) {
    const targetTime = new Date(now.getTime() - hourOffset * 60 * 60 * 1000);
    const dateStr = targetTime.toISOString().split("T")[0]; // YYYY-MM-DD
    const hourStr = targetTime.getUTCHours().toString().padStart(2, "0");

    const stations = await fetchEstonianHumidity(dateStr, hourStr);

    if (stations.length > 0) {
      const nearest = findNearestStation(userLat, userLon, stations);
      
      if (nearest) {
        return NextResponse.json({
          nearest,
          dateStr,
          hourStr,
          stationsCount: stations.length,
        });
      }
    }
  }

  return NextResponse.json(
    { error: "No recent humidity data available" },
    { status: 404 }
  );
}


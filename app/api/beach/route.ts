import { NextResponse } from "next/server";
import { parseStringPromise } from "xml2js";
import { dmsToDecimal, findNearestStation } from "../../../lib/geo";

const BEACH_API_URL =
  "https://publicapi.envir.ee/v1/combinedWeatherData/coastalSeaStationsWeatherToday";

type BeachStation = {
  name: string;
  lat: number;
  lon: number;
  temp: number;
  ta1ha?: string; // air temperature
  ws1hx?: string; // wind speed
  wd10ma?: string; // wind direction
  Time?: string; // measurement time
};

export const dynamic = "force-dynamic";

async function fetchBeachTemperatures(): Promise<BeachStation[]> {
  try {
    const response = await fetch(BEACH_API_URL, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const xmlText = await response.text();
    const parsed = await parseStringPromise(xmlText);

    const stations: BeachStation[] = [];
    const entries = parsed?.entries?.entry || [];

    for (const entry of entries) {
      try {
        // Extract all fields
        const stationData: any = {};
        for (const key in entry) {
          const cleanKey = key;
          stationData[cleanKey] = entry[key]?.[0] || null;
        }

        // Convert coordinates to decimal
        const lat = dmsToDecimal(
          parseFloat(stationData.LaiusKraad || 0),
          parseFloat(stationData.LaiusMinut || 0),
          parseFloat(stationData.LaiusSekund || 0)
        );
        const lon = dmsToDecimal(
          parseFloat(stationData.PikkusKraad || 0),
          parseFloat(stationData.PikkusMinut || 0),
          parseFloat(stationData.PikkusSekund || 0)
        );

        // Get water temperature
        const waterTemp = stationData.wt1ha
          ? parseFloat(stationData.wt1ha.replace(",", "."))
          : null;

        if (waterTemp !== null && !isNaN(lat) && !isNaN(lon)) {
          stations.push({
            name: stationData.ametliknimi || stationData.Jaam || "Unknown",
            lat,
            lon,
            temp: waterTemp,
            ta1ha: stationData.ta1ha,
            ws1hx: stationData.ws1hx,
            wd10ma: stationData.wd10ma,
            Time: stationData.Time,
          });
        }
      } catch (err) {
        // Skip invalid stations
        continue;
      }
    }

    return stations;
  } catch (error) {
    console.error("Error fetching beach temperatures:", error);
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  const stations = await fetchBeachTemperatures();

  if (stations.length === 0) {
    return NextResponse.json(
      { error: "No beach data available" },
      { status: 404 }
    );
  }

  // If lat/lon provided, find nearest station
  if (lat && lon) {
    const userLat = parseFloat(lat);
    const userLon = parseFloat(lon);

    if (!isNaN(userLat) && !isNaN(userLon)) {
      const nearest = findNearestStation(userLat, userLon, stations);
      return NextResponse.json({ nearest, all: stations });
    }
  }

  // Otherwise return all stations
  return NextResponse.json({ all: stations });
}


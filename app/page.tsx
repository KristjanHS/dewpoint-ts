"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { dewPoint, dewPointGrid, recommendation } from "../lib/dewpoint";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

type ForecastPoint = {
  dt?: number;
  dt_txt?: string;
  main?: { temp?: number; humidity?: number };
};

type WeatherResponse = {
  weather: {
    name?: string;
    sys?: { country?: string };
    coord?: { lat?: number; lon?: number };
    main?: { temp?: number; humidity?: number };
  };
  picked?: { sixHour?: ForecastPoint; twelveHour?: ForecastPoint };
  debug?: { weatherUrl?: string; forecastUrl?: string };
  error?: string;
  detail?: string;
};

type BeachStation = {
  name: string;
  lat: number;
  lon: number;
  temp: number;
  ta1ha?: string;
  ws1hx?: string;
  wd10ma?: string;
  Time?: string;
  distance?: number;
};

type HumidityStation = {
  name: string;
  lat: number;
  lon: number;
  humidity: number;
  timestamp: string;
  distance?: number;
};

export default function Page() {
  const [city, setCity] = useState("Viimsi");
  const [useGps, setUseGps] = useState(true);
  const [geo, setGeo] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [outdoorTemp, setOutdoorTemp] = useState(15);
  const [outdoorRh, setOutdoorRh] = useState(60);
  const [indoorTemp, setIndoorTemp] = useState(22);
  const [indoorRh, setIndoorRh] = useState(50);

  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [forecastSix, setForecastSix] = useState<ForecastPoint | null>(null);
  const [forecastTwelve, setForecastTwelve] = useState<ForecastPoint | null>(null);

  const [beachData, setBeachData] = useState<BeachStation | null>(null);
  const [humidityData, setHumidityData] = useState<HumidityStation | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setUseGps(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setUseGps(true);
      },
      () => setUseGps(false),
      { timeout: 4000 }
    );
  }, []);

  async function fetchWeather() {
    setLoading(true);
    setError(null);
    try {
      const query = useGps && geo
        ? `lat=${geo.lat}&lon=${geo.lon}`
        : `city=${encodeURIComponent(city || "Viimsi")}`;
      const res = await fetch(`/api/weather?${query}`);
      const json: WeatherResponse = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || json.detail || "Weather fetch failed");
      }
      const temp = json.weather.main?.temp;
      const rh = json.weather.main?.humidity;
      if (typeof temp === "number") setOutdoorTemp(Number(temp.toFixed(1)));
      if (typeof rh === "number") setOutdoorRh(rh);
      const name = json.weather.name;
      const country = json.weather.sys?.country;
      const coords = json.weather.coord;
      if (name || coords) {
        const label = name
          ? `${name}${country ? ", " + country : ""}`
          : coords
            ? `${coords.lat?.toFixed(3)}, ${coords.lon?.toFixed(3)}`
            : null;
        setLocationLabel(label);
      }
      setForecastSix(json.picked?.sixHour || null);
      setForecastTwelve(json.picked?.twelveHour || null);
    } catch (err: any) {
      setError(err.message || "Unable to fetch weather");
    } finally {
      setLoading(false);
    }
  }

  async function fetchEstonianData() {
    if (!geo) return;

    // Fetch beach data
    try {
      const beachRes = await fetch(`/api/beach?lat=${geo.lat}&lon=${geo.lon}`);
      if (beachRes.ok) {
        const beachJson = await beachRes.json();
        setBeachData(beachJson.nearest || null);
      }
    } catch (err) {
      console.error("Beach data fetch failed:", err);
    }

    // Fetch humidity data
    try {
      const humidityRes = await fetch(`/api/humidity?lat=${geo.lat}&lon=${geo.lon}`);
      if (humidityRes.ok) {
        const humidityJson = await humidityRes.json();
        setHumidityData(humidityJson.nearest || null);
      }
    } catch (err) {
      console.error("Humidity data fetch failed:", err);
    }
  }

  useEffect(() => {
    fetchWeather().catch(() => undefined);
    if (geo) {
      fetchEstonianData().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useGps, geo?.lat, geo?.lon]);

  const indoorDew = useMemo(() => dewPoint(indoorTemp, indoorRh), [indoorTemp, indoorRh]);
  const outdoorDew = useMemo(() => dewPoint(outdoorTemp, outdoorRh), [outdoorTemp, outdoorRh]);

  const grid = useMemo(() => dewPointGrid(), []);

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Dew Point Advisor</h1>
        <span className="pill">Vercel-ready Next.js</span>
      </div>

      <p className="muted" style={{ marginTop: 6, marginBottom: 18 }}>
        Compare indoor vs outdoor dew points to decide when to ventilate. Uses OpenWeather for live data and forecasts.
      </p>

      <div className="grid two">
        <div className="card">
          <h2 className="section-title">Location & Weather</h2>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <button
              className="primary"
              style={{ opacity: useGps ? 1 : 0.7 }}
              onClick={() => setUseGps(true)}
              disabled={useGps}
            >
              Use GPS
            </button>
            <button
              className="primary"
              style={{ background: "rgba(148, 163, 184, 0.2)", color: "#e2e8f0" }}
              onClick={() => setUseGps(false)}
              disabled={!useGps}
            >
              Use City
            </button>
          </div>

          {!useGps && (
            <label>
              City name
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Tallinn,EE"
              />
            </label>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button className="primary" onClick={fetchWeather} disabled={loading}>
              {loading ? "Loading..." : "Refresh weather"}
            </button>
            {locationLabel && <span className="pill">{locationLabel}</span>}
          </div>

          {error && (
            <div className="pill error" style={{ marginTop: 10 }}>
              {error}
            </div>
          )}

          <div className="grid two" style={{ marginTop: 16 }}>
            <label>
              Outdoor temperature (°C)
              <input
                type="number"
                step="0.5"
                value={outdoorTemp}
                onChange={(e) => setOutdoorTemp(parseFloat(e.target.value))}
              />
            </label>
            <label>
              Outdoor humidity (%)
              <input
                type="number"
                step="1"
                value={outdoorRh}
                onChange={(e) => setOutdoorRh(parseFloat(e.target.value))}
              />
            </label>
          </div>

          <div className="grid two" style={{ marginTop: 12 }}>
            <label>
              Indoor temperature (°C)
              <input
                type="number"
                step="0.5"
                value={indoorTemp}
                onChange={(e) => setIndoorTemp(parseFloat(e.target.value))}
              />
            </label>
            <label>
              Indoor humidity (%)
              <input
                type="number"
                step="1"
                value={indoorRh}
                onChange={(e) => setIndoorRh(parseFloat(e.target.value))}
              />
            </label>
          </div>

          <div className="grid two" style={{ marginTop: 16 }}>
            <div className="pill">
              Indoor dew point: {indoorDew.toFixed(1)} °C
            </div>
            <div className="pill">
              Outdoor dew point: {outdoorDew.toFixed(1)} °C
            </div>
          </div>

          <p style={{ marginTop: 12 }}>{recommendation(indoorDew, outdoorDew)}</p>

          {(forecastSix || forecastTwelve) && (
            <div style={{ marginTop: 12 }}>
              <h3 className="section-title" style={{ fontSize: 16 }}>Forecast snapshot</h3>
              <div className="grid two">
                {forecastSix && (
                  <div className="card" style={{ padding: 12 }}>
                    <strong>~6h</strong>
                    <div className="muted">{forecastSix.dt_txt || "next slot"}</div>
                    <div>{forecastSix.main?.temp?.toFixed(1)} °C, RH {forecastSix.main?.humidity ?? "--"}%</div>
                  </div>
                )}
                {forecastTwelve && (
                  <div className="card" style={{ padding: 12 }}>
                    <strong>~12h</strong>
                    <div className="muted">{forecastTwelve.dt_txt || "next slot"}</div>
                    <div>{forecastTwelve.main?.temp?.toFixed(1)} °C, RH {forecastTwelve.main?.humidity ?? "--"}%</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="section-title">Dew point heatmap</h2>
          <div className="muted" style={{ marginBottom: 8 }}>
            Heatmap of dew point at different temperatures and humidities. Markers show your indoor/outdoor points.
          </div>
          <div style={{ width: "100%", minHeight: 380 }}>
            <Plot
              data={[
                {
                  z: grid.grid,
                  x: grid.temperatures,
                  y: grid.humidities,
                  type: "heatmap",
                  colorscale: "YlGnBu",
                  hovertemplate: "Temp %{x}°C<br>RH %{y}%<br>Dew %{z}°C<extra></extra>"
                },
                {
                  x: [outdoorTemp],
                  y: [outdoorRh],
                  mode: "markers+text",
                  marker: { color: "#0ea5e9", size: 12 },
                  text: ["Outdoor"],
                  textposition: "top center",
                  name: "Outdoor"
                },
                {
                  x: [indoorTemp],
                  y: [indoorRh],
                  mode: "markers+text",
                  marker: { color: "#f97316", size: 12 },
                  text: ["Indoor"],
                  textposition: "top center",
                  name: "Indoor"
                }
              ]}
              layout={{
                autosize: true,
                paper_bgcolor: "rgba(0,0,0,0)",
                plot_bgcolor: "rgba(0,0,0,0)",
                margin: { t: 20, r: 10, b: 50, l: 50 },
                xaxis: { title: "Temperature (°C)" },
                yaxis: { title: "Relative humidity (%)" },
                legend: { orientation: "h", y: -0.2 }
              }}
              style={{ width: "100%", height: 360 }}
              useResizeHandler
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        </div>
      </div>

      {/* Estonian Beach Temperature */}
      {beachData && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 className="section-title">Nearest beach</h2>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              {beachData.name}
            </div>
            <div className="grid two" style={{ gap: 8 }}>
              <div>
                <strong>Water temperature:</strong> {beachData.temp.toFixed(1)} °C
              </div>
              {beachData.ta1ha && (
                <div>
                  <strong>Air temperature:</strong> {beachData.ta1ha} °C
                </div>
              )}
              {beachData.ws1hx && (
                <div>
                  <strong>Wind speed:</strong>{" "}
                  {parseFloat(beachData.ws1hx.replace(",", ".")).toFixed(1)} m/s (
                  {(parseFloat(beachData.ws1hx.replace(",", ".")) * 3.6).toFixed(1)} km/h)
                </div>
              )}
              {beachData.wd10ma && (
                <div>
                  <strong>Wind direction:</strong> {Math.round(parseFloat(beachData.wd10ma))}°
                </div>
              )}
            </div>
            {beachData.Time && (
              <div className="muted" style={{ marginTop: 8 }}>
                Measurement time: {new Date(beachData.Time).toLocaleString()}
              </div>
            )}
            {beachData.distance && (
              <div className="muted" style={{ marginTop: 4 }}>
                Distance: {beachData.distance.toFixed(2)} km
              </div>
            )}
          </div>
        </div>
      )}

      {/* Estonian Humidity Comparison */}
      {humidityData && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 className="section-title">Estonian Environment Agency Humidity</h2>
          <div>
            <div style={{ marginBottom: 8 }}>
              <strong>Station:</strong> {humidityData.name}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>Relative humidity:</strong> {humidityData.humidity.toFixed(0)}%
            </div>
            <div className="muted" style={{ marginBottom: 8 }}>
              Measured at: {humidityData.timestamp}
            </div>
            {humidityData.distance && (
              <div className="muted">
                Distance: {humidityData.distance.toFixed(2)} km
              </div>
            )}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(148, 163, 184, 0.2)" }}>
              <strong>OpenWeatherMap humidity (comparison):</strong> {outdoorRh.toFixed(0)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

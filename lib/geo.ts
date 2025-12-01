// Geographical utility functions

/**
 * Calculate the great circle distance between two points on Earth using the Haversine formula
 * @param lat1 Latitude of first point in decimal degrees
 * @param lon1 Longitude of first point in decimal degrees
 * @param lat2 Latitude of second point in decimal degrees
 * @param lon2 Longitude of second point in decimal degrees
 * @returns Distance in kilometers
 */
export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const lon1Rad = toRadians(lon1);
  const lon2Rad = toRadians(lon2);
  
  const dlon = lon2Rad - lon1Rad;
  const dlat = lat2Rad - lat1Rad;
  
  const a =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dlon / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));
  const r = 6371; // Radius of earth in kilometers
  
  return c * r;
}

/**
 * Convert degrees/minutes/seconds to decimal degrees
 */
export function dmsToDecimal(deg: number, min: number, sec: number): number {
  return deg + min / 60 + sec / 3600;
}

/**
 * Convert wind direction in degrees to compass direction
 */
export function degToCompass(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const ix = Math.round((deg / 45) % 8);
  return dirs[ix];
}

/**
 * Find the nearest station to a given location
 */
export function findNearestStation<T extends { lat: number; lon: number }>(
  userLat: number,
  userLon: number,
  stations: T[]
): (T & { distance: number }) | null {
  let minDist = Infinity;
  let nearest: (T & { distance: number }) | null = null;
  
  for (const station of stations) {
    const dist = haversine(userLat, userLon, station.lat, station.lon);
    if (dist < minDist) {
      minDist = dist;
      nearest = { ...station, distance: dist };
    }
  }
  
  return nearest;
}


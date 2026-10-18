export interface LatLon {
  lat: number;
  lon: number;
}

const EARTH_MEAN_RADIUS_M = 6_371_008.8;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance between two coordinates in meters (haversine formula). */
export function distanceMeters(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_MEAN_RADIUS_M * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatDistance(meters: number, locale?: string): string {
  if (meters < 1000) {
    const rounded = Math.max(10, Math.round(meters / 10) * 10);
    return new Intl.NumberFormat(locale, { style: 'unit', unit: 'meter' }).format(rounded);
  }
  const km = meters / 1000;
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'kilometer',
    maximumFractionDigits: km < 10 ? 1 : 0,
  }).format(km);
}

export function isValidLatLon(value: Partial<LatLon> | undefined): value is LatLon {
  return (
    !!value &&
    typeof value.lat === 'number' &&
    typeof value.lon === 'number' &&
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lon) &&
    Math.abs(value.lat) <= 90 &&
    Math.abs(value.lon) <= 180
  );
}

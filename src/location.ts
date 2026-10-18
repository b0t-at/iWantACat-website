import { isValidLatLon, type LatLon } from './geo.ts';

const IP_GEOLOCATION_URL = 'https://get.geojs.io/v1/ip/geo.json';

export class LocationDeniedError extends Error {
  constructor() {
    super('Location permission denied');
    this.name = 'LocationDeniedError';
  }
}

export interface UserLocation {
  position: LatLon;
  /** True when the position was derived from the IP address. */
  approximate: boolean;
}

function browserLocation(timeoutMs: number): Promise<LatLon> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude }),
      (error) =>
        reject(error.code === error.PERMISSION_DENIED ? new LocationDeniedError() : new Error(error.message)),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 10 * 60_000 },
    );
  });
}

async function ipLocation(signal?: AbortSignal): Promise<LatLon> {
  const response = await fetch(IP_GEOLOCATION_URL, { signal });
  if (!response.ok) throw new Error(`IP geolocation failed: HTTP ${response.status}`);
  const data = (await response.json()) as { latitude?: string; longitude?: string };
  const position = { lat: Number(data.latitude), lon: Number(data.longitude) };
  if (!isValidLatLon(position)) throw new Error('IP geolocation returned no position');
  return position;
}

/**
 * Asks the browser for the user's position. If that fails for technical reasons
 * (not because the user refused), falls back to an approximate IP-based position.
 */
export async function locateUser(signal?: AbortSignal): Promise<UserLocation> {
  try {
    return { position: await browserLocation(15_000), approximate: false };
  } catch (error) {
    if (error instanceof LocationDeniedError) throw error;
    return { position: await ipLocation(signal), approximate: true };
  }
}

import { isValidLatLon, type LatLon } from './geo.ts';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export interface Place extends LatLon {
  label: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

/** Geocodes free text (city, address, postcode) using OpenStreetMap Nominatim. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const url = new URL(NOMINATIM_URL);
  url.search = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '5',
    'accept-language': navigator.language,
  }).toString();

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Place search failed: HTTP ${response.status}`);
  const results = (await response.json()) as NominatimResult[];
  return results
    .map((r) => ({ lat: Number(r.lat), lon: Number(r.lon), label: r.display_name }))
    .filter((place) => isValidLatLon(place) && place.label);
}

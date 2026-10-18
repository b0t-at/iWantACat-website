import { distanceMeters, isValidLatLon, type LatLon } from './geo.ts';

export interface Shelter extends LatLon {
  /** OSM element reference, e.g. "n123" (node), "w45" (way), "r6" (relation). */
  id: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  openingHours?: string;
  operator?: string;
  animals?: string[];
}

export interface NearbyShelter extends Shelter {
  distance: number;
}

export interface ShelterDataset {
  generated: string;
  count: number;
  shelters: Shelter[];
}

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  elements: OverpassElement[];
  remark?: string;
}

type Tags = Record<string, string | undefined>;

/** `animal_shelter=*` values that indicate the shelter may have cats. */
const CAT_FRIENDLY_VALUES = new Set([
  'cat',
  'cats',
  'yes',
  'mammal',
  'mammals',
  'pet',
  'pets',
  'small_animals',
  'domestic_animals',
  'multiple',
  'all',
  'various',
]);

const TYPE_PREFIX = { node: 'n', way: 'w', relation: 'r' } as const;
const PREFIX_TYPE: Record<string, string> = { n: 'node', w: 'way', r: 'relation' };

export const SHELTER_SELECTOR = 'nwr["amenity"="animal_shelter"]';

export function buildAroundQuery(center: LatLon, radiusMeters: number, timeoutSeconds = 25): string {
  const lat = center.lat.toFixed(5);
  const lon = center.lon.toFixed(5);
  return `[out:json][timeout:${timeoutSeconds}];${SHELTER_SELECTOR}(around:${Math.round(radiusMeters)},${lat},${lon});out center tags;`;
}

export function buildGlobalQuery(timeoutSeconds = 900): string {
  return `[out:json][timeout:${timeoutSeconds}];${SHELTER_SELECTOR};out center tags;`;
}

export function splitValues(value: string | undefined): string[] {
  return (value ?? '')
    .split(';')
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Shelters that are sanctuaries or explicitly only take non-cat animals are irrelevant here. */
export function isRelevantShelter(tags: Tags): boolean {
  if (tags['animal_shelter:sanctuary'] === 'yes') return false;
  const animals = splitValues(tags.animal_shelter).map((v) => v.toLowerCase());
  return animals.length === 0 || animals.some((v) => CAT_FRIENDLY_VALUES.has(v));
}

export function formatAddress(tags: Tags): string | undefined {
  if (tags['addr:full']) return tags['addr:full'].trim();
  const street = [tags['addr:street'] ?? tags['addr:place'], tags['addr:housenumber']]
    .filter(Boolean)
    .join(' ');
  const city = [tags['addr:postcode'], tags['addr:city']].filter(Boolean).join(' ');
  const address = [street, city].filter(Boolean).join(', ');
  return address || undefined;
}

/** Returns a safe absolute http(s) URL or undefined. */
export function normalizeWebsite(raw: string | undefined): string | undefined {
  const value = splitValues(raw)[0];
  if (!value || /\s/.test(value)) return undefined;
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(value);
  if (hasScheme && !/^https?:\/\//i.test(value)) return undefined;
  try {
    const url = new URL(hasScheme ? value : `https://${value}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    if (!url.hostname.includes('.')) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function normalizeEmail(raw: string | undefined): string | undefined {
  const value = splitValues(raw)[0];
  return value && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(value) ? value : undefined;
}

export function normalizePhone(raw: string | undefined): string | undefined {
  const value = splitValues(raw)[0];
  return value && /^\+?[\d\s()./-]{4,}$/.test(value) && /\d{3,}/.test(value.replace(/\D/g, ''))
    ? value
    : undefined;
}

const roundCoord = (value: number): number => Math.round(value * 1e5) / 1e5;

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function elementToShelter(element: OverpassElement): Shelter | undefined {
  const tags: Tags = element.tags ?? {};
  if (!isRelevantShelter(tags)) return undefined;
  const position = element.type === 'node' ? { lat: element.lat, lon: element.lon } : element.center;
  if (!isValidLatLon(position)) return undefined;

  const shelter: Shelter = {
    id: `${TYPE_PREFIX[element.type]}${element.id}`,
    lat: roundCoord(position.lat),
    lon: roundCoord(position.lon),
    name: clean(tags.name),
    address: formatAddress(tags),
    phone: normalizePhone(tags.phone ?? tags['contact:phone']),
    email: normalizeEmail(tags.email ?? tags['contact:email']),
    website: normalizeWebsite(tags.website ?? tags['contact:website'] ?? tags.url),
    openingHours: clean(tags.opening_hours),
    operator: clean(tags.operator),
    animals: splitValues(tags.animal_shelter).filter((v) => v !== 'yes'),
  };
  if (!shelter.animals?.length) delete shelter.animals;
  for (const key of Object.keys(shelter) as (keyof Shelter)[]) {
    if (shelter[key] === undefined) delete shelter[key];
  }
  return shelter;
}

export function parseOverpass(response: OverpassResponse): Shelter[] {
  const seen = new Set<string>();
  const shelters: Shelter[] = [];
  for (const element of response.elements ?? []) {
    const shelter = elementToShelter(element);
    if (shelter && !seen.has(shelter.id)) {
      seen.add(shelter.id);
      shelters.push(shelter);
    }
  }
  return shelters;
}

export function nearestShelters(shelters: Shelter[], origin: LatLon, limit: number): NearbyShelter[] {
  return shelters
    .map((shelter) => ({ ...shelter, distance: distanceMeters(origin, shelter) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

export function osmUrl(id: string): string | undefined {
  const type = PREFIX_TYPE[id.charAt(0)];
  const num = id.slice(1);
  return type && /^\d+$/.test(num) ? `https://www.openstreetmap.org/${type}/${num}` : undefined;
}

export function directionsUrl(shelter: LatLon): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${shelter.lat},${shelter.lon}`;
}

export function isShelterDataset(value: unknown): value is ShelterDataset {
  const data = value as ShelterDataset | null;
  return !!data && typeof data.generated === 'string' && Array.isArray(data.shelters);
}

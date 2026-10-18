import type { LatLon } from './geo.ts';
import { queryOverpass } from './overpass.ts';
import {
  buildAroundQuery,
  isShelterDataset,
  nearestShelters,
  parseOverpass,
  type NearbyShelter,
  type ShelterDataset,
} from './shelters.ts';

export const RESULT_LIMIT = 25;
const LIVE_RADII_M = [50_000, 200_000];

export interface ShelterResult {
  shelters: NearbyShelter[];
  source: 'dataset' | 'live';
  generated?: string;
}

let datasetPromise: Promise<ShelterDataset | null> | undefined;

/** Loads the prebuilt dataset once; resolves to null if it's unavailable. */
export function loadDataset(): Promise<ShelterDataset | null> {
  datasetPromise ??= fetch(`${import.meta.env.BASE_URL}data/shelters.json`)
    .then((response) => (response.ok ? response.json() : null))
    .then((data: unknown) => (isShelterDataset(data) ? data : null))
    .catch(() => null);
  return datasetPromise;
}

export async function findShelters(origin: LatLon, signal?: AbortSignal): Promise<ShelterResult> {
  const dataset = await loadDataset();
  signal?.throwIfAborted();
  if (dataset) {
    return {
      shelters: nearestShelters(dataset.shelters, origin, RESULT_LIMIT),
      source: 'dataset',
      generated: dataset.generated,
    };
  }

  // Fallback: query OpenStreetMap live, widening the radius if nothing is close by.
  let shelters: NearbyShelter[] = [];
  for (const radius of LIVE_RADII_M) {
    const response = await queryOverpass(buildAroundQuery(origin, radius), { signal });
    shelters = nearestShelters(parseOverpass(response), origin, RESULT_LIMIT);
    if (shelters.length) break;
  }
  return { shelters, source: 'live' };
}

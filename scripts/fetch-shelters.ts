/**
 * Downloads all animal shelters worldwide from OpenStreetMap (via Overpass)
 * and writes a compact dataset to public/data/shelters.json.
 *
 * Usage: node scripts/fetch-shelters.ts [--fallback-url=https://iwanta.cat/data/shelters.json]
 *
 * If Overpass is unavailable, the previously published dataset from --fallback-url is reused.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { queryOverpass } from '../src/overpass.ts';
import { buildGlobalQuery, isShelterDataset, parseOverpass, type ShelterDataset } from '../src/shelters.ts';

const OUTPUT = resolve(import.meta.dirname, '../public/data/shelters.json');
const ATTEMPTS = 3;
const RETRY_DELAY_MS = 60_000;
const ENDPOINT_TIMEOUT_MS = 8 * 60_000;
// Overall budget for Overpass, kept well below the CI step timeout so the fallback still gets to run.
const OVERPASS_BUDGET_MS = 20 * 60_000;
const USER_AGENT = 'iwanta.cat dataset builder (https://github.com/b0t-at/iWantACat-website)';

const fallbackUrl = process.argv.find((arg) => arg.startsWith('--fallback-url='))?.split('=')[1];

async function fromOverpass(): Promise<ShelterDataset> {
  const signal = AbortSignal.timeout(OVERPASS_BUDGET_MS);
  for (let attempt = 1; ; attempt++) {
    try {
      console.log(`Querying Overpass (attempt ${attempt}/${ATTEMPTS}) …`);
      const response = await queryOverpass(buildGlobalQuery(), {
        signal,
        timeoutMs: ENDPOINT_TIMEOUT_MS,
        headers: { 'User-Agent': USER_AGENT },
      });
      const shelters = parseOverpass(response).sort((a, b) => a.id.localeCompare(b.id));
      if (shelters.length < 1000) throw new Error(`Suspiciously few shelters (${shelters.length})`);
      return { generated: new Date().toISOString(), count: shelters.length, shelters };
    } catch (error) {
      console.warn(error instanceof Error ? error.message : error);
      if (attempt >= ATTEMPTS || signal.aborted) throw error;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      if (signal.aborted) throw new Error('Overpass time budget exhausted');
    }
  }
}

async function fromFallback(url: string): Promise<ShelterDataset> {
  console.log(`Falling back to previously published dataset: ${url}`);
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(2 * 60_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data: unknown = await response.json();
  if (!isShelterDataset(data)) throw new Error('Fallback dataset is malformed');
  return data;
}

let dataset: ShelterDataset;
try {
  dataset = await fromOverpass();
} catch (error) {
  if (!fallbackUrl) throw error;
  dataset = await fromFallback(fallbackUrl);
}

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, JSON.stringify(dataset));
console.log(`Wrote ${dataset.count} shelters (generated ${dataset.generated}) to ${OUTPUT}`);

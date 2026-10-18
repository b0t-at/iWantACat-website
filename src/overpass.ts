import type { OverpassResponse } from './shelters.ts';

export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

export interface OverpassOptions {
  signal?: AbortSignal;
  /** Per-endpoint timeout. */
  timeoutMs?: number;
  endpoints?: string[];
  headers?: Record<string, string>;
}

/** Runs an Overpass QL query, trying each endpoint in turn until one succeeds. */
export async function queryOverpass(query: string, options: OverpassOptions = {}): Promise<OverpassResponse> {
  const { signal, timeoutMs = 30_000, endpoints = OVERPASS_ENDPOINTS, headers } = options;
  const errors: string[] = [];

  for (const endpoint of endpoints) {
    signal?.throwIfAborted();
    const requestSignal = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
      : AbortSignal.timeout(timeoutMs);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: new URLSearchParams({ data: query }),
        headers,
        signal: requestSignal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as OverpassResponse;
      if (!Array.isArray(data.elements)) throw new Error('Malformed response');
      // Overpass reports timeouts/out-of-memory as a remark on an otherwise "successful" response.
      if (data.remark && /error/i.test(data.remark)) throw new Error(data.remark);
      return data;
    } catch (error) {
      signal?.throwIfAborted();
      errors.push(`${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`All Overpass endpoints failed:\n${errors.join('\n')}`);
}

import { describe, expect, it } from 'vitest';
import { distanceMeters, formatDistance, isValidLatLon } from './geo.ts';

describe('distanceMeters', () => {
  it('is zero for identical points', () => {
    expect(distanceMeters({ lat: 48.2, lon: 16.37 }, { lat: 48.2, lon: 16.37 })).toBe(0);
  });

  it('matches the known Vienna–Munich distance (~355 km)', () => {
    const km = distanceMeters({ lat: 48.2082, lon: 16.3738 }, { lat: 48.1351, lon: 11.582 }) / 1000;
    expect(km).toBeGreaterThan(350);
    expect(km).toBeLessThan(360);
  });

  it('is symmetric', () => {
    const a = { lat: 10, lon: 20 };
    const b = { lat: -33, lon: 151 };
    expect(distanceMeters(a, b)).toBeCloseTo(distanceMeters(b, a));
  });
});

describe('formatDistance', () => {
  it('uses meters below 1 km', () => {
    expect(formatDistance(234, 'en')).toBe('230 m');
  });

  it('uses one decimal below 10 km and none above', () => {
    expect(formatDistance(3456, 'en')).toBe('3.5 km');
    expect(formatDistance(23_456, 'en')).toBe('23 km');
  });
});

describe('isValidLatLon', () => {
  it('rejects NaN and out-of-range values', () => {
    expect(isValidLatLon({ lat: NaN, lon: 0 })).toBe(false);
    expect(isValidLatLon({ lat: 91, lon: 0 })).toBe(false);
    expect(isValidLatLon({ lat: 0, lon: 181 })).toBe(false);
    expect(isValidLatLon(undefined)).toBe(false);
    expect(isValidLatLon({ lat: 48, lon: 13 })).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildAroundQuery,
  elementToShelter,
  formatAddress,
  isRelevantShelter,
  nearestShelters,
  normalizeEmail,
  normalizePhone,
  normalizeWebsite,
  osmUrl,
  parseOverpass,
  type OverpassElement,
} from './shelters.ts';

describe('isRelevantShelter', () => {
  it('keeps shelters without a species tag or with cats', () => {
    expect(isRelevantShelter({})).toBe(true);
    expect(isRelevantShelter({ animal_shelter: 'cat' })).toBe(true);
    expect(isRelevantShelter({ animal_shelter: 'dog;cat' })).toBe(true);
    expect(isRelevantShelter({ animal_shelter: 'Dog; Cat ' })).toBe(true);
    expect(isRelevantShelter({ animal_shelter: 'yes' })).toBe(true);
  });

  it('drops sanctuaries and shelters for other animals only', () => {
    expect(isRelevantShelter({ 'animal_shelter:sanctuary': 'yes' })).toBe(false);
    expect(isRelevantShelter({ animal_shelter: 'dog' })).toBe(false);
    expect(isRelevantShelter({ animal_shelter: 'bird;wildlife' })).toBe(false);
    expect(isRelevantShelter({ animal_shelter: 'horse' })).toBe(false);
  });
});

describe('normalizeWebsite', () => {
  it('adds a scheme and validates', () => {
    expect(normalizeWebsite('tierheim.at')).toBe('https://tierheim.at/');
    expect(normalizeWebsite('http://example.org/a?b=1')).toBe('http://example.org/a?b=1');
    expect(normalizeWebsite('https://a.example;https://b.example')).toBe('https://a.example/');
  });

  it('rejects dangerous or invalid values', () => {
    expect(normalizeWebsite('javascript:alert(1)')).toBeUndefined();
    expect(normalizeWebsite('data:text/html,hi')).toBeUndefined();
    expect(normalizeWebsite('not a url')).toBeUndefined();
    expect(normalizeWebsite('localhost')).toBeUndefined();
    expect(normalizeWebsite(undefined)).toBeUndefined();
  });
});

describe('contact normalization', () => {
  it('accepts plausible phone numbers and emails', () => {
    expect(normalizePhone('+43 1 734 11 02')).toBe('+43 1 734 11 02');
    expect(normalizePhone('+49 851 1234;+49 851 5678')).toBe('+49 851 1234');
    expect(normalizeEmail('info@tierheim.at')).toBe('info@tierheim.at');
  });

  it('rejects junk', () => {
    expect(normalizePhone('call us')).toBeUndefined();
    expect(normalizePhone('12')).toBeUndefined();
    expect(normalizeEmail('<script>@x.y')).toBeUndefined();
    expect(normalizeEmail('nope')).toBeUndefined();
  });
});

describe('formatAddress', () => {
  it('combines street and city parts', () => {
    expect(
      formatAddress({
        'addr:street': 'Triester Straße',
        'addr:housenumber': '114',
        'addr:postcode': '1100',
        'addr:city': 'Wien',
      }),
    ).toBe('Triester Straße 114, 1100 Wien');
    expect(formatAddress({ 'addr:city': 'Passau' })).toBe('Passau');
    expect(formatAddress({ 'addr:full': ' Somewhere 1 ' })).toBe('Somewhere 1');
    expect(formatAddress({})).toBeUndefined();
  });
});

describe('elementToShelter / parseOverpass', () => {
  const node: OverpassElement = {
    type: 'node',
    id: 1,
    lat: 48.123456789,
    lon: 13.987654321,
    tags: { amenity: 'animal_shelter', name: ' Tierheim ', animal_shelter: 'cat;dog', website: 'tierheim.de' },
  };
  const way: OverpassElement = {
    type: 'way',
    id: 2,
    center: { lat: 48.2, lon: 14 },
    tags: { amenity: 'animal_shelter', animal_shelter: 'dog' },
  };
  const relation: OverpassElement = { type: 'relation', id: 3, center: { lat: 48.3, lon: 14.1 }, tags: {} };

  it('maps nodes and uses the center of ways/relations', () => {
    expect(elementToShelter(node)).toEqual({
      id: 'n1',
      lat: 48.12346,
      lon: 13.98765,
      name: 'Tierheim',
      website: 'https://tierheim.de/',
      animals: ['cat', 'dog'],
    });
    expect(elementToShelter(relation)).toEqual({ id: 'r3', lat: 48.3, lon: 14.1 });
  });

  it('filters irrelevant and position-less elements and dedupes', () => {
    const noPosition: OverpassElement = { type: 'way', id: 9, tags: {} };
    const shelters = parseOverpass({ elements: [node, way, relation, noPosition, node] });
    expect(shelters.map((s) => s.id)).toEqual(['n1', 'r3']);
  });
});

describe('nearestShelters', () => {
  it('sorts by distance and limits results', () => {
    const shelters = [
      { id: 'n1', lat: 48.5, lon: 13.5 },
      { id: 'n2', lat: 48.1, lon: 13.1 },
      { id: 'n3', lat: 49, lon: 14 },
    ];
    const result = nearestShelters(shelters, { lat: 48, lon: 13 }, 2);
    expect(result.map((s) => s.id)).toEqual(['n2', 'n1']);
    expect(result[0]!.distance).toBeLessThan(result[1]!.distance);
  });
});

describe('helpers', () => {
  it('builds OSM URLs', () => {
    expect(osmUrl('n42')).toBe('https://www.openstreetmap.org/node/42');
    expect(osmUrl('w7')).toBe('https://www.openstreetmap.org/way/7');
    expect(osmUrl('x1')).toBeUndefined();
  });

  it('builds an around query', () => {
    expect(buildAroundQuery({ lat: 48.1234567, lon: 13.1 }, 50_000)).toBe(
      '[out:json][timeout:25];nwr["amenity"="animal_shelter"](around:50000,48.12346,13.10000);out center tags;',
    );
  });
});

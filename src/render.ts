import { formatDistance } from './geo.ts';
import { directionsUrl, osmUrl, type NearbyShelter } from './shelters.ts';

type Child = Node | string | null | undefined | false;

/** Minimal element factory; strings are always inserted as text, never as HTML. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Record<string, string>> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined) el.setAttribute(key, value);
  }
  for (const child of children) {
    if (child) el.append(child);
  }
  return el;
}

const externalLink = (href: string, text: string, className?: string): HTMLAnchorElement =>
  h('a', { href, target: '_blank', rel: 'noopener noreferrer', class: className }, text);

export const shelterName = (shelter: NearbyShelter): string =>
  shelter.name ?? shelter.operator ?? 'Animal shelter';

const animalsLabel = (shelter: NearbyShelter): string | undefined =>
  shelter.animals?.map((a) => a.replaceAll('_', ' ')).join(', ');

export function renderShelterCard(shelter: NearbyShelter, index: number): HTMLLIElement {
  const animals = animalsLabel(shelter);
  return h(
    'li',
    {},
    h(
      'button',
      { type: 'button', class: 'shelter-card', 'data-id': shelter.id },
      h('span', { class: 'shelter-rank', 'aria-hidden': 'true' }, String(index + 1)),
      h(
        'span',
        { class: 'shelter-body' },
        h('span', { class: 'shelter-name' }, shelterName(shelter)),
        shelter.address && h('span', { class: 'shelter-meta' }, shelter.address),
        animals && h('span', { class: 'shelter-meta' }, `🐾 ${animals}`),
      ),
      h('span', { class: 'shelter-distance' }, formatDistance(shelter.distance)),
    ),
  );
}

export function renderShelterDetails(shelter: NearbyShelter): HTMLElement {
  const animals = animalsLabel(shelter);
  const osm = osmUrl(shelter.id);
  const row = (label: string, ...content: Child[]) =>
    h('div', { class: 'detail-row' }, h('dt', {}, label), h('dd', {}, ...content));

  return h(
    'article',
    { class: 'shelter-details' },
    h('h3', {}, shelterName(shelter)),
    h('p', { class: 'shelter-distance-line' }, `${formatDistance(shelter.distance)} away`),
    h(
      'dl',
      {},
      shelter.address && row('Address', shelter.address),
      animals && row('Animals', animals),
      shelter.openingHours && row('Opening hours', shelter.openingHours),
      shelter.phone && row('Phone', h('a', { href: `tel:${shelter.phone.replace(/[^\d+]/g, '')}` }, shelter.phone)),
      shelter.email && row('Email', h('a', { href: `mailto:${shelter.email}` }, shelter.email)),
      shelter.website && row('Website', externalLink(shelter.website, new URL(shelter.website).hostname)),
      shelter.operator && shelter.operator !== shelter.name && row('Operator', shelter.operator),
    ),
    h(
      'div',
      { class: 'detail-actions' },
      externalLink(directionsUrl(shelter), '🧭 Directions', 'button button-primary'),
      osm && externalLink(osm, 'View on OpenStreetMap', 'button button-ghost'),
    ),
  );
}

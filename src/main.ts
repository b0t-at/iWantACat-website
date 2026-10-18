import '@fontsource-variable/inter';
import './styles.css';
import { findShelters, loadDataset } from './data.ts';
import { formatDistance, type LatLon } from './geo.ts';
import { searchPlaces, type Place } from './geocode.ts';
import { LocationDeniedError, locateUser } from './location.ts';
import { ShelterMap } from './map.ts';
import { h, renderShelterCard } from './render.ts';
import { STORAGE_KEYS, storage } from './storage.ts';
import { initThemeToggle } from './theme.ts';

const byId = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const els = {
  themeToggle: byId<HTMLButtonElement>('theme-toggle'),
  searchForm: byId<HTMLFormElement>('search-form'),
  searchInput: byId<HTMLInputElement>('search-input'),
  locateButton: byId<HTMLButtonElement>('locate-button'),
  placeResults: byId<HTMLDivElement>('place-results'),
  status: byId<HTMLParagraphElement>('status'),
  list: byId<HTMLOListElement>('shelter-list'),
  dataNote: byId<HTMLParagraphElement>('data-note'),
  map: byId<HTMLDivElement>('map'),
};

const narrowScreen = window.matchMedia('(max-width: 900px)');

initThemeToggle(els.themeToggle);
const map = new ShelterMap(els.map, (id) => highlightCard(id, !narrowScreen.matches));
void loadDataset();

let activeRequest: AbortController | undefined;

/** Starts a new user action and cancels whatever was in flight before. */
function newRequest(): AbortSignal {
  activeRequest?.abort();
  activeRequest = new AbortController();
  return activeRequest.signal;
}

type StatusKind = 'info' | 'loading' | 'success' | 'error';

function setStatus(kind: StatusKind, message: string, action?: { label: string; run: () => void }): void {
  els.status.dataset.kind = kind;
  els.status.setAttribute('aria-busy', String(kind === 'loading'));
  const button = action && h('button', { type: 'button', class: 'button button-small' }, action.label);
  button?.addEventListener('click', action!.run);
  els.status.replaceChildren(
    ...[
      kind === 'loading' ? h('span', { class: 'spinner', 'aria-hidden': 'true' }) : null,
      h('span', {}, message),
      button,
    ].filter((node): node is HTMLElement => !!node),
  );
}

function clearResults(): void {
  els.list.replaceChildren();
  els.dataNote.hidden = true;
}

function highlightCard(id: string, scroll: boolean): void {
  for (const card of els.list.querySelectorAll<HTMLButtonElement>('.shelter-card')) {
    const active = card.dataset.id === id;
    card.classList.toggle('is-active', active);
    if (active) {
      card.setAttribute('aria-current', 'true');
      if (scroll) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      card.removeAttribute('aria-current');
    }
  }
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

async function showSheltersNear(origin: LatLon, label: string, signal: AbortSignal): Promise<void> {
  setStatus('loading', 'Looking for animal shelters nearby …');
  clearResults();
  try {
    const result = await findShelters(origin, signal);
    if (signal.aborted) return;
    map.showResults(origin, result.shelters, label);
    els.list.replaceChildren(...result.shelters.map(renderShelterCard));

    const nearest = result.shelters[0];
    if (!nearest) {
      setStatus('info', 'No animal shelters found in this area. Try searching for another place.');
      return;
    }
    setStatus('success', `Animal shelters near ${label} – the nearest is ${formatDistance(nearest.distance)} away.`);
    els.dataNote.textContent =
      result.source === 'dataset' && result.generated
        ? `Data from OpenStreetMap, updated ${dateFormat.format(new Date(result.generated))}.`
        : 'Live data from OpenStreetMap.';
    els.dataNote.hidden = false;
  } catch (error) {
    if (signal.aborted) return;
    console.error(error);
    setStatus('error', 'Animal shelters couldn’t be loaded right now. Please try again in a moment.', {
      label: 'Try again',
      run: () => void showSheltersNear(origin, label, newRequest()),
    });
  }
}

async function useMyLocation(): Promise<void> {
  const signal = newRequest();
  hidePlaceResults();
  setStatus('loading', 'Finding your location …');
  els.locateButton.disabled = true;
  try {
    const { position, approximate } = await locateUser(signal);
    if (signal.aborted) return;
    storage.set(STORAGE_KEYS.autoLocate, 'yes');
    await showSheltersNear(position, approximate ? 'your approximate location' : 'your location', signal);
  } catch (error) {
    if (signal.aborted) return;
    if (error instanceof LocationDeniedError) {
      storage.remove(STORAGE_KEYS.autoLocate);
      setStatus('error', 'Location access is blocked. Search for a city, address or postcode instead.');
    } else {
      console.error(error);
      setStatus('error', 'Your location couldn’t be determined. Search for a city, address or postcode instead.');
    }
  } finally {
    els.locateButton.disabled = false;
  }
}

const shortLabel = (place: Place): string => place.label.split(',').slice(0, 2).join(',').trim();

function hidePlaceResults(): void {
  els.placeResults.hidden = true;
  els.placeResults.replaceChildren();
}

function showPlaceAlternatives(places: Place[]): void {
  const buttons = places.map((place) => {
    const button = h('button', { type: 'button', class: 'chip', title: place.label }, shortLabel(place));
    button.addEventListener('click', () => void showSheltersNear(place, shortLabel(place), newRequest()));
    return button;
  });
  els.placeResults.replaceChildren(h('span', { class: 'place-results-label' }, 'Did you mean:'), ...buttons);
  els.placeResults.hidden = false;
}

els.searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const query = els.searchInput.value.trim();
  if (!query) return;
  const signal = newRequest();
  hidePlaceResults();
  setStatus('loading', `Searching for “${query}” …`);
  try {
    const [place, ...alternatives] = await searchPlaces(query, signal);
    if (!place) {
      clearResults();
      setStatus('info', `No place found for “${query}”. Try a city name or postcode.`);
      return;
    }
    if (alternatives.length) showPlaceAlternatives(alternatives);
    await showSheltersNear(place, shortLabel(place), signal);
  } catch (error) {
    if (signal.aborted) return;
    console.error(error);
    setStatus('error', 'Place search is unavailable right now. Please try again in a moment.');
  }
});

els.locateButton.addEventListener('click', () => void useMyLocation());

els.list.addEventListener('click', (event) => {
  const card = (event.target as Element).closest<HTMLButtonElement>('.shelter-card');
  const id = card?.dataset.id;
  if (!id) return;
  highlightCard(id, false);
  if (narrowScreen.matches) els.map.scrollIntoView({ behavior: 'smooth', block: 'center' });
  map.select(id);
});

narrowScreen.addEventListener('change', () => map.invalidateSize());

if (storage.get(STORAGE_KEYS.autoLocate) === 'yes') {
  void useMyLocation();
} else {
  setStatus('info', 'Search for a place or share your location to find animal shelters nearby.');
}

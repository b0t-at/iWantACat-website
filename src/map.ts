import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLon } from './geo.ts';
import { h, renderShelterDetails, shelterName } from './render.ts';
import type { NearbyShelter } from './shelters.ts';

const INITIAL_VIEW: [number, number] = [50, 10];
const INITIAL_ZOOM = 4;
/** How many of the nearest shelters the initial viewport should include. */
const FIT_COUNT = 3;

const shelterIcon = L.divIcon({
  className: 'shelter-marker',
  html: '<span class="shelter-pin"><span aria-hidden="true">🐾</span></span>',
  iconSize: [32, 32],
  iconAnchor: [16, 39],
  popupAnchor: [0, -34],
});

export class ShelterMap {
  private readonly map: L.Map;
  private readonly shelterLayer = L.featureGroup();
  private readonly originLayer = L.layerGroup();
  private readonly markers = new Map<string, L.Marker>();
  private readonly onSelect: (id: string) => void;

  constructor(element: HTMLElement, onSelect: (id: string) => void) {
    this.onSelect = onSelect;
    this.map = L.map(element, { zoomControl: true }).setView(INITIAL_VIEW, INITIAL_ZOOM);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
    this.originLayer.addTo(this.map);
    this.shelterLayer.addTo(this.map);
  }

  showResults(origin: LatLon, shelters: NearbyShelter[], originLabel: string): void {
    this.shelterLayer.clearLayers();
    this.originLayer.clearLayers();
    this.markers.clear();

    L.circleMarker([origin.lat, origin.lon], {
      radius: 9,
      color: '#fff',
      weight: 3,
      fillColor: '#1976d2',
      fillOpacity: 1,
    })
      // Leaflet treats string content as HTML; the label may come from external data.
      .bindTooltip(h('span', {}, originLabel))
      .addTo(this.originLayer);

    for (const shelter of shelters) {
      const marker = L.marker([shelter.lat, shelter.lon], {
        icon: shelterIcon,
        title: shelterName(shelter),
        alt: shelterName(shelter),
        riseOnHover: true,
      })
        .bindPopup(() => renderShelterDetails(shelter), { maxWidth: 320, minWidth: 220 })
        .on('click', () => this.onSelect(shelter.id));
      marker.addTo(this.shelterLayer);
      this.markers.set(shelter.id, marker);
    }

    const focus = L.latLngBounds([[origin.lat, origin.lon]]);
    for (const shelter of shelters.slice(0, FIT_COUNT)) focus.extend([shelter.lat, shelter.lon]);
    this.map.fitBounds(focus, { padding: [40, 40], maxZoom: 14 });
  }

  select(id: string): void {
    const marker = this.markers.get(id);
    if (!marker) return;
    this.map.setView(marker.getLatLng(), Math.max(this.map.getZoom(), 13));
    marker.openPopup();
  }

  invalidateSize(): void {
    this.map.invalidateSize();
  }
}

<template>
  <!-- This is only a very basic port of the original code. -->
  <div>
	<h1 style="text-align: center;">I want a cat!</h1>
	<div id="map" style="height: 100vh;"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
//import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
import $ from 'jquery';

const MAP_ID = 'map';
const IP_GEOLOCATION_URL = "https://ipapi.co/json/";
const OVERPASS_API_URL = "https://overpass-api.de/api/interpreter";
let map = ref(null);

onMounted(() => {
  findLocationFromIP().then(() => {
	if (navigator.geolocation) {
	  navigator.geolocation.getCurrentPosition(updateMap, handleGeolocationError);
	} else {
	  handleIPGeolocationError();
	}
  });
});

function findLocationFromIP() {
  return new Promise((resolve, reject) => {
	$.get(IP_GEOLOCATION_URL, (position) => {
	  initializeMap(position);
	  resolve();
	}).fail(() => {
	  handleIPGeolocationError();
	  resolve();
	});
  });
}

function handleIPGeolocationError() {
  console.error("Failed to retrieve location from IP address.");
  const defaultLocation = [48.5734053, 13.4503279]; // Fallback to Passau in Bayern
  initializeMap({ latitude: defaultLocation[0], longitude: defaultLocation[1] });
}

function updateMap(position) {
  let center = normalizeCoordinates(position);
  map.value.setView(center, 13);
  findAnimalShelters(center);
}

function handleGeolocationError(error) {
  console.error(error);
  findLocationFromIP();
}

function normalizeCoordinates(position) {
  let center;
  if (position.coords) {
	center = [position.coords.latitude, position.coords.longitude];
  } else {
	center = [position.latitude, position.longitude];
  }
  return center;
}

function initializeMap(position) {
  let center = normalizeCoordinates(position);
  map.value = L.map(MAP_ID).setView(center, 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
  }).addTo(map.value);

  L.Control.geocoder({
	defaultMarkGeocode: false,
	collapsed: false,
	placeholder: 'find the closest animal shelter',
  })
	.on('markgeocode', (e) => {
	  const center = e.geocode.center;
	  map.value.setView(center, 13);
	  findAnimalShelters(center);
	})
	.addTo(map.value);

  findAnimalShelters(center);
}

function findAnimalShelters(center) {
  const latitude = center.lat || center[0];
  const longitude = center.lng || center[1];
  const query = `[out:json][timeout:25];(node["amenity"="animal_shelter"](around:50000,${latitude},${longitude}););out body;`;

  $.get(OVERPASS_API_URL, { data: query }, handleOverpassResponse)
	.fail(handleOverpassError);
}

function handleOverpassResponse(data) {
  data.elements.forEach(element => {
	const name = element.tags.name || 'Unknown Animal Shelter';
	const info = Object.keys(element.tags)
	  .map(key => `<div><tt>${key}: ${linkify(element.tags[key])}</tt></div>`)
	  .join('\n');

	L.marker([element.lat, element.lon]).addTo(map.value)
	  .bindPopup(`<b>${name}</b><div>${info}</div>`)
	  .openPopup();
  });
}

function handleOverpassError() {
  console.error("Failed to retrieve data from the Overpass API.");
}

function linkify(text) {
  const urlPattern = /\b(?:https?:\/\/)?(?:(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,}|localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::\d+)?(?:\/\S*)?\b/gi;
  return text.replace(urlPattern, (url) => {
	return `<a href="${url.startsWith('http') ? url : `https://${url}`}" target="_blank">${url}</a>`;
  });
}
</script>

<style scoped>
#map {
  height: 100vh;
}
</style>
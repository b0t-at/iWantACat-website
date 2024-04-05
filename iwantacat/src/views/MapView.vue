<template>
  <div style="height: 600px; width: 600px">
    <l-map
      :maxBoundsViscosity="1.0"
      :worldCopyJump="true"
      style="width: 100%; height: 100%"
      ref="map"
      id="map"
      v-model="zoom"
      v-model:zoom="zoom"
      :center="center"
      :useGlobalLeaflet="false"
    >
      <l-tile-layer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"></l-tile-layer>
      <template v-for="marker in markerData" :key="marker.coordinates">
        <l-marker
          v-for="marker in markerData"
          :key="marker.coordinates"
          :lat-lng="marker.coordinates"
        >
          <l-popup> <span v-html="marker.popupMessage"></span></l-popup>
        </l-marker>
      </template>
    </l-map>
  </div>
</template>

<script setup lang="ts">
import { LMap, LTileLayer, LMarker, LPopup } from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'
import { ref } from 'vue'
import L from 'leaflet'

const zoom = ref(13)

type MarkerData = {
  coordinates: [number, number]
  popupMessage: string
}

// Define constants for the map and geolocation services
const MAP_ID = 'map'
const GEOLOCATION_SUPPORTED = navigator.geolocation ? true : false
const IP_GEOLOCATION_URL = 'https://ipapi.co/json/'
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter'

const markerData: MarkerData[] = ref([])

let map // Initialize the map variable
const defaultLocation = [48.5734053, 13.4503279] // Fallback to Passau in Bayern
const center = ref(defaultLocation) // Initialize the center variable

// Setup runs here
if (GEOLOCATION_SUPPORTED) {
  navigator.geolocation.getCurrentPosition(handleGeolocationSuccess, handleGeolocationError)
} else {
  setGeolocationFallback()
}

function findLocationFromIP() {
  fetch(IP_GEOLOCATION_URL)
    .then((response) => response.json())
    .then((position) => {
      initializeMap(position)
    })
    .catch(() => {
      setGeolocationFallback()
    })
}

function setGeolocationFallback() {
  console.error('Failed to retrieve location from IP address.')
  center.value = [defaultLocation[0], defaultLocation[1]]
}

function handleGeolocationSuccess(position) {
  center.value = normalizeCoordinates(position)
  findAnimalShelters(center.value)
}

function handleGeolocationError(error) {
  console.error(error)
  findLocationFromIP()
}

function normalizeCoordinates(position) {
  let calculatedCenter
  if (position.coords) {
    // Geolocation API
    calculatedCenter = [position.coords.latitude, position.coords.longitude]
  } else {
    // IP geolocation service
    calculatedCenter = [position.latitude, position.longitude]
  }
  return calculatedCenter
}

function linkify(text) {
  const urlPattern =
    /\b(?:https?:\/\/)?(?:(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,}|localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::\d+)?(?:\/\S*)?\b/gi
  return text.replace(urlPattern, function (url) {
    return `<a href="${url.startsWith('http') ? url : `https://${url}`}" target="_blank">${url}</a>`
  })
}

function initializeMap(position) {
  center.value = normalizeCoordinates(position)
  map = map(MAP_ID).setView(center.value, 13)
  findAnimalShelters(center.value)
}

function findAnimalShelters(center) {
  const latitude = center.lat || center[0]
  const longitude = center.lng || center[1]
  const query = `[out:json][timeout:25];(node["amenity"="animal_shelter"](around:50000,${latitude},${longitude}););out body;`

  fetch(OVERPASS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `data=${encodeURIComponent(query)}`
  })
    .then((response) => response.json())
    .then(handleOverpassResponse)
}

function handleOverpassResponse(data) {
  let markerDataToSet: MarkerData[] = []
  data.elements.forEach((element) => {
    const name = element.tags.name || 'Unknown Animal Shelter'
    const info = Object.keys(element.tags)
      .map((key) => `<div><tt>${key}: ${linkify(element.tags[key])}</tt></div>`)
      .join('\n')

    const message = `<b>${name}</b><div>${info}</div><button style="line-height:2; margin-top:10px;" onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${element.lat},${element.lon}', '_blank')"><img src="https://cdn-icons-png.flaticon.com/512/1483/1483336.png" alt="Navigation Logo" style="width: 20px; height: 20px;"> Route to ${name}</button>`

    const marker: MarkerData = {
      coordinates: [element.lat, element.lon],
      popupMessage: message
    }
    markerDataToSet.push(marker)
    console.log(marker)
  })
  markerData.value = markerDataToSet
}
</script>

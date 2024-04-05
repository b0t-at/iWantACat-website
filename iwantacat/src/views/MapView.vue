<template>
  <div style="height: 600px; width: 600px">
    <l-map :maxBoundsViscosity="1.0" :worldCopyJump="true" style="width: 100%; height: 100%" ref="map" v-model="zoom"
      v-model:zoom="zoom" :center="[47.41322, -1.219482]" @move="log('move')" :useGlobalLeaflet="false">
      <l-tile-layer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"></l-tile-layer>
    </l-map>
  </div>
</template>

<script setup lang="ts">
import {
  LMap,
  LTileLayer,
} from "@vue-leaflet/vue-leaflet";
import "leaflet/dist/leaflet.css";
import {  ref } from "vue";

const zoom = ref(2);

const log = (a) => {
  console.log(a);
};


</script>
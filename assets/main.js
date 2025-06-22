// main.js für iWantACat-website
// Alle bisherigen Skriptfunktionen aus index.html ausgelagert

// Define constants for the map and geolocation services
const MAP_ID = 'map';
const GEOLOCATION_SUPPORTED = navigator.geolocation ? true : false;
const IP_GEOLOCATION_URL = "https://get.geojs.io/v1/ip/geo.json";
const OVERPASS_API_URL = "https://overpass-api.de/api/interpreter";

// Initialize the map
let map;

let IPGeolocation;
let lastIPAddress;
let lastQueryUserLocation;

// Check for consent cookie
const consentCookie = getCookie('userConsent');
if (consentCookie === 'yes') {
    initializeMapWithConsent();
} else {
    // Show consent modal
    document.getElementById('consentModal').style.display = 'block';
}

document.getElementById('consentYes').addEventListener('click', function() {
    document.getElementById('consentModal').style.display = 'none';
    setCookie('userConsent', 'yes', 30);
    initializeMapWithConsent();
});

document.getElementById('consentNo').addEventListener('click', function() {
    document.getElementById('consentModal').style.display = 'none';
    window.location.href = 'error.html';
});

function showLoadingScreen() {
    let loading = document.getElementById('loadingScreen');
    if (!loading) {
        loading = document.createElement('div');
        loading.id = 'loadingScreen';
        loading.innerHTML = `<div class="loading-content"><div class="spinner"></div><div class="loading-text">Loading map and location ...</div></div>`;
        document.body.appendChild(loading);
    }
    loading.style.display = 'flex';
}

function hideLoadingScreen() {
    const loading = document.getElementById('loadingScreen');
    if (loading) loading.style.display = 'none';
}

function initializeMapWithConsent() {
    if (map) {
        removeMap(); // Remove the existing map instance
    }
    showLoadingScreen();
    navigator.geolocation.getCurrentPosition(function(position) {
        updateMapWithGeolocation(position);
        // hideLoadingScreen is now called only after map is initialized with real coordinates
    }, function(error) {
        handleGeolocationError(error);
        // hideLoadingScreen will be called after fallback
    });
}

function updateMapWithGeolocation(position) {
    console.log("Geolocation position:", position);
    let center = normalizeCoordinates(position);
    if (!map) {
        initializeMap(position);
        hideLoadingScreen(); // Only hide loading after map is initialized with actual coordinates
    } else {
        //map.setView(center, 13);
        console.log("Moving map to geolocation position");
        //map.panTo(center);
        findAnimalShelters(center);
        hideLoadingScreen(); // In case updateMapWithGeolocation is called after map is already initialized
    }
}

function findLocationFromIP(loadingScreen = true) {
    if (loadingScreen) {
        showLoadingScreen();
    }
    return new Promise((resolve, reject) => {
        $.get(IP_GEOLOCATION_URL, (position) => {
            initializeMap(position);
            hideLoadingScreen();
            resolve();
        }).fail(() => {
            handleIPGeolocationError();
            hideLoadingScreen();
            resolve();
        });
    });
}

function handleIPGeolocationError() {
    console.error("Failed to retrieve location from IP address.");
    const defaultLocation = [48.5734053, 13.4503279]; // Fallback to Passau
    initializeMap({ coords: { latitude: defaultLocation[0], longitude: defaultLocation[1] } });
    hideLoadingScreen();
}

function handleGeolocationError(error) {
    console.log("Handling geolocation error");
    console.log(error);
    findLocationFromIP();
}

function normalizeCoordinates(position) {
    let center;
    if (position.coords) {
        // Geolocation API
        center = [position.coords.latitude, position.coords.longitude];
        console.log("Using Geolocation API coordinates:", center);
    } else {
        // IP geolocation service
        center = [position.latitude, position.longitude];
        lastIPAddress = position.ip;
        IPGeolocation = center;
        console.log("Using IP API coordinates:", center);
    }
    return center;
}

function linkify(text) {
    const urlPattern = /\b(?:https?:\/\/)?(?:(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,}|localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::\d+)?(?:\/\S*)?\b/gi;
    return text.replace(urlPattern, function (url) {
        return `<a href="${url.startsWith('http') ? url : `https://${url}`}" target="_blank">${url}</a>`;
    });
}


function initializeMap(position) {
    if (map) {
        removeMap(); // Remove the existing map instance
    }
    let center = normalizeCoordinates(position);
    console.log("Initializing map with center:", center);
    map = L.map(MAP_ID).setView(center, 13);
    map.panTo(center);
    console.log("Moving map to initial position");

    // Add OpenStreetMap tile layer to the map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Create a geocoder control and add it to the map
    L.Control.geocoder({
        defaultMarkGeocode: false,
        collapsed: false,
        placeholder: 'find the closest animal shelter',
    })
        .on('markgeocode', function (e) {
            const center = e.geocode.center;
            map.setView(center, 13);
            findAnimalShelters(center);
        })
        .addTo(map);

    findAnimalShelters(center);
    hideLoadingScreen(); // Hide loading only after map is initialized with coordinates
}

function removeMap() {
    if (map) {
        map.remove();
        map = null;
    }
}

function findAnimalShelters(center) {
    const latitude = center.lat || center[0];
    const longitude = center.lng || center[1];
    const query = `[out:json][timeout:25];(node["amenity"="animal_shelter"]["animal_shelter"!="bird"]["animal_shelter:sanctuary"!="yes"](around:50000,${latitude},${longitude}););out body;`;
    lastQueryUserLocation = {lat: latitude, lon: longitude};
    $.get(OVERPASS_API_URL, { data: query }, handleOverpassResponse)
        .fail(handleOverpassError);
}

function handleOverpassResponse(data) {
    let sortedData =  data.elements.sort((a, b) => 
  haversineDistance(lastQueryUserLocation,  a) - haversineDistance(lastQueryUserLocation,  b)
);
    sortedData.forEach((element, index) => {
        const name = element.tags.name || 'Unknown Animal Shelter';
        const info = Object.keys(element.tags)
            .map(key => `<div><tt>${key}: ${linkify(element.tags[key])}</tt></div>`)
            .join('\n');

        const marker = L.marker([element.lat, element.lon]).addTo(map)
            .bindPopup(`<b>${name}</b><div>${info}</div><button class="route-button" onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${element.lat},${element.lon}', '_blank')"><img src="https://cdn-icons-png.flaticon.com/512/1483/1483336.png" alt="Navigation Logo" class="route-icon"> Route to ${name}</button>`);
            
        if (index === 0) {
            marker.openPopup(); // Open popup for the first marker
            map.panTo([element.lat, element.lon]);
            console.log("Moving map to: ",name, " at coordinates: ", element.lat, element.lon);
        }
    });
}

function handleOverpassError() {
    console.error("Failed to retrieve data from the Overpass API.");
}

function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Dark Mode Toggle
const darkModeKey = 'darkMode';
const darkModeToggle = document.getElementById('toggle-darkmode');
function setDarkMode(on) {
    if (on) {
        document.body.classList.add('dark-mode');
        localStorage.setItem(darkModeKey, 'on');
        darkModeToggle.textContent = '☀️ Light Mode';
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem(darkModeKey, 'off');
        darkModeToggle.textContent = '🌙 Dark Mode';
    }
}
darkModeToggle.addEventListener('click', function(e) {
    e.preventDefault();
    setDarkMode(!document.body.classList.contains('dark-mode'));
});
// Initial state
if (localStorage.getItem(darkModeKey) === 'on' || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    setDarkMode(true);
}

const atan2 = Math.atan2
const cos = Math.cos
const sin = Math.sin
const sqrt = Math.sqrt
const PI = Math.PI

// equatorial mean radius of Earth (in meters)
const R = 6378137

function squared (x) { return x * x }
function toRad (x) { return x * PI / 180.0 }
function hav (x) {
  return squared(sin(x / 2))
}

// https://www.npmjs.com/package/haversine-distance
// hav(theta) = hav(bLat - aLat) + cos(aLat) * cos(bLat) * hav(bLon - aLon)
function haversineDistance (a, b) {
  const aLat = toRad(Array.isArray(a) ? a[1] : a.latitude ?? a.lat)
  const bLat = toRad(Array.isArray(b) ? b[1] : b.latitude ?? b.lat)
  const aLng = toRad(Array.isArray(a) ? a[0] : a.longitude ?? a.lng ?? a.lon)
  const bLng = toRad(Array.isArray(b) ? b[0] : b.longitude ?? b.lng ?? b.lon)

  const ht = hav(bLat - aLat) + cos(aLat) * cos(bLat) * hav(bLng - aLng)
  return 2 * R * atan2(sqrt(ht), sqrt(1 - ht))
}

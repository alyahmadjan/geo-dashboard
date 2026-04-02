import { fetchCities, getCountryOptions } from './services/dataService.js';

const state = {
  allCities: [],
  filteredCities: [],
  map: null,
  markerLayer: null,
  heatLayer: null,
  selectedCityId: null,
};

function formatPopulation(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildAnalytics(city) {
  const offices = Math.max(1, Math.round(city.population / 2000000));
  const staff = Math.max(25, Math.round(city.population / 9000));
  const incidents = Math.max(1, Math.round(city.population / 1800000));
  const activityScore = clamp(Math.round((city.population / 15000000) * 100), 8, 100);

  return { offices, staff, incidents, activityScore };
}

function getFilters() {
  return {
    search: document.getElementById('searchInput').value.trim().toLowerCase(),
    country: document.getElementById('countrySelect').value,
    minPop: Number(document.getElementById('minPop').value || 0),
    maxPop: Number(document.getElementById('maxPop').value || Number.MAX_SAFE_INTEGER),
    heatmapOn: document.getElementById('heatmapToggle').checked,
  };
}

function filterCities(cities, filters) {
  return cities.filter((city) => {
    const matchesSearch = !filters.search || city.name.toLowerCase().includes(filters.search);
    const matchesCountry = filters.country === 'All countries' || city.country === filters.country;
    const matchesMin = city.population >= filters.minPop;
    const matchesMax = city.population <= filters.maxPop;
    return matchesSearch && matchesCountry && matchesMin && matchesMax;
  });
}

function renderCountrySelect(cities) {
  const select = document.getElementById('countrySelect');
  const options = getCountryOptions(cities);
  select.innerHTML = options.map((country) => `<option value="${country}">${country}</option>`).join('');
}

function renderSummary(cities) {
  const summary = document.getElementById('summaryStats');
  const totalPopulation = cities.reduce((sum, city) => sum + city.population, 0);
  summary.innerHTML = `
    <div><b>${cities.length}</b> cities visible</div>
    <div><b>${formatPopulation(totalPopulation)}</b> total population</div>
  `;
}

function renderCityList(cities) {
  const list = document.getElementById('cityList');
  list.innerHTML = '';

  if (!cities.length) {
    list.innerHTML = '<li class="city-item"><strong>No results</strong><span>Try adjusting the filters.</span></li>';
    return;
  }

  cities.forEach((city) => {
    const item = document.createElement('li');
    item.className = `city-item${state.selectedCityId === city.id ? ' active' : ''}`;
    item.innerHTML = `
      <strong>${city.name}</strong>
      <span>${city.country}</span>
      <small>Population: ${formatPopulation(city.population)}</small>
    `;
    item.addEventListener('click', () => selectCity(city));
    list.appendChild(item);
  });
}

function renderDetails(city) {
  const panel = document.getElementById('detailsPanel');
  if (!city) {
    panel.innerHTML = `
      <div class="details-empty">
        <h3>Select a city</h3>
        <p>Click a marker or a city in the list to view drill-down analytics.</p>
      </div>
    `;
    return;
  }

  const analytics = buildAnalytics(city);
  panel.innerHTML = `
    <div class="details-card">
      <h3>${city.name}</h3>
      <p>${city.country}</p>
      <div class="details-metrics">
        <div class="metric"><b>Population</b><span>${formatPopulation(city.population)}</span></div>
        <div class="metric"><b>Offices (estimate)</b><span>${formatNumber(analytics.offices)}</span></div>
        <div class="metric"><b>Staff (estimate)</b><span>${formatNumber(analytics.staff)}</span></div>
        <div class="metric"><b>Incidents (estimate)</b><span>${formatNumber(analytics.incidents)}</span></div>
        <div class="metric"><b>Activity score</b><span>${analytics.activityScore}/100</span></div>
      </div>
    </div>
  `;
}

function selectCity(city) {
  state.selectedCityId = city.id;
  renderCityList(state.filteredCities);
  renderDetails(city);
  state.map.flyTo([city.lat, city.lng], Math.max(state.map.getZoom(), 5), { duration: 0.6 });
}

function clearLayers() {
  if (state.markerLayer && typeof state.markerLayer.clearLayers === 'function') {
    state.markerLayer.clearLayers();
  }

  // leaflet.heat layers do not expose clearLayers(); reset points instead.
  if (state.heatLayer && typeof state.heatLayer.setLatLngs === 'function') {
    state.heatLayer.setLatLngs([]);
  }
}

function renderMap(cities) {
  clearLayers();

  const heatPoints = [];
  const bounds = [];

  cities.forEach((city) => {
    const latLng = [city.lat, city.lng];
    bounds.push(latLng);
    heatPoints.push([city.lat, city.lng, Math.max(0.2, city.population / 15000000)]);

    const analytics = buildAnalytics(city);
    const marker = L.circleMarker(latLng, {
      radius: clamp(city.population / 1000000, 6, 18),
      weight: 1,
      color: '#1d4ed8',
      fillColor: '#2563eb',
      fillOpacity: 0.75,
    });

    marker.bindPopup(`
      <div class="popup">
        <h3>${city.name}</h3>
        <p><strong>Country:</strong> ${city.country}</p>
        <p><strong>Population:</strong> ${formatPopulation(city.population)}</p>
        <p><strong>Activity score:</strong> ${analytics.activityScore}/100</p>
      </div>
    `);

    marker.on('click', () => selectCity(city));
    marker.addTo(state.markerLayer);
  });

  if (heatPoints.length) {
    state.heatLayer.setLatLngs(heatPoints);
    if (bounds.length) {
      state.map.fitBounds(bounds, { padding: [30, 30] });
    }
  }
}

function applyFilters() {
  const filters = getFilters();
  state.filteredCities = filterCities(state.allCities, filters);

  renderSummary(state.filteredCities);
  renderCityList(state.filteredCities);
  renderMap(state.filteredCities);

  if (!filters.heatmapOn) {
    state.map.removeLayer(state.heatLayer);
  } else if (!state.map.hasLayer(state.heatLayer)) {
    state.heatLayer.addTo(state.map);
  }

  if (state.selectedCityId) {
    const selected = state.filteredCities.find((city) => city.id === state.selectedCityId);
    if (!selected) {
      state.selectedCityId = null;
      renderDetails(null);
    }
  }
}

function bindControls() {
  ['searchInput', 'countrySelect', 'minPop', 'maxPop'].forEach((id) => {
    document.getElementById(id).addEventListener('input', applyFilters);
    document.getElementById(id).addEventListener('change', applyFilters);
  });

  document.getElementById('heatmapToggle').addEventListener('change', () => {
    if (document.getElementById('heatmapToggle').checked) {
      state.map.addLayer(state.heatLayer);
    } else {
      state.map.removeLayer(state.heatLayer);
    }
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('countrySelect').value = 'All countries';
    document.getElementById('minPop').value = '';
    document.getElementById('maxPop').value = '';
    document.getElementById('heatmapToggle').checked = true;
    state.selectedCityId = null;
    renderDetails(null);
    applyFilters();
  });
}

async function initMap() {
  state.allCities = await fetchCities();
  renderCountrySelect(state.allCities);
  bindControls();

  state.map = L.map('map', { zoomControl: true }).setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(state.map);

  state.markerLayer = L.layerGroup().addTo(state.map);
  state.heatLayer = L.heatLayer([], { radius: 28, blur: 18, maxZoom: 10 });
  state.heatLayer.addTo(state.map);

  state.filteredCities = [...state.allCities];
  renderSummary(state.filteredCities);
  renderCityList(state.filteredCities);
  renderDetails(null);
  applyFilters();
}

initMap().catch((error) => {
  console.error(error);
  document.getElementById('map').innerHTML = `
    <div class="error">
      <h2>Could not load map data</h2>
      <p>${error.message}</p>
    </div>
  `;
});

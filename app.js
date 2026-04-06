import { loadAllData } from './services/dataService.js';
import {
  buildCityMetrics,
  buildFilteredOverview,
  buildOfficeMetrics,
  buildOverview,
  filterCities,
  getOfficesForCity,
  summarizeKpisForDisplay,
  uniqueCountries,
} from './services/filterService.js';
import { createMapService } from './services/mapService.js';
import { createDetailsPanel } from './components/sidebar/detailsPanel.js';
import { createLayerControls } from './components/filters/layerControls.js';

const defaultFilters = {
  cityQuery: '',
  country: 'all',
};

const state = {
  data: null,
  layer: 'city',
  selectedCityId: null,
  selectedOfficeId: null,
  filters: { ...defaultFilters },
  mapService: null,
  detailsPanel: null,
  layerControls: null,
};

function getCityById(cityId) {
  return state.data?.cities.find((city) => city.id === cityId) || null;
}

function getOfficeById(officeId) {
  return state.data?.offices.find((office) => office.id === officeId) || null;
}

function clearSelection() {
  state.selectedCityId = null;
  state.selectedOfficeId = null;
}

function resetFilters() {
  state.filters = { ...defaultFilters };
}

function getVisibleCities() {
  return filterCities(state.data?.cities || [], state.filters);
}

function getVisibleOffices() {
  if (!state.data) return [];

  const country = String(state.filters.country || 'all');
  const baseOffices = state.data.offices || [];
  const selectedOffice = state.selectedOfficeId ? getOfficeById(state.selectedOfficeId) : null;
  const selectedCityId = state.selectedCityId || selectedOffice?.cityId || null;

  const filteredByCountry = baseOffices.filter((office) => {
    const city = getCityById(office.cityId);
    return country === 'all' || city?.country === country;
  });

  if (selectedCityId) {
    return filteredByCountry.filter((office) => office.cityId === selectedCityId);
  }

  return filteredByCountry;
}

function getVisibleKpis(visibleCities) {
  if (!state.data) return [];

  if (state.selectedOfficeId) {
    return buildOfficeMetrics(state.data, state.selectedOfficeId).kpis;
  }

  if (state.selectedCityId) {
    return buildCityMetrics(state.data, state.selectedCityId).kpis;
  }

  return buildFilteredOverview(state.data, visibleCities).kpis;
}

function renderView(options = {}) {
  if (!state.data || !state.mapService || !state.detailsPanel) {
    return;
  }

  const overview = buildOverview(state.data);
  const visibleCities = getVisibleCities();
  const visibleOffices = getVisibleOffices();
  const countries = uniqueCountries(state.data.cities);
  const visibleKpis = getVisibleKpis(visibleCities);
  const visibleKpisForDisplay = state.layer === 'city' ? summarizeKpisForDisplay(visibleKpis) : visibleKpis;

  if (state.layer === 'city') {
    if (state.selectedOfficeId) {
      const office = getOfficeById(state.selectedOfficeId);
      if (!office) {
        clearSelection();
        renderView(options);
        return;
      }

      const city = getCityById(office.cityId);
      if (!city) {
        clearSelection();
        renderView(options);
        return;
      }

      const metrics = buildOfficeMetrics(state.data, office.id);
      state.mapService.renderOffices(visibleOffices, {
        getCityById,
        onOfficeClick: handleOfficeClick,
      });
      state.mapService.openOfficePopup(office.id);
      state.detailsPanel.renderOffice({
        office,
        city,
        metrics,
        onBack: () => {
          state.selectedOfficeId = null;
          renderView();
        },
        backLabel: 'Back to city',
      });
      restoreSearchFocus(options);
      return;
    }

    if (state.selectedCityId) {
      const city = getCityById(state.selectedCityId);
      if (!city) {
        clearSelection();
        renderView(options);
        return;
      }

      const metrics = buildCityMetrics(state.data, city.id);
      state.mapService.renderOffices(metrics.offices, {
        getCityById,
        onOfficeClick: handleOfficeClick,
      });
      state.detailsPanel.renderCity({
        city,
        metrics,
        cities: state.data.cities,
        countries,
        filters: state.filters,
        visibleCities,
        visibleKpis: visibleKpisForDisplay,
        onCitySelect: handleCityClick,
        onOfficeClick: handleOfficeClick,
        onCityQueryChange: updateCityQuery,
        onCountryChange: updateCountryFilter,
      });
      restoreSearchFocus(options);
      return;
    }

    state.mapService.renderCities(visibleCities, {
      onCityClick: handleCityClick,
    });
    state.detailsPanel.renderOverview({
      overview: buildFilteredOverview(state.data, visibleCities),
      cities: state.data.cities,
      countries,
      filters: state.filters,
      visibleCities,
      visibleKpis: visibleKpisForDisplay,
      onCitySelect: handleCityClick,
      onCityQueryChange: updateCityQuery,
      onCountryChange: updateCountryFilter,
    });
    restoreSearchFocus(options);
    return;
  }

  if (state.selectedOfficeId) {
    const selectedOfficeVisible = visibleOffices.some((office) => office.id === state.selectedOfficeId);
    if (!selectedOfficeVisible) {
      state.selectedOfficeId = null;
    }
  }

  if (state.selectedOfficeId) {
    const office = getOfficeById(state.selectedOfficeId);
    if (!office) {
      state.selectedOfficeId = null;
      renderView(options);
      return;
    }

    const city = getCityById(office.cityId);
    const metrics = buildOfficeMetrics(state.data, office.id);
    state.mapService.renderOffices(visibleOffices, {
      getCityById,
      onOfficeClick: handleOfficeClick,
    });
    state.mapService.openOfficePopup(office.id);
    state.detailsPanel.renderOffice({
      office,
      city,
      metrics,
      onBack: state.selectedCityId
        ? () => {
            state.selectedOfficeId = null;
            renderView();
          }
        : () => {
            state.selectedOfficeId = null;
            renderView();
          },
      backLabel: state.selectedCityId ? 'Back to city' : 'Back to offices',
    });
    restoreSearchFocus(options);
    return;
  }

  if (state.selectedCityId) {
    const city = getCityById(state.selectedCityId);
    if (!city) {
      clearSelection();
      renderView(options);
      return;
    }

    const metrics = buildCityMetrics(state.data, city.id);
    state.mapService.renderOffices(metrics.offices, {
      getCityById,
      onOfficeClick: handleOfficeClick,
    });
    state.detailsPanel.renderCity({
      city,
      metrics,
      cities: state.data.cities,
      countries,
      filters: state.filters,
      visibleCities,
      visibleKpis: visibleKpisForDisplay,
      onCitySelect: handleCityClick,
      onOfficeClick: handleOfficeClick,
      onCityQueryChange: updateCityQuery,
      onCountryChange: updateCountryFilter,
    });
    restoreSearchFocus(options);
    return;
  }

  state.mapService.renderOffices(visibleOffices, {
    getCityById,
    onOfficeClick: handleOfficeClick,
  });

  const officeItems = visibleOffices.map((office) => ({
    office,
    city: getCityById(office.cityId),
    metrics: buildOfficeMetrics(state.data, office.id),
  }));

  state.detailsPanel.renderOfficeDirectory({
    overview: buildFilteredOverview(state.data, visibleCities),
    cities: state.data.cities,
    countries,
    filters: state.filters,
    visibleCities,
    offices: officeItems,
    selectedCityId: state.selectedCityId,
    selectedOfficeId: state.selectedOfficeId,
    onCitySelect: handleCityClick,
    onCityQueryChange: updateCityQuery,
    onCountryChange: updateCountryFilter,
    onOfficeClick: handleOfficeClick,
  });
}

function restoreSearchFocus(options = {}) {
  if (!options.preserveCitySearch) {
    return;
  }

  const input = document.getElementById('citySearch');
  if (!input) {
    return;
  }

  const { selectionStart, selectionEnd, value } = options.preserveCitySearch;
  requestAnimationFrame(() => {
    const nextInput = document.getElementById('citySearch');
    if (!nextInput) return;
    nextInput.focus({ preventScroll: true });
    const cursor = Math.min(selectionEnd ?? value.length, nextInput.value.length);
    const start = Math.min(selectionStart ?? cursor, nextInput.value.length);
    nextInput.setSelectionRange(start, cursor);
  });
}

function handleCityClick(city) {
  state.selectedOfficeId = null;
  state.selectedCityId = city.id;

  if (state.layer === 'office') {
    renderView();
    return;
  }

  state.layer = 'city';
  state.layerControls?.setActive('city');
  renderView();
}

function handleOfficeClick(office) {
  state.selectedOfficeId = office.id;
  if (!state.selectedCityId) {
    state.selectedCityId = office.cityId;
  }

  if (state.layer === 'office') {
    state.selectedCityId = office.cityId;
    renderView();
    return;
  }

  renderView();
}

function switchLayer(layer) {
  state.layer = layer;
  clearSelection();

  if (state.layerControls) {
    state.layerControls.setActive(layer);
  }

  renderView();
}

function resetDashboard() {
  state.layer = 'city';
  clearSelection();
  resetFilters();
  state.layerControls?.setActive('city');
  renderView();
}

function updateCityQuery(value) {
  const active = document.activeElement;
  const preserveCitySearch = active?.id === 'citySearch'
    ? {
        value: active.value,
        selectionStart: active.selectionStart,
        selectionEnd: active.selectionEnd,
      }
    : null;

  state.filters.cityQuery = value;

  if (!String(value || '').trim()) {
    if (state.layer === 'city' || state.layer === 'office') {
      clearSelection();
    }
  }

  const visibleCities = getVisibleCities();
  const visibleOffices = getVisibleOffices();

  if (state.selectedCityId) {
    const selectedStillVisible = visibleCities.some((city) => city.id === state.selectedCityId);
    if (!selectedStillVisible) {
      state.selectedCityId = null;
    }
  }

  if (state.selectedOfficeId) {
    const selectedOfficeStillVisible = visibleOffices.some((office) => office.id === state.selectedOfficeId);
    if (!selectedOfficeStillVisible) {
      state.selectedOfficeId = null;
    }
  }

  renderView({ preserveCitySearch });
}

function updateCountryFilter(value) {
  state.filters.country = value || 'all';

  if (state.layer === 'city') {
    clearSelection();
  } else {
    // In office layer, changing country should reset any drill-down so the map
    // and sidebar can show all offices for the chosen country.
    clearSelection();
  }

  renderView();
}

async function init() {
  state.data = await loadAllData();

  const settings = state.data.settings || {};
  state.layer = settings.defaultLayer || 'city';

  state.mapService = createMapService('map', settings);
  state.detailsPanel = createDetailsPanel(document.getElementById('detailsPanel'));
  state.layerControls = createLayerControls(document.getElementById('layerControls'), {
    defaultLayer: settings.defaultLayer || 'city',
    onLayerChange: switchLayer,
    onReset: resetDashboard,
  });

  renderView();
}

init().catch((error) => {
  console.error(error);
  document.getElementById('detailsPanel').innerHTML = `
    <div class="panel-head">
      <p class="eyebrow">Error</p>
      <h2>Could not load the dashboard</h2>
      <p class="muted">${error.message}</p>
    </div>
  `;
  document.getElementById('map').innerHTML = '<div class="error-state">Failed to load map data.</div>';
});

import { loadAllData } from './services/dataService.js';
import {
  buildBeeHubMetrics,
  buildBeeHubOverview,
  buildCityMetrics,
  buildSalesLayerContext,
  buildSubjectLayerContext,
  buildFilteredOverview,
  buildOfficeMetrics,
  buildOverview,
  buildSubjectOverviewForScope,
  buildSubjectTimelineForScope,
  filterCities,
  formatMonthLabel,
  getBeeHubsForScope,
  getScopeContext,
  getSubjectHeatPointsForScope,
  getSubjectPeriods,
  getSubjectsForScope,
  summarizeKpisForDisplay,
  uniqueCountries,
  uniqueCountriesFromBeeHubs,
  uniqueRegions,
} from './services/filterService.js';
import { createMapService } from './services/mapService.js';
import { createDetailsPanel } from './components/sidebar/detailsPanel.js';
import { createLayerControls } from './components/filters/layerControls.js';

const defaultFilters = {
  cityQuery: '',
  country: 'all',
  beeHubRegion: 'all',
  salesCountry: 'all',
  salesCityQuery: '',
  salesCityId: 'all',
  salesOfficeId: 'all',
  salesBeeHubId: 'all',
  subjectPeriod: 'all',
  subjectCountry: 'all',
  subjectCityQuery: '',
  subjectCityId: 'all',
  subjectOfficeId: 'all',
  subjectBeeHubId: 'all',
  beeHubOfficeId: 'all',
};

const state = {
  data: null,
  layer: 'city',
  selectedCityId: null,
  selectedOfficeId: null,
  selectedBeeHubId: null,
  filters: { ...defaultFilters },
  mapService: null,
  detailsPanel: null,
  layerControls: null,
  salesCityRenderTimer: null,
  salesDetailMode: null,
  salesDetailReturnTo: null,
  subjectDetailMode: null,
  subjectDetailReturnTo: null,
  subjectCityRenderTimer: null,
};

function getDefaultFilters(data) {
  const subjectPeriods = getSubjectPeriods(data?.subjects || []);
  return {
    ...defaultFilters,
    subjectPeriod: 'all',
  };
}

function getCityById(cityId) {
  return state.data?.cities.find((city) => city.id === cityId) || null;
}

function getOfficeById(officeId) {
  return state.data?.offices.find((office) => office.id === officeId) || null;
}

function getBeeHubById(beeHubId) {
  return state.data?.beeHubs.find((beeHub) => beeHub.id === beeHubId) || null;
}

function clearSelection() {
  state.selectedCityId = null;
  state.selectedOfficeId = null;
  state.selectedBeeHubId = null;
}

function cancelSalesCityRenderTimer() {
  if (state.salesCityRenderTimer) {
    clearTimeout(state.salesCityRenderTimer);
    state.salesCityRenderTimer = null;
  }
}

function resetFilters() {
  state.filters = getDefaultFilters(state.data);
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

function getCurrentScope() {
  if (!state.data) {
    return getScopeContext({ cities: [], offices: [] }, null, null);
  }

  return getScopeContext(state.data, state.selectedCityId, state.selectedOfficeId);
}

function getVisibleBeeHubs(scope) {
  if (!state.data) return [];

  const beeHubsInScope = getBeeHubsForScope(state.data, scope, 'all');
  const visibleCityIds = new Set(getVisibleCities().map((city) => city.id));

  return beeHubsInScope.filter((beeHub) => visibleCityIds.has(beeHub.resolvedCity?.id || beeHub.cityId));
}

function getVisibleSalesContext() {
  if (!state.data) {
    return {
      heatPoints: [],
      overview: { records: 0, cities: 0, offices: 0, regions: 0, deals: 0, salesTotal: 0, heatPoints: 0 },
      regionSummary: [],
      citySummary: [],
      officeSummary: [],
      countries: [],
      cities: [],
      offices: [],
    };
  }

  return buildSalesLayerContext(state.data, state.filters);
}

function getVisibleSubjectContext(scope) {
  if (!state.data) {
    return {
      heatPoints: [],
      overview: { records: 0, regions: 0, heatPoints: 0, latestPeriod: '—', summary: {} },
      timeline: [],
      periods: [],
    };
  }

  const period = state.filters.subjectPeriod || 'all';
  const subjects = getSubjectsForScope(state.data, scope, 'all');
  const heatPoints = getSubjectHeatPointsForScope(state.data, scope, period);
  const overview = buildSubjectOverviewForScope(state.data, scope, period);
  const timeline = buildSubjectTimelineForScope(state.data, scope);
  const periods = getSubjectPeriods(subjects).map((item) => ({ value: item, label: formatMonthLabel(item) }));

  return { heatPoints, overview, timeline, periods };
}

function restoreSearchFocus(options = {}) {
  const search = options.preserveSearch;
  if (!search) {
    return;
  }

  const inputId = search.inputId || 'citySearch';
  const input = document.getElementById(inputId);
  if (!input) {
    return;
  }

  const { selectionStart, selectionEnd, value } = search;
  requestAnimationFrame(() => {
    const nextInput = document.getElementById(inputId);
    if (!nextInput) return;
    nextInput.focus({ preventScroll: true });
    const cursor = Math.min(selectionEnd ?? value.length, nextInput.value.length);
    const start = Math.min(selectionStart ?? cursor, nextInput.value.length);
    nextInput.setSelectionRange(start, cursor);
  });
}

function renderView(options = {}) {
  if (!state.data || !state.mapService || !state.detailsPanel) {
    return;
  }

  const scope = getCurrentScope();
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

  if (state.layer === 'office') {
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
    return;
  }

  if (state.layer === 'beeHub') {
    const beeHubs = getVisibleBeeHubs(scope);
    const globalScope = getScopeContext(state.data, null, null);
    const allBeeHubs = getVisibleBeeHubs(globalScope);
    const beeHubCountries = uniqueCountriesFromBeeHubs(state.data);
    const selectedBeeHub = state.selectedBeeHubId ? beeHubs.find((item) => item.id === state.selectedBeeHubId) || getBeeHubById(state.selectedBeeHubId) : null;

    if (state.selectedBeeHubId && !beeHubs.some((item) => item.id === state.selectedBeeHubId)) {
      state.selectedBeeHubId = null;
      renderView(options);
      return;
    }

    // If a beeHub is selected, show its details
    if (state.selectedBeeHubId && selectedBeeHub) {
      const beeHubCity = selectedBeeHub.resolvedCity || getCityById(selectedBeeHub.cityId);
      const metrics = buildBeeHubMetrics(state.data, selectedBeeHub.id);

      state.mapService.renderBeeHubs(beeHubs, {
        onBeeHubClick: handleBeeHubClick,
      });
      state.mapService.openBeeHubPopup(selectedBeeHub.id);

      state.detailsPanel.renderBeeHub({
        beeHub: selectedBeeHub,
        city: beeHubCity,
        metrics,
        beeHubs,
        onBack: () => {
          state.selectedBeeHubId = null;
          state.selectedCityId = null;
          state.filters.cityQuery = '';
          renderView();
        },
        onBeeHubClick: handleBeeHubClick,
      });
      restoreSearchFocus(options);
      return;
    }

    const overview = {
      beeHubCount: beeHubs.length,
      cityCount: new Set(beeHubs.map((item) => item.resolvedCity?.id || item.cityId).filter(Boolean)).size,
      officeCount: new Set(beeHubs.map((item) => item.resolvedOfficeId).filter(Boolean)).size,
      ownedOfficeCount: new Set(beeHubs.map((item) => item.resolvedOfficeId).filter(Boolean)).size,
    };

    state.mapService.renderBeeHubs(beeHubs, {
      onBeeHubClick: handleBeeHubClick,
    });

    state.detailsPanel.renderBeeHubLayer({
      beeHubs,
      allBeeHubs,
      cities: state.data.cities,
      countries: beeHubCountries,
      filters: state.filters,
      visibleCities,
      selectedCityId: state.selectedCityId,
      selectedBeeHubId: state.selectedBeeHubId,
      overview,
      offices: getVisibleOffices(),
      onCitySelect: handleCityClick,
      onCityQueryChange: updateCityQuery,
      onCountryChange: updateCountryFilter,
      onBeeHubClick: handleBeeHubClick,
      onOfficeChange: updateBeeHubOffice,
    });
    restoreSearchFocus(options);
    return;
  }

  if (state.layer === 'sales') {
    const salesContext = buildSalesLayerContext(state.data, state.filters);
    if (state.salesDetailMode !== 'city') {
      salesContext.selectedCityDetails = null;
    }
    if (state.salesDetailMode !== 'office') {
      salesContext.selectedOfficeDetails = null;
    }

    state.mapService.renderSalesHeatmap(salesContext.heatPoints);

    state.detailsPanel.renderSalesLayer({
      ...salesContext,
      onCountryChange: updateSalesCountry,
      onCityQueryChange: updateSalesCityQuery,
      onCitySelect: handleSalesCitySelect,
      onOfficeChange: updateSalesOffice,
      onOfficeSelect: handleSalesOfficeSelect,
      onBeeHubChange: updateSalesBeeHub,
      onBackToSales: state.salesDetailReturnTo === 'city' ? backToCityFromOfficeDetail : backToSalesFromOfficeDetail,
      backButtonLabel: state.salesDetailReturnTo === 'city' ? 'Back to City' : 'Back to Sales',
    });
    return;
  }

  if (state.layer === 'subject') {
    const subjectContext = buildSubjectLayerContext(state.data, state.filters);
    if (state.subjectDetailMode !== 'city') {
      subjectContext.selectedCityDetails = null;
    }
    if (state.subjectDetailMode !== 'office') {
      subjectContext.selectedOfficeDetails = null;
    }

    state.mapService.renderSubjectHeatmap(subjectContext.heatPoints);

    state.detailsPanel.renderSubjectLayer({
      ...subjectContext,
      onCountryChange: updateSubjectCountry,
      onCityQueryChange: updateSubjectCityQuery,
      onCitySelect: handleSubjectCitySelect,
      onOfficeChange: updateSubjectOffice,
      onOfficeSelect: handleSubjectOfficeSelect,
      onBeeHubChange: updateSubjectBeeHub,
      onBackToSubjects: state.subjectDetailReturnTo === 'city' ? backToCityFromSubjectOfficeDetail : backToSubjectsFromOfficeDetail,
      backButtonLabel: state.subjectDetailReturnTo === 'city' ? 'Back to City' : 'Back to Subjects',
    });
    return;
  }

  state.mapService.renderCities(visibleCities, {
    onCityClick: handleCityClick,
  });
  state.detailsPanel.renderMessage('Unknown layer', 'The selected layer is not recognized.');
}

function handleCityClick(city) {
  state.selectedOfficeId = null;
  state.selectedBeeHubId = null;
  state.selectedCityId = city.id;

  if (state.layer === 'office' || state.layer === 'beeHub') {
    renderView();
    return;
  }

  state.layer = 'city';
  state.layerControls?.setActive('city');
  renderView();
}

function handleOfficeClick(office) {
  state.selectedOfficeId = office.id;
  state.selectedBeeHubId = null;
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

function handleBeeHubClick(beeHub) {
  state.selectedCityId = beeHub.cityId || state.selectedCityId;
  state.selectedOfficeId = null;
  state.selectedBeeHubId = beeHub.id;

  if (state.layer !== 'beeHub') {
    state.layer = 'beeHub';
    state.layerControls?.setActive('beeHub');
  }

  renderView();
}

function switchLayer(layer) {
  state.layer = layer;
  cancelSalesCityRenderTimer();
  state.salesDetailMode = null;
  if (state.subjectCityRenderTimer) {
    clearTimeout(state.subjectCityRenderTimer);
    state.subjectCityRenderTimer = null;
  }
  state.subjectDetailMode = null;
  clearSelection();
  state.filters = getDefaultFilters(state.data);

  if (state.layerControls) {
    state.layerControls.setActive(layer);
  }

  renderView();
}

function resetDashboard() {
  state.layer = 'city';
  cancelSalesCityRenderTimer();
  state.salesDetailMode = null;
  if (state.subjectCityRenderTimer) {
    clearTimeout(state.subjectCityRenderTimer);
    state.subjectCityRenderTimer = null;
  }
  state.subjectDetailMode = null;
  clearSelection();
  resetFilters();
  state.layerControls?.setActive('city');
  renderView();
}

function updateCityQuery(value) {
  const active = document.activeElement;
  const preserveSearch = active?.id === 'citySearch'
    ? {
        inputId: 'citySearch',
        value: active.value,
        selectionStart: active.selectionStart,
        selectionEnd: active.selectionEnd,
      }
    : null;

  state.filters.cityQuery = value;

  if (!String(value || '').trim()) {
    if (state.layer === 'city' || state.layer === 'office' || state.layer === 'beeHub') {
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

  renderView({ preserveSearch });
}

function updateCountryFilter(value) {
  state.filters.country = value || 'all';
  clearSelection();
  renderView();
}

function updateBeeHubRegion(value) {
  state.filters.beeHubRegion = value || 'all';
  renderView();
}

function updateBeeHubOffice(value) {
  state.filters.beeHubOfficeId = value || 'all';
  renderView();
}

function clearSalesSelection() {
  cancelSalesCityRenderTimer();
  state.salesDetailMode = null;
  state.salesDetailReturnTo = null;
  clearSelection();
  state.filters.salesCountry = 'all';
  state.filters.salesCityId = 'all';
  state.filters.salesOfficeId = 'all';
  state.filters.salesBeeHubId = 'all';
  state.filters.salesCityQuery = '';
  renderView();
}

function backToSalesFromOfficeDetail() {
  clearSalesSelection();
}

function backToCityFromOfficeDetail() {
  cancelSalesCityRenderTimer();
  state.salesDetailMode = 'city';
  state.salesDetailReturnTo = 'sales';
  state.filters.salesOfficeId = 'all';
  state.filters.salesBeeHubId = 'all';
  state.filters.salesCityQuery = '';
  renderView();
}

function handleSalesCitySelect(city) {
  cancelSalesCityRenderTimer();
  state.salesDetailMode = 'city';
  state.salesDetailReturnTo = 'sales';
  state.filters.salesCountry = city.country || 'all';
  state.filters.salesCityId = city.id;
  state.filters.salesCityQuery = '';
  state.filters.salesOfficeId = 'all';
  state.filters.salesBeeHubId = 'all';
  renderView();
}

function handleSalesOfficeSelect(officeOrId, returnTo = 'sales') {
  cancelSalesCityRenderTimer();
  const office = typeof officeOrId === 'string' ? getOfficeById(officeOrId) : officeOrId;
  if (!office) return;

  state.salesDetailMode = 'office';
  state.salesDetailReturnTo = returnTo === 'city' ? 'city' : 'sales';
  state.filters.salesOfficeId = office.id;
  state.filters.salesBeeHubId = 'all';
  state.filters.salesCityQuery = '';
  renderView();
}

function updateSalesCountry(value) {
  cancelSalesCityRenderTimer();
  state.salesDetailMode = null;
  state.salesDetailReturnTo = null;
  state.filters.salesCountry = value || 'all';
  state.filters.salesCityId = 'all';
  state.filters.salesOfficeId = 'all';
  state.filters.salesBeeHubId = 'all';
  state.filters.salesCityQuery = '';
  renderView();
}

function updateSalesCityQuery(value) {
  const active = document.activeElement;
  const preserveSearch = active?.id === 'salesCitySearch'
    ? {
        inputId: 'salesCitySearch',
        value: active.value,
        selectionStart: active.selectionStart,
        selectionEnd: active.selectionEnd,
      }
    : null;

  cancelSalesCityRenderTimer();
  state.salesDetailMode = null;
  state.salesDetailReturnTo = null;
  state.filters.salesCityQuery = String(value || '');
  state.filters.salesCityId = 'all';
  state.filters.salesOfficeId = 'all';
  state.filters.salesBeeHubId = 'all';

  state.salesCityRenderTimer = setTimeout(() => {
    state.salesCityRenderTimer = null;
    renderView({ preserveSearch });
  }, 120);
}

function updateSalesOffice(value) {
  cancelSalesCityRenderTimer();
  state.salesDetailMode = null;
  state.salesDetailReturnTo = null;
  state.filters.salesOfficeId = value || 'all';
  state.filters.salesBeeHubId = 'all';
  state.filters.salesCityQuery = '';
  renderView();
}

function updateSalesBeeHub(value) {
  cancelSalesCityRenderTimer();
  state.salesDetailMode = null;
  state.salesDetailReturnTo = null;
  state.filters.salesBeeHubId = value || 'all';
  state.filters.salesCityQuery = '';
  renderView();
}

function updateSubjectPeriod(value) {
  state.filters.subjectPeriod = value || 'all';
  renderView();
}

function clearSubjectSelection() {
  if (state.subjectCityRenderTimer) {
    clearTimeout(state.subjectCityRenderTimer);
    state.subjectCityRenderTimer = null;
  }
  state.subjectDetailMode = null;
  state.subjectDetailReturnTo = null;
  clearSelection();
  state.filters.subjectCountry = 'all';
  state.filters.subjectCityId = 'all';
  state.filters.subjectOfficeId = 'all';
  state.filters.subjectBeeHubId = 'all';
  state.filters.subjectCityQuery = '';
  renderView();
}

function backToSubjectsFromOfficeDetail() {
  clearSubjectSelection();
}

function backToCityFromSubjectOfficeDetail() {
  if (state.subjectCityRenderTimer) {
    clearTimeout(state.subjectCityRenderTimer);
    state.subjectCityRenderTimer = null;
  }
  state.subjectDetailMode = 'city';
  state.subjectDetailReturnTo = 'subjects';
  state.filters.subjectOfficeId = 'all';
  state.filters.subjectBeeHubId = 'all';
  state.filters.subjectCityQuery = '';
  renderView();
}

function handleSubjectCitySelect(city) {
  if (state.subjectCityRenderTimer) {
    clearTimeout(state.subjectCityRenderTimer);
    state.subjectCityRenderTimer = null;
  }
  state.subjectDetailMode = 'city';
  state.subjectDetailReturnTo = 'subjects';
  state.filters.subjectCountry = city.country || 'all';
  state.filters.subjectCityId = city.id;
  state.filters.subjectCityQuery = '';
  state.filters.subjectOfficeId = 'all';
  state.filters.subjectBeeHubId = 'all';
  renderView();
}

function handleSubjectOfficeSelect(officeOrId, returnTo = 'subjects') {
  if (state.subjectCityRenderTimer) {
    clearTimeout(state.subjectCityRenderTimer);
    state.subjectCityRenderTimer = null;
  }
  const office = typeof officeOrId === 'string' ? getOfficeById(officeOrId) : officeOrId;
  if (!office) return;

  state.subjectDetailMode = 'office';
  state.subjectDetailReturnTo = returnTo === 'city' ? 'city' : 'subjects';
  state.filters.subjectOfficeId = office.id;
  state.filters.subjectBeeHubId = 'all';
  state.filters.subjectCityQuery = '';
  renderView();
}

function updateSubjectCountry(value) {
  if (state.subjectCityRenderTimer) {
    clearTimeout(state.subjectCityRenderTimer);
    state.subjectCityRenderTimer = null;
  }
  state.subjectDetailMode = null;
  state.subjectDetailReturnTo = null;
  state.filters.subjectCountry = value || 'all';
  state.filters.subjectCityId = 'all';
  state.filters.subjectOfficeId = 'all';
  state.filters.subjectBeeHubId = 'all';
  state.filters.subjectCityQuery = '';
  renderView();
}

function updateSubjectCityQuery(value) {
  const active = document.activeElement;
  const preserveSearch = active?.id === 'subjectCitySearch'
    ? {
        inputId: 'subjectCitySearch',
        value: active.value,
        selectionStart: active.selectionStart,
        selectionEnd: active.selectionEnd,
      }
    : null;

  if (state.subjectCityRenderTimer) {
    clearTimeout(state.subjectCityRenderTimer);
    state.subjectCityRenderTimer = null;
  }
  state.subjectDetailMode = null;
  state.subjectDetailReturnTo = null;
  state.filters.subjectCityQuery = String(value || '');
  state.filters.subjectCityId = 'all';
  state.filters.subjectOfficeId = 'all';
  state.filters.subjectBeeHubId = 'all';

  state.subjectCityRenderTimer = setTimeout(() => {
    state.subjectCityRenderTimer = null;
    renderView({ preserveSearch });
  }, 120);
}

function updateSubjectOffice(value) {
  if (state.subjectCityRenderTimer) {
    clearTimeout(state.subjectCityRenderTimer);
    state.subjectCityRenderTimer = null;
  }
  state.subjectDetailMode = null;
  state.subjectDetailReturnTo = null;
  state.filters.subjectOfficeId = value || 'all';
  state.filters.subjectBeeHubId = 'all';
  state.filters.subjectCityQuery = '';
  renderView();
}

function updateSubjectBeeHub(value) {
  if (state.subjectCityRenderTimer) {
    clearTimeout(state.subjectCityRenderTimer);
    state.subjectCityRenderTimer = null;
  }
  state.subjectDetailMode = null;
  state.subjectDetailReturnTo = null;
  state.filters.subjectBeeHubId = value || 'all';
  state.filters.subjectCityQuery = '';
  renderView();
}

async function init() {
  state.data = await loadAllData();
  state.filters = getDefaultFilters(state.data);

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

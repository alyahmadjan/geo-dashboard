import { loadAllData } from './services/dataService.js';
import {
  buildCityMetrics,
  buildOfficeMetrics,
  buildOverview,
  buildSalesLayerContext,
  buildSubjectLayerContext,
  filterCities,
  getBeeHubsForScope,
  getScopeContext,
} from './services/filterService.js';
import { createMapService } from './services/mapService.js';
import { createDetailsPanel } from './components/sidebar/detailsPanel.js';

const defaultFilters = {
  cityQuery: '',
  country: 'all',
};

const defaultOverlays = {
  city: {
    offices: false,
    beeHubs: false,
    sales: false,
    subjects: false,
  },
  office: {
    offices: true,
    beeHubs: false,
    sales: false,
    subjects: false,
  },
};

const overlayDefinitions = {
  city: [
    { key: 'offices', label: 'Offices', color: 'var(--office)' },
    { key: 'beeHubs', label: 'beeHub', color: 'var(--beehub)' },
    { key: 'sales', label: 'Sales', color: 'var(--sales)' },
    { key: 'subjects', label: 'Subjects', color: 'var(--subject)' },
  ],
  office: [
    { key: 'offices', label: 'Offices', color: 'var(--office)' },
    { key: 'beeHubs', label: 'beeHub', color: 'var(--beehub)' },
    { key: 'sales', label: 'Sales', color: 'var(--sales)' },
    { key: 'subjects', label: 'Subjects', color: 'var(--subject)' },
  ],
};

const state = {
  data: null,
  view: 'city',
  selectedCityId: null,
  selectedOfficeId: null,
  selectedBeeHubId: null,
  preserveMapExtent: false,
  selectionZoomMode: 'city',
  filters: { ...defaultFilters },
  overlays: structuredClone(defaultOverlays),
  mapService: null,
  detailsPanel: null,
};

function restoreFocusedInput(focusSnapshot) {
  if (!focusSnapshot?.id) return;
  const element = document.getElementById(focusSnapshot.id);
  if (!element || typeof element.focus !== 'function') return;

  element.focus({ preventScroll: true });

  if (typeof focusSnapshot.selectionStart === 'number' && typeof focusSnapshot.selectionEnd === 'number' && 'setSelectionRange' in element) {
    try {
      element.setSelectionRange(focusSnapshot.selectionStart, focusSnapshot.selectionEnd);
    } catch {
      // Some input types do not support selection restoration.
    }
  }
}

function snapshotFocusedInput() {
  const active = document.activeElement;
  if (!active || !active.id) return null;
  if (active.id !== 'citySearch') return null;

  return {
    id: active.id,
    selectionStart: typeof active.selectionStart === 'number' ? active.selectionStart : null,
    selectionEnd: typeof active.selectionEnd === 'number' ? active.selectionEnd : null,
  };
}

function getDefaultFilters() {
  return { ...defaultFilters };
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

function getVisibleCities() {
  return filterCities(state.data?.cities || [], state.filters);
}

function getVisibleOffices() {
  if (!state.data) return [];

  const visibleCities = getVisibleCities();
  const visibleCityIds = new Set(visibleCities.map((city) => city.id));
  const scopedByCity = state.selectedCityId ? new Set([state.selectedCityId]) : visibleCityIds;

  return (state.data.offices || []).filter((office) => scopedByCity.has(office.cityId));
}

function getCityScope() {
  return getScopeContext(state.data, state.selectedCityId, null);
}

function getOfficeScope() {
  return getScopeContext(state.data, state.selectedCityId, state.selectedOfficeId, state.selectedBeeHubId);
}

function getFilteredOverview(visibleCities) {
  if (!state.data) {
    return buildOverview({});
  }

  const cityIds = new Set((visibleCities || []).map((city) => city.id));
  const offices = (state.data.offices || []).filter((office) => cityIds.has(office.cityId));
  const officeIds = new Set(offices.map((office) => office.id));
  const beeHubs = (state.data.beeHubs || []).filter(
    (beeHub) => cityIds.has(beeHub.cityId) || (beeHub.officeId && officeIds.has(beeHub.officeId))
  );
  const sales = (state.data.sales || []).filter((sale) => {
    const saleCityId = sale.serviceCityId || sale.cityId || null;
    const saleOfficeId = sale.serviceOfficeId || sale.officeId || null;
    return (saleCityId && cityIds.has(saleCityId)) || (saleOfficeId && officeIds.has(saleOfficeId));
  });
  const subjects = (state.data.subjects || []).filter((subject) => {
    const subjectCityId = subject.cityId || null;
    const subjectOfficeId = subject.officeId || null;
    return (subjectCityId && cityIds.has(subjectCityId)) || (subjectOfficeId && officeIds.has(subjectOfficeId));
  });

  return {
    cityCount: visibleCities.length,
    officeCount: offices.length,
    beeHubCount: beeHubs.length,
    salesCount: sales.length,
    salesTotal: sales.reduce((total, sale) => total + Number(sale.amount || 0), 0),
    subjectCount: subjects.length,
  };
}

function clearSelections() {
  state.selectedCityId = null;
  state.selectedOfficeId = null;
  state.selectedBeeHubId = null;
  state.selectionZoomMode = 'city';
}

function returnToOfficeDirectoryView() {
  state.view = 'office';
  state.selectedOfficeId = null;
  state.selectedBeeHubId = null;
  state.selectionZoomMode = 'retain';
  state.preserveMapExtent = true;
  renderView();
}

function goToCityView() {
  syncCityOverlaysFromOffice();
  state.view = 'city';
  clearSelections();
  state.preserveMapExtent = false;
  renderView();
}

function syncOfficeOverlaysFromCity() {
  state.overlays.office = {
    ...state.overlays.city,
    offices: true,
  };
}

function syncCityOverlaysFromOffice() {
  state.overlays.city = {
    ...state.overlays.office,
  };
}



function renderOverlaySwitches() {
  const container = document.getElementById('overlayControls');
  if (!container) return;

  const currentView = state.view === 'office' ? 'office' : 'city';
  const toggles = overlayDefinitions[currentView] || [];
  const activeState = state.overlays[currentView] || {};

  container.innerHTML = `
    <div class="overlay-panel" aria-label="Map overlays">
      <div class="overlay-panel-title">Overlays</div>
      <div class="toggle-list">
        ${toggles.map(({ key, label, color }) => `
          <label class="switch-row" style="--switch-color: ${color};">
            <span class="switch-label">${label}</span>
            <span class="switch-track-wrap">
              <input type="checkbox" data-layer-toggle="${key}" ${activeState[key] ? 'checked' : ''} />
              <span class="switch-track" aria-hidden="true"></span>
            </span>
          </label>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('[data-layer-toggle]').forEach((input) => {
    input.addEventListener('change', () => {
      setOverlayToggle(currentView, input.dataset.layerToggle, input.checked);
    });
  });
}

function resetDashboard() {
  state.view = 'city';
  clearSelections();
  state.filters = getDefaultFilters();
  state.overlays = structuredClone(defaultOverlays);
  state.preserveMapExtent = false;
  renderView();
}

function setOverlayToggle(view, key, checked) {
  if (!state.overlays[view] || !(key in state.overlays[view])) return;
  state.overlays[view][key] = Boolean(checked);
  state.preserveMapExtent = true;
  renderView();
}

function setCityQuery(value) {
  state.filters.cityQuery = String(value || '');
  state.preserveMapExtent = false;
  
  // Preserve overlay states from office to city view before filter changes
  if (state.view === 'office') {
    syncCityOverlaysFromOffice();
  }
  
  if (state.selectedCityId && !getVisibleCities().some((city) => city.id === state.selectedCityId)) {
    state.selectedCityId = null;
    state.selectedOfficeId = null;
    state.view = 'city';
  }
  renderView();
}

function setCountryFilter(value) {
  const previousCountry = state.filters.country;
  state.filters.country = value || 'all';
  state.preserveMapExtent = false;
  
  // Preserve overlay states from office to city view before filter changes
  if (state.view === 'office') {
    syncCityOverlaysFromOffice();
  }
  
  // If switching to "all countries" from a filtered country, reset to city view
  if (previousCountry !== 'all' && state.filters.country === 'all') {
    state.selectedCityId = null;
    state.selectedOfficeId = null;
    state.view = 'city';
  } else if (state.selectedCityId && !getVisibleCities().some((city) => city.id === state.selectedCityId)) {
    // Otherwise, only clear selections if the selected city is no longer visible
    state.selectedCityId = null;
    state.selectedOfficeId = null;
    state.view = 'city';
  }
  
  renderView();
}

function selectCity(city) {
  const wasAlreadyInOfficeView = state.view === 'office';
  
  state.selectedCityId = city.id;
  state.selectedOfficeId = null;
  state.selectedBeeHubId = null;
  state.view = 'office';
  state.selectionZoomMode = 'city';
  state.preserveMapExtent = false;
  
  // Only sync overlays from city if not already in office view
  // If already in office view, preserve the current office overlay states
  if (!wasAlreadyInOfficeView) {
    syncOfficeOverlaysFromCity();
  }
  
  renderView();
}

function selectOffice(office) {
  const isAlreadyInOfficeView = state.view === 'office';
  state.selectedCityId = office.cityId;
  state.selectedOfficeId = office.id;
  state.selectedBeeHubId = null;

  if (!isAlreadyInOfficeView) {
    state.view = 'office';
    state.selectionZoomMode = 'city';
    syncOfficeOverlaysFromCity();
  } else {
    state.selectionZoomMode = 'retain';
    state.overlays.office.offices = true;
  }

  state.preserveMapExtent = isAlreadyInOfficeView;
  renderView();
  requestAnimationFrame(() => state.mapService?.openOfficePopup?.(office.id));
}

function openBeeHub(beeHub) {
  const office = beeHub.officeId ? getOfficeById(beeHub.officeId) : null;
  const isAlreadyInOfficeView = state.view === 'office';

  state.selectedBeeHubId = beeHub.id;

  if (office) {
    state.selectedCityId = office.cityId;
    state.selectedOfficeId = office.id;
  } else if (beeHub.cityId) {
    state.selectedCityId = beeHub.cityId;
    state.selectedOfficeId = null;
  }

  if (!isAlreadyInOfficeView) {
    state.view = 'office';
    state.selectionZoomMode = 'city';
    syncOfficeOverlaysFromCity();
  } else {
    state.selectionZoomMode = 'retain';
    state.overlays.office.offices = true;
  }

  state.preserveMapExtent = isAlreadyInOfficeView;
  renderView();
  requestAnimationFrame(() => state.mapService?.openBeeHubPopup?.(beeHub.id));
}

function renderCityView() {
  const visibleCities = getVisibleCities();
  const overlays = state.overlays.city;
  const visibleOffices = overlays.offices ? getVisibleOffices() : [];
  const scope = getScopeContext(state.data, null, null);
  const beeHubs = overlays.beeHubs ? getBeeHubsForScope(state.data, scope) : [];
  const salesContext = buildSalesLayerContext(state.data, scope, { heatmapMode: 'serviceOffice' });
  const subjectContext = buildSubjectLayerContext(state.data, scope);

  state.mapService.renderScene({
    cities: visibleCities,
    offices: visibleOffices,
    beeHubs,
    salesHeatPoints: overlays.sales ? salesContext.heatPoints : [],
    subjectHeatPoints: overlays.subjects ? subjectContext.heatPoints : [],
    showCities: true,
    showOffices: overlays.offices,
    showBeeHubs: overlays.beeHubs,
    showSales: overlays.sales,
    showSubjects: overlays.subjects,
    onCityClick: selectCity,
    onOfficeClick: selectOffice,
    onBeeHubClick: openBeeHub,
    getCityById,
    focusPoints: visibleCities.length ? visibleCities.map((city) => [city.lat, city.lng]) : [],
  }, {
    fitToScene: !state.preserveMapExtent,
  });
  state.preserveMapExtent = false;

  state.detailsPanel.renderOverview({
    overview: getFilteredOverview(visibleCities),
    cities: state.data.cities,
    filters: state.filters,
    visibleCities,
    onCitySelect: selectCity,
    onCityQueryChange: setCityQuery,
    onCountryChange: setCountryFilter,
  });
}

function renderOfficeView() {
  const visibleCities = getVisibleCities();
  const overlays = state.overlays.office;
  const scope = getOfficeScope();
  const selectedBeeHub = state.selectedBeeHubId ? getBeeHubById(state.selectedBeeHubId) : null;
  const selectedCity = state.selectedCityId ? getCityById(state.selectedCityId) : null;
  const selectedOffice = state.selectedOfficeId ? getOfficeById(state.selectedOfficeId) : null;

  if (state.selectedCityId && !selectedCity) {
    clearSelections();
    state.view = 'city';
    renderView();
    return;
  }

  if (state.selectedOfficeId && !selectedOffice) {
    state.selectedOfficeId = null;
  }

  if (state.selectedBeeHubId && !selectedBeeHub) {
    state.selectedBeeHubId = null;
  }

  const cityOffices = getVisibleOffices();
  const officeScope = selectedOffice ? getScopeContext(state.data, state.selectedCityId, state.selectedOfficeId, null) : scope;
  const beeHubScope = selectedBeeHub ? getScopeContext(state.data, state.selectedCityId, null, state.selectedBeeHubId) : officeScope;
  const beeHubs = selectedBeeHub
    ? [selectedBeeHub]
    : (overlays.beeHubs ? getBeeHubsForScope(state.data, beeHubScope) : []);
  const salesContext = buildSalesLayerContext(state.data, beeHubScope, { heatmapMode: 'serviceOffice' });
  const subjectContext = buildSubjectLayerContext(state.data, beeHubScope);
  const officeMetrics = selectedOffice ? buildOfficeMetrics(state.data, selectedOffice.id) : null;
  const cityMetrics = selectedCity ? buildCityMetrics(state.data, selectedCity.id) : null;
  const focusPoints = state.selectionZoomMode === 'city'
    ? (cityOffices.length
      ? cityOffices.map((office) => [office.lat, office.lng])
      : visibleCities.map((city) => [city.lat, city.lng]))
    : (selectedBeeHub
      ? [[selectedBeeHub.lat, selectedBeeHub.lng]]
      : (selectedOffice
        ? [[selectedOffice.lat, selectedOffice.lng]]
        : (state.selectionZoomMode === 'retain'
          ? []
          : (cityOffices.length
            ? cityOffices.map((office) => [office.lat, office.lng])
            : visibleCities.map((city) => [city.lat, city.lng])))));

  state.mapService.renderScene({
    offices: overlays.offices ? cityOffices : [],
    beeHubs,
    salesHeatPoints: overlays.sales ? salesContext.heatPoints : [],
    subjectHeatPoints: overlays.subjects ? subjectContext.heatPoints : [],
    showCities: false,
    showOffices: overlays.offices,
    showBeeHubs: overlays.beeHubs || Boolean(selectedBeeHub),
    showSales: overlays.sales,
    showSubjects: overlays.subjects,
    onOfficeClick: selectOffice,
    onBeeHubClick: openBeeHub,
    onMapClick: (selectedOffice || selectedBeeHub) ? returnToOfficeDirectoryView : null,
    getCityById,
    focusPoints,
  }, {
    fitToScene: !state.preserveMapExtent,
  });
  state.preserveMapExtent = false;

  const overview = getFilteredOverview(visibleCities);

  if (selectedOffice && officeMetrics) {
    requestAnimationFrame(() => state.mapService?.openOfficePopup?.(selectedOffice.id));
    state.detailsPanel.renderOfficeDetail({
      office: selectedOffice,
      city: selectedCity,
      metrics: officeMetrics,
      onBack: returnToOfficeDirectoryView,
      onOfficeSelect: selectOffice,
      onBeeHubSelect: openBeeHub,
    });
    return;
  }

  if (selectedCity && cityMetrics) {
    state.detailsPanel.renderCityDetail({
      city: selectedCity,
      cities: state.data.cities,
      metrics: cityMetrics,
      filters: state.filters,
      visibleCities,
      onCitySelect: selectCity,
      onOfficeSelect: selectOffice,
      onCityQueryChange: setCityQuery,
      onCountryChange: setCountryFilter,
      onBack: goToCityView,
    });
    return;
  }

  state.detailsPanel.renderOfficeDirectory({
    overview,
    cities: state.data.cities,
    filters: state.filters,
    visibleCities,
    offices: cityOffices.map((office) => ({ office, city: getCityById(office.cityId) })),
    beeHubs,
    selectedCity,
    selectedOffice,
    onCitySelect: selectCity,
    onOfficeSelect: selectOffice,
    onBeeHubSelect: openBeeHub,
    onCityQueryChange: setCityQuery,
    onCountryChange: setCountryFilter,
    onBackToCity: goToCityView,
  });
}

function renderView() {
  if (!state.data || !state.mapService || !state.detailsPanel) {
    return;
  }

  const focusSnapshot = snapshotFocusedInput();

  const cityBtn = document.getElementById('cityBtn');
  if (cityBtn) {
    cityBtn.classList.toggle('active', state.view === 'city');
    cityBtn.setAttribute('aria-pressed', String(state.view === 'city'));
  }

  renderOverlaySwitches();

  if (state.view === 'office') {
    renderOfficeView();
    restoreFocusedInput(focusSnapshot);
    return;
  }

  renderCityView();
  restoreFocusedInput(focusSnapshot);
}

async function init() {
  state.data = await loadAllData();
  state.filters = getDefaultFilters();
  state.view = 'city';

  state.mapService = createMapService('map', state.data.settings || {});
  state.detailsPanel = createDetailsPanel(document.getElementById('detailsPanel'));

  const resetButton = document.getElementById('resetBtn');
  if (resetButton) {
    resetButton.addEventListener('click', resetDashboard);
  }

  const cityButton = document.getElementById('cityBtn');
  if (cityButton) {
    cityButton.addEventListener('click', goToCityView);
  }

  renderView();
}

init().catch((error) => {
  console.error(error);
  const detailsPanel = document.getElementById('detailsPanel');
  const map = document.getElementById('map');

  if (detailsPanel) {
    detailsPanel.innerHTML = `
      <div class="panel-head">
        <p class="eyebrow">Error</p>
        <h2>Could not load the dashboard</h2>
        <p class="muted">${error.message}</p>
      </div>
    `;
  }

  if (map) {
    map.innerHTML = '<div class="error-state">Failed to load map data.</div>';
  }
});

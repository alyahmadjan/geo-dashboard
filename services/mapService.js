import { createMapView } from '../components/map/mapView.js';
import { createCityMarker } from '../components/markers/cityMarkers.js';
import { createOfficeMarker } from '../components/markers/officeMarkers.js';
import { createBeeHubMarker } from '../components/markers/beeHubMarkers.js';
import { createHeatLayer } from '../components/map/heatLayer.js';

function addGroupToMap(map, layer) {
  if (!map.hasLayer(layer)) {
    layer.addTo(map);
  }
}

function removeGroupFromMap(map, layer) {
  if (map.hasLayer(layer)) {
    map.removeLayer(layer);
  }
}

export function createMapService(containerId, settings = {}) {
  const mapView = createMapView(containerId, settings.map || {});
  const map = mapView.map;

  const cityLayer = L.layerGroup();
  const officeLayer = L.layerGroup();
  const beeHubLayer = L.layerGroup();
  const salesHeatLayer = createHeatLayer([], {
    radius: 52,
    blur: 30,
    maxOpacity: 0.72,
    intensityScale: 0.95,
    gradient: {
      0.1: 'rgba(255,255,255,0)',
      0.35: 'rgba(14,165,233,0.2)',
      0.6: 'rgba(59,130,246,0.45)',
      0.82: 'rgba(245,158,11,0.65)',
      1: 'rgba(220,38,38,0.88)',
    },
  });
  const subjectHeatLayer = createHeatLayer([], {
    radius: 48,
    blur: 34,
    maxOpacity: 0.7,
    intensityScale: 0.9,
    gradient: {
      0.1: 'rgba(255,255,255,0)',
      0.35: 'rgba(168,85,247,0.22)',
      0.6: 'rgba(14,165,233,0.42)',
      0.8: 'rgba(34,197,94,0.64)',
      1: 'rgba(236,72,153,0.88)',
    },
  });

  const cityMarkers = new Map();
  const officeMarkers = new Map();
  const beeHubMarkers = new Map();
  let mapClickHandler = null;

  function clearLayers() {
    [cityLayer, officeLayer, beeHubLayer].forEach((layer) => layer.clearLayers());
    removeGroupFromMap(map, cityLayer);
    removeGroupFromMap(map, officeLayer);
    removeGroupFromMap(map, beeHubLayer);
    removeGroupFromMap(map, salesHeatLayer);
    removeGroupFromMap(map, subjectHeatLayer);
    cityMarkers.clear();
    officeMarkers.clear();
    beeHubMarkers.clear();
  }

  function renderCities(cities = [], callbacks = {}) {
    clearLayers();
    const points = [];

    addGroupToMap(map, cityLayer);
    cities.forEach((city) => {
      const marker = createCityMarker(city, settings.markerStyles?.city, {
        onClick: callbacks.onCityClick,
      });
      marker.addTo(cityLayer);
      cityMarkers.set(city.id, marker);
      points.push([city.lat, city.lng]);
    });

    mapView.fitToLatLngs(points);
  }

  function renderOffices(offices = [], callbacks = {}) {
    clearLayers();
    const points = [];

    addGroupToMap(map, officeLayer);
    offices.forEach((office) => {
      const city = callbacks.getCityById?.(office.cityId) || null;
      const marker = createOfficeMarker(office, city, settings.markerStyles?.office, {
        onClick: callbacks.onOfficeClick,
      });
      marker.addTo(officeLayer);
      officeMarkers.set(office.id, marker);
      points.push([office.lat, office.lng]);
    });

    mapView.fitToLatLngs(points);
  }

  function renderBeeHubs(beeHubs = [], callbacks = {}) {
    clearLayers();
    const points = [];

    addGroupToMap(map, beeHubLayer);
    beeHubs.forEach((beeHub) => {
      const marker = createBeeHubMarker(beeHub, settings.markerStyles?.beeHub, {
        onClick: callbacks.onBeeHubClick,
      });
      marker.addTo(beeHubLayer);
      beeHubMarkers.set(beeHub.id, marker);
      points.push([beeHub.lat, beeHub.lng]);
    });

    mapView.fitToLatLngs(points);
  }

  function renderSalesHeatmap(points = []) {
    clearLayers();
    salesHeatLayer.setPoints(points);
    addGroupToMap(map, salesHeatLayer);
    mapView.fitToLatLngs(points.map((point) => [point.lat, point.lng]));
  }

  function renderSubjectHeatmap(points = []) {
    clearLayers();
    subjectHeatLayer.setPoints(points);
    addGroupToMap(map, subjectHeatLayer);
    mapView.fitToLatLngs(points.map((point) => [point.lat, point.lng]));
  }

  function renderScene(scene = {}, options = {}) {
    clearLayers();

    if (mapClickHandler) {
      map.off('click', mapClickHandler);
      mapClickHandler = null;
    }

    if (typeof scene.onMapClick === 'function') {
      mapClickHandler = (event) => scene.onMapClick(event);
      map.on('click', mapClickHandler);
    }

    const points = [];

    if (scene.showCities) {
      addGroupToMap(map, cityLayer);
      (scene.cities || []).forEach((city) => {
        const marker = createCityMarker(city, settings.markerStyles?.city, {
          onClick: scene.onCityClick,
        });
        marker.addTo(cityLayer);
        cityMarkers.set(city.id, marker);
        points.push([city.lat, city.lng]);
      });
    }

    if (scene.showOffices) {
      addGroupToMap(map, officeLayer);
      (scene.offices || []).forEach((office) => {
        const city = scene.getCityById?.(office.cityId) || null;
        const marker = createOfficeMarker(office, city, settings.markerStyles?.office, {
          onClick: scene.onOfficeClick,
        });
        marker.addTo(officeLayer);
        officeMarkers.set(office.id, marker);
        points.push([office.lat, office.lng]);
      });
    }

    if (scene.showBeeHubs) {
      addGroupToMap(map, beeHubLayer);
      (scene.beeHubs || []).forEach((beeHub) => {
        const marker = createBeeHubMarker(beeHub, settings.markerStyles?.beeHub, {
          onClick: scene.onBeeHubClick,
        });
        marker.addTo(beeHubLayer);
        beeHubMarkers.set(beeHub.id, marker);
        points.push([beeHub.lat, beeHub.lng]);
      });
    }

    if (scene.showSales) {
      salesHeatLayer.setPoints(scene.salesHeatPoints || []);
      addGroupToMap(map, salesHeatLayer);
      points.push(...(scene.salesHeatPoints || []).map((point) => [point.lat, point.lng]));
    }

    if (scene.showSubjects) {
      subjectHeatLayer.setPoints(scene.subjectHeatPoints || []);
      addGroupToMap(map, subjectHeatLayer);
      points.push(...(scene.subjectHeatPoints || []).map((point) => [point.lat, point.lng]));
    }

    const shouldFit = options.fitToScene !== false;
    if (shouldFit) {
      const focusPoints = Array.isArray(scene.focusPoints) && scene.focusPoints.length ? scene.focusPoints : points;
      mapView.fitToLatLngs(focusPoints);
    }
  }

  function openOfficePopup(officeId) {
    const marker = officeMarkers.get(officeId);
    if (marker && typeof marker.openPopup === 'function') {
      marker.openPopup();
    }
  }

  function openBeeHubPopup(beeHubId) {
    const marker = beeHubMarkers.get(beeHubId);
    if (marker && typeof marker.openPopup === 'function') {
      marker.openPopup();
    }
  }

  function resetView() {
    if (mapClickHandler) {
      map.off('click', mapClickHandler);
      mapClickHandler = null;
    }
    clearLayers();
    mapView.fitToLatLngs([]);
  }

  return {
    map,
    renderCities,
    renderOffices,
    renderBeeHubs,
    renderSalesHeatmap,
    renderSubjectHeatmap,
    renderScene,
    resetView,
    openOfficePopup,
    openBeeHubPopup,
  };
}

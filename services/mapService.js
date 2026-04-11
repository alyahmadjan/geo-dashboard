import { createMapView } from '../components/map/mapView.js';
import { createCityMarker } from '../components/markers/cityMarkers.js';
import { createOfficeMarker } from '../components/markers/officeMarkers.js';
import { createBeeHubMarker } from '../components/markers/beeHubMarkers.js';
import { createHeatLayer } from '../components/map/heatLayer.js';

export function createMapService(containerId, settings = {}) {
  const mapView = createMapView(containerId, settings.map || {});
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
  const officeMarkers = new Map();
  const beeHubMarkers = new Map();
  let activeLayer = 'city';

  function clearAll() {
    mapView.clearLayer(cityLayer);
    mapView.clearLayer(officeLayer);
    mapView.clearLayer(beeHubLayer);
    if (mapView.map.hasLayer(salesHeatLayer)) {
      mapView.map.removeLayer(salesHeatLayer);
    }
    if (mapView.map.hasLayer(subjectHeatLayer)) {
      mapView.map.removeLayer(subjectHeatLayer);
    }
    officeMarkers.clear();
    beeHubMarkers.clear();
  }

  function setLayer(layerName) {
    activeLayer = layerName;
  }

  function renderCities(cities, callbacks = {}) {
    clearAll();
    setLayer('city');

    const points = [];

    cityLayer.addTo(mapView.map);
    cities.forEach((city) => {
      const marker = createCityMarker(city, settings.markerStyles?.city, {
        onClick: callbacks.onCityClick,
      });
      marker.addTo(cityLayer);
      points.push([city.lat, city.lng]);
    });

    mapView.fitToLatLngs(points);
  }

  function renderOffices(offices, callbacks = {}) {
    clearAll();
    setLayer('office');

    const points = [];

    officeLayer.addTo(mapView.map);
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

  function renderBeeHubs(beeHubs, callbacks = {}) {
    clearAll();
    setLayer('beeHub');

    const points = [];

    beeHubLayer.addTo(mapView.map);
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
    clearAll();
    setLayer('sales');
    salesHeatLayer.setPoints(points);
    salesHeatLayer.addTo(mapView.map);
    mapView.fitToLatLngs(points.map((point) => [point.lat, point.lng]));
  }

  function renderSubjectHeatmap(points = []) {
    clearAll();
    setLayer('subject');
    const validPoints = Array.isArray(points) ? points : [];
    subjectHeatLayer.setPoints(validPoints);
    subjectHeatLayer.addTo(mapView.map);
    if (validPoints.length > 0) {
      mapView.fitToLatLngs(validPoints.map((point) => [point.lat, point.lng]));
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
    activeLayer = 'city';
    clearAll();
    cityLayer.addTo(mapView.map);
    mapView.fitToLatLngs([]);
  }

  return {
    map: mapView.map,
    renderCities,
    renderOffices,
    renderBeeHubs,
    renderSalesHeatmap,
    renderSubjectHeatmap,
    setLayer,
    resetView,
    openOfficePopup,
    openBeeHubPopup,
    get activeLayer() {
      return activeLayer;
    },
  };
}

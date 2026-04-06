import { createMapView } from '../components/map/mapView.js';
import { createCityMarker } from '../components/markers/cityMarkers.js';
import { createOfficeMarker } from '../components/markers/officeMarkers.js';

export function createMapService(containerId, settings = {}) {
  const mapView = createMapView(containerId, settings.map || {});
  const cityLayer = L.layerGroup().addTo(mapView.map);
  const officeLayer = L.layerGroup();
  const officeMarkers = new Map();
  let activeLayer = 'city';

  function clearAll() {
    mapView.clearLayer(cityLayer);
    mapView.clearLayer(officeLayer);
    officeMarkers.clear();
  }

  function setLayer(layerName) {
    activeLayer = layerName;

    if (layerName === 'city') {
      if (mapView.map.hasLayer(officeLayer)) {
        mapView.map.removeLayer(officeLayer);
      }

      if (!mapView.map.hasLayer(cityLayer)) {
        cityLayer.addTo(mapView.map);
      }
      return;
    }

    if (!mapView.map.hasLayer(cityLayer)) {
      cityLayer.addTo(mapView.map);
    }

    if (!mapView.map.hasLayer(officeLayer)) {
      officeLayer.addTo(mapView.map);
    }
  }

  function renderCities(cities, callbacks = {}) {
    clearAll();
    setLayer('city');

    const points = [];

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

  function openOfficePopup(officeId) {
    const marker = officeMarkers.get(officeId);
    if (marker && typeof marker.openPopup === 'function') {
      marker.openPopup();
    }
  }

  function resetView() {
    activeLayer = 'city';
    clearAll();
    cityLayer.addTo(mapView.map);
    officeLayer.remove();
    mapView.fitToLatLngs([]);
  }

  return {
    map: mapView.map,
    renderCities,
    renderOffices,
    setLayer,
    resetView,
    openOfficePopup,
    get activeLayer() {
      return activeLayer;
    },
  };
}

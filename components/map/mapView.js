export function createMapView(containerId, config = {}) {
  const center = config.center || [20, 0];
  const zoom = config.zoom || 2;
  const minZoom = config.minZoom ?? 2;
  const maxZoom = config.maxZoom ?? 18;

  const map = L.map(containerId, {
    zoomControl: true,
    scrollWheelZoom: true,
    minZoom,
    maxZoom,
  }).setView(center, zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  function fitToLatLngs(latLngs) {
    if (!latLngs || latLngs.length === 0) {
      map.setView(center, zoom);
      return;
    }

    if (latLngs.length === 1) {
      map.setView(latLngs[0], Math.max(zoom, 6));
      return;
    }

    map.fitBounds(latLngs, { padding: [35, 35] });
  }

  function clearLayer(layer) {
    if (layer && typeof layer.clearLayers === 'function') {
      layer.clearLayers();
    }
  }

  return {
    map,
    fitToLatLngs,
    clearLayer,
    center,
    zoom,
  };
}

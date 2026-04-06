export function createCityMarker(city, styles, callbacks = {}) {
  const marker = L.circleMarker([city.lat, city.lng], {
    radius: styles?.radius ?? 10,
    color: styles?.color ?? '#2563eb',
    fillColor: styles?.fillColor ?? '#2563eb',
    fillOpacity: styles?.fillOpacity ?? 0.9,
    weight: styles?.weight ?? 2,
  });

  marker.bindTooltip(`${city.name} • ${city.population ? city.population.toLocaleString('en-US') : '—'}`, {
    direction: 'top',
    offset: [0, -6],
    opacity: 0.95,
  });

  marker.bindPopup(`
    <div class="popup-card">
      <strong>${city.name}</strong><br />
      <span>${city.country}${city.region ? ` · ${city.region}` : ''}</span><br />
      <span>Population: ${city.population ? city.population.toLocaleString('en-US') : '—'}</span>
    </div>
  `);

  marker.on('click', () => callbacks.onClick?.(city));

  return marker;
}

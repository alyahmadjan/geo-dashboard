function createOfficePinIcon() {
  return L.divIcon({
    className: 'office-pin-icon',
    html: `
      <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" focusable="false">
        <path d="M24 46s13-14.2 13-25.2C37 13 31.2 7 24 7S11 13 11 20.8C11 31.8 24 46 24 46Z" fill="#fbbc04" stroke="#ffffff" stroke-width="2.4" />
        <circle cx="24" cy="21" r="6.5" fill="#ffffff" opacity="0.98" />
      </svg>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 46],
    popupAnchor: [0, -42],
    tooltipAnchor: [0, -28],
  });
}

export function createOfficeMarker(office, city, styles, callbacks = {}) {
  const marker = L.marker([office.lat, office.lng], {
    icon: styles?.icon ?? createOfficePinIcon(),
    riseOnHover: true,
  });

  marker.bindTooltip(office.name, { direction: 'top', offset: [0, -10], opacity: 0.95 });

  marker.bindPopup(`
    <div class="popup-card">
      <strong>${office.name}</strong><br />
      <span>${city ? city.name : 'Unknown city'}</span><br />
      <span>Status: ${office.status}</span><br />
      <span>Team size: ${office.teamSize || '—'}</span>
    </div>
  `);

  marker.on('click', () => callbacks.onClick?.(office));

  return marker;
}

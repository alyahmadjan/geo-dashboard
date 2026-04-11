function createBeeHubPinIcon() {
  return L.divIcon({
    className: 'beehub-pin-icon',
    html: `
      <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" focusable="false">
        <path d="M24 46s13-14.2 13-25.2C37 13 31.2 7 24 7S11 13 11 20.8C11 31.8 24 46 24 46Z" fill="#8d5a2b" stroke="#fff" stroke-width="2.4" />
        <circle cx="24" cy="21" r="6.5" fill="#fff8e7" opacity="0.98" />
        <path d="M20 21h8M20 18.5h8M20 23.5h8" stroke="#8d5a2b" stroke-width="1.8" stroke-linecap="round" />
      </svg>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 46],
    popupAnchor: [0, -42],
    tooltipAnchor: [0, -28],
  });
}

export function createBeeHubMarker(beeHub, styles, callbacks = {}) {
  const marker = L.marker([beeHub.lat, beeHub.lng], {
    icon: styles?.icon ?? createBeeHubPinIcon(),
    riseOnHover: true,
  });

  marker.bindTooltip(beeHub.name, { direction: 'top', offset: [0, -10], opacity: 0.95 });

  marker.bindPopup(`
    <div class="popup-card">
      <strong>${beeHub.name}</strong><br />
      <span>${(beeHub.resolvedCity || beeHub.city || {}).name || '—'}${(beeHub.resolvedCity || beeHub.city || {}).country ? ` · ${(beeHub.resolvedCity || beeHub.city || {}).country}` : ''}</span><br />
      <span>${beeHub.address || '—'}</span><br />
      <span>Hours: ${beeHub.hoursOfOperation || beeHub.hours || '—'}</span><br />
      <span>Office: ${beeHub.resolvedOfficeName || '—'} (${beeHub.resolvedOffice?.officeType || beeHub.resolvedOwnership || 'unassigned'})</span>
    </div>
  `);

  marker.on('click', () => callbacks.onClick?.(beeHub));

  return marker;
}

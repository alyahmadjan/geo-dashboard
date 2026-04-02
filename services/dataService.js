const DEFAULT_DATA_URL = './data/cities.json';

function getConfiguredDataUrl() {
  if (typeof window !== 'undefined' && window.GEO_DASHBOARD_API_URL) {
    return window.GEO_DASHBOARD_API_URL;
  }
  return DEFAULT_DATA_URL;
}

export async function fetchCities() {
  const dataUrl = getConfiguredDataUrl();
  const response = await fetch(dataUrl, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to load city data from ${dataUrl}: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : (payload.cities ?? []);
}

export function getCountryOptions(cities) {
  return ['All countries', ...new Set(cities.map((city) => city.country).sort())];
}

const FILES = {
  cities: 'cities.json',
  offices: 'offices.json',
  incidents: 'incidents.json',
  sales: 'sales.json',
  beeHubs: 'beeHubs.json',
  subjects: 'subjects.json',
  kpis: 'kpis.json',
  settings: 'settings.json',
};

function getBaseUrl() {
  if (typeof window !== 'undefined' && window.GEO_DASHBOARD_API_BASE_URL) {
    return String(window.GEO_DASHBOARD_API_BASE_URL).replace(/\/$/, '');
  }

  return './data';
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function loadDataset(name) {
  if (!FILES[name]) {
    throw new Error(`Unknown dataset requested: ${name}`);
  }

  const baseUrl = getBaseUrl();
  const resourceUrl = `${baseUrl}/${FILES[name]}`;
  const payload = await fetchJson(resourceUrl);

  if (name === 'settings') {
    return payload && typeof payload === 'object' ? payload : {};
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return payload?.[name] ?? payload?.data ?? [];
}

export async function loadAllData() {
  const [cities, offices, incidents, sales, beeHubs, subjects, kpis, settings] = await Promise.all([
    loadDataset('cities'),
    loadDataset('offices'),
    loadDataset('incidents'),
    loadDataset('sales'),
    loadDataset('beeHubs'),
    loadDataset('subjects'),
    loadDataset('kpis'),
    loadDataset('settings'),
  ]);

  return {
    cities,
    offices,
    incidents,
    sales,
    beeHubs,
    subjects,
    kpis,
    settings: settings && typeof settings === 'object' ? settings : {},
  };
}

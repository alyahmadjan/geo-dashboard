function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function round(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(Number(value || 0) * factor) / factor;
}

function getCityIds(cityScope) {
  if (!Array.isArray(cityScope)) return [];
  return cityScope.map((city) => city.id).filter(Boolean);
}

function getOfficeIdsForCities(data, cityIds) {
  return data.offices.filter((office) => cityIds.has(office.cityId)).map((office) => office.id);
}

export function uniqueCountries(cities) {
  return [...new Set(cities.map((city) => city.country).filter(Boolean))].sort();
}

export function filterCities(cities, filters = {}) {
  const query = String(filters.cityQuery || '').trim().toLowerCase();
  const country = String(filters.country || 'all');

  return cities.filter((city) => {
    const matchesQuery = !query || city.name.toLowerCase().includes(query);
    const matchesCountry = country === 'all' || city.country === country;
    return matchesQuery && matchesCountry;
  });
}

export function getOfficesForCity(offices, cityId) {
  return offices.filter((office) => office.cityId === cityId);
}

export function getOfficesForCities(offices, cityIds) {
  const cityIdSet = cityIds instanceof Set ? cityIds : new Set(cityIds || []);
  return offices.filter((office) => cityIdSet.has(office.cityId));
}

export function getIncidentsForCity(data, cityId) {
  const cityOfficeIds = new Set(getOfficesForCity(data.offices, cityId).map((office) => office.id));

  return data.incidents.filter((incident) => incident.cityId === cityId || cityOfficeIds.has(incident.officeId));
}

export function getSalesForCity(data, cityId) {
  const cityOfficeIds = new Set(getOfficesForCity(data.offices, cityId).map((office) => office.id));

  return data.sales.filter((item) => item.cityId === cityId || cityOfficeIds.has(item.officeId));
}

export function getKpisForCity(data, cityId) {
  const cityOfficeIds = new Set(getOfficesForCity(data.offices, cityId).map((office) => office.id));

  return data.kpis.filter((item) => {
    return (
      (item.entityType === 'city' && item.entityId === cityId) ||
      (item.entityType === 'office' && cityOfficeIds.has(item.entityId))
    );
  });
}

export function getIncidentsForOffice(data, officeId) {
  return data.incidents.filter((incident) => incident.officeId === officeId);
}

export function getSalesForOffice(data, officeId) {
  return data.sales.filter((item) => item.officeId === officeId);
}

export function getKpisForOffice(data, officeId) {
  return data.kpis.filter((item) => item.entityType === 'office' && item.entityId === officeId);
}

export function getCitiesOverviewMetrics(data, cityScope) {
  const cityIds = new Set(getCityIds(cityScope));
  const officeIds = new Set(getOfficeIdsForCities(data, cityIds));
  const offices = data.offices.filter((office) => cityIds.has(office.cityId));
  const incidents = data.incidents.filter((incident) => cityIds.has(incident.cityId) || officeIds.has(incident.officeId));
  const sales = data.sales.filter((sale) => cityIds.has(sale.cityId) || officeIds.has(sale.officeId));
  const kpis = data.kpis.filter((kpi) => {
    if (kpi.entityType === 'city') {
      return cityIds.has(kpi.entityId);
    }

    if (kpi.entityType === 'office') {
      return officeIds.has(kpi.entityId);
    }

    return false;
  });

  return {
    cityCount: cityIds.size,
    officeCount: offices.length,
    incidentCount: incidents.length,
    salesTotal: sum(sales.map((item) => item.amount)),
    kpiCount: kpis.length,
    kpis,
  };
}

export function buildCityMetrics(data, cityId) {
  const offices = getOfficesForCity(data.offices, cityId);
  const incidents = getIncidentsForCity(data, cityId);
  const sales = getSalesForCity(data, cityId);
  const kpis = getKpisForCity(data, cityId);

  return {
    offices,
    incidents,
    sales,
    kpis,
    officeCount: offices.length,
    incidentCount: incidents.length,
    salesTotal: sum(sales.map((item) => item.amount)),
    kpiCount: kpis.length,
  };
}

export function buildOfficeMetrics(data, officeId) {
  const office = data.offices.find((item) => item.id === officeId) || null;
  const incidents = getIncidentsForOffice(data, officeId);
  const sales = getSalesForOffice(data, officeId);
  const kpis = getKpisForOffice(data, officeId);

  return {
    office,
    incidents,
    sales,
    kpis,
    incidentCount: incidents.length,
    salesTotal: sum(sales.map((item) => item.amount)),
    kpiCount: kpis.length,
  };
}

export function buildOverview(data) {
  return {
    cityCount: data.cities.length,
    officeCount: data.offices.length,
    incidentCount: data.incidents.length,
    salesTotal: sum(data.sales.map((item) => item.amount)),
    kpiCount: data.kpis.length,
  };
}

export function summarizeKpisForDisplay(kpis) {
  const groups = new Map();

  for (const kpi of kpis) {
    const key = kpi.name || 'KPI';
    if (!groups.has(key)) {
      groups.set(key, {
        name: key,
        values: [],
        unit: kpi.unit || '',
        period: kpi.period || '',
        count: 0,
      });
    }

    const group = groups.get(key);
    group.count += 1;
    group.unit = group.unit || kpi.unit || '';
    group.period = group.period || kpi.period || '';

    const numericValue = Number(kpi.value);
    if (Number.isFinite(numericValue) && kpi.value !== '' && kpi.value !== null && kpi.value !== undefined) {
      group.values.push(numericValue);
    } else {
      group.values.push(kpi.value);
    }
  }

  return [...groups.values()]
    .map((group) => {
      const allNumeric = group.values.length > 0 && group.values.every((value) => typeof value === 'number' && Number.isFinite(value));
      const value = allNumeric
        ? round(sum(group.values) / group.values.length, 1)
        : group.values[0];

      return {
        name: group.name,
        value,
        unit: group.unit,
        period: group.count > 1 ? `${group.count} records` : group.period || '—',
        summary: group.count > 1 ? `${group.count} records` : '',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function buildFilteredOverview(data, cities) {
  return getCitiesOverviewMetrics(data, cities);
}

export function formatCurrency(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(round(value));
}

export function formatDecimal(value, digits = 1) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(value || 0));
}

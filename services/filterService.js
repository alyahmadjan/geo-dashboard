function sum(values = []) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function round(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(Number(value || 0) * factor) / factor;
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function getCityById(data, cityId) {
  return (data?.cities || []).find((city) => city.id === cityId) || null;
}

function getOfficeById(data, officeId) {
  return (data?.offices || []).find((office) => office.id === officeId) || null;
}

function getOfficesForCity(data, cityId) {
  return (data?.offices || []).filter((office) => office.cityId === cityId);
}

function getBeeHubsForOffice(data, officeId) {
  return (data?.beeHubs || []).filter((beeHub) => beeHub.officeId === officeId);
}

function getBeeHubsForCity(data, cityId) {
  return (data?.beeHubs || []).filter((beeHub) => beeHub.cityId === cityId);
}

function matchesCityFilters(city, filters = {}) {
  const query = String(filters.cityQuery || '').trim().toLowerCase();
  const country = String(filters.country || 'all');

  const matchesQuery = !query || String(city?.name || '').toLowerCase().includes(query);
  const matchesCountry = country === 'all' || city?.country === country;
  return matchesQuery && matchesCountry;
}

function getScopeContext(data, selectedCityId = null, selectedOfficeId = null, selectedBeeHubId = null) {
  const beeHub = selectedBeeHubId ? (data?.beeHubs || []).find((item) => item.id === selectedBeeHubId) || null : null;
  const office = beeHub ? getOfficeById(data, beeHub.officeId) : (selectedOfficeId ? getOfficeById(data, selectedOfficeId) : null);
  const city = beeHub
    ? (office ? getCityById(data, office.cityId) : (beeHub.cityId ? getCityById(data, beeHub.cityId) : null))
    : (office ? getCityById(data, office.cityId) : (selectedCityId ? getCityById(data, selectedCityId) : null));

  if (beeHub) {
    const linkedOffice = office || (beeHub.officeId ? getOfficeById(data, beeHub.officeId) : null);
    const linkedCity = city || (beeHub.cityId ? getCityById(data, beeHub.cityId) : null);

    return {
      mode: 'beehub',
      city: linkedCity,
      office: linkedOffice,
      beeHub,
      cityIds: new Set([beeHub.cityId || linkedCity?.id].filter(Boolean)),
      officeIds: new Set([beeHub.officeId || linkedOffice?.id].filter(Boolean)),
      beeHubIds: new Set([beeHub.id]),
      label: 'BeeHub scope',
      subtitle: `${beeHub.name}${linkedOffice ? ` · ${linkedOffice.name}` : ''}${linkedCity ? ` · ${linkedCity.name}` : ''}`,
    };
  }

  if (office) {
    return {
      mode: 'office',
      city: city || getCityById(data, office.cityId),
      office,
      beeHub: null,
      cityIds: new Set([office.cityId].filter(Boolean)),
      officeIds: new Set([office.id]),
      beeHubIds: new Set(),
      label: 'Office scope',
      subtitle: `${office.name}${city ? ` · ${city.name}` : ''}`,
    };
  }

  if (city) {
    return {
      mode: 'city',
      city,
      office: null,
      beeHub: null,
      cityIds: new Set([city.id]),
      officeIds: new Set(getOfficesForCity(data, city.id).map((officeItem) => officeItem.id)),
      beeHubIds: new Set(getBeeHubsForCity(data, city.id).map((beeHubItem) => beeHubItem.id)),
      label: 'City scope',
      subtitle: `${city.name} · ${city.country}${city.region ? ` · ${city.region}` : ''}`,
    };
  }

  return {
    mode: 'global',
    city: null,
    office: null,
    beeHub: null,
    cityIds: new Set((data?.cities || []).map((cityItem) => cityItem.id)),
    officeIds: new Set((data?.offices || []).map((officeItem) => officeItem.id)),
    beeHubIds: new Set((data?.beeHubs || []).map((beeHubItem) => beeHubItem.id)),
    label: 'Global view',
    subtitle: 'All cities and offices',
  };
}

function filterCities(cities = [], filters = {}) {
  return cities.filter((city) => matchesCityFilters(city, filters));
}

function uniqueCountries(cities = []) {
  return uniqueValues(cities.map((city) => city.country));
}

function uniqueCountriesFromBeeHubs(data = {}) {
  const countries = (data.beeHubs || []).map((beeHub) => {
    const city = getCityById(data, beeHub.cityId) || beeHub.resolvedCity || null;
    return city?.country || null;
  });

  return uniqueValues(countries);
}

function getOfficesInScope(data, scope) {
  if (!scope || scope.mode === 'global') {
    return [...(data?.offices || [])];
  }

  if (scope.mode === 'office' && scope.office) {
    return [scope.office];
  }

  if (scope.mode === 'city' && scope.city) {
    return getOfficesForCity(data, scope.city.id);
  }

  return [];
}

function getBeeHubsForScope(data, scope) {
  if (!scope || scope.mode === 'global') {
    return [...(data?.beeHubs || [])];
  }

  if (scope.mode === 'beehub' && scope.beeHub) {
    return [scope.beeHub];
  }

  if (scope.mode === 'office' && scope.office) {
    return getBeeHubsForOffice(data, scope.office.id);
  }

  if (scope.mode === 'city' && scope.city) {
    return getBeeHubsForCity(data, scope.city.id);
  }

  return [];
}

function getSalesForScope(data, scope) {
  const officeIds = scope?.officeIds || new Set((data?.offices || []).map((office) => office.id));
  const cityIds = scope?.cityIds || new Set((data?.cities || []).map((city) => city.id));

  return (data?.sales || []).filter((sale) => {
    const saleOfficeId = sale.serviceOfficeId || sale.officeId || null;
    const saleCityId = sale.serviceCityId || sale.cityId || null;

    if (scope?.mode === 'beehub') {
      return saleOfficeId ? officeIds.has(saleOfficeId) : false;
    }

    if (scope?.mode === 'office') {
      return saleOfficeId ? officeIds.has(saleOfficeId) : false;
    }

    if (scope?.mode === 'city') {
      return (saleCityId && cityIds.has(saleCityId)) || (saleOfficeId && officeIds.has(saleOfficeId));
    }

    return true;
  });
}

function getSubjectsForScope(data, scope) {
  const officeIds = scope?.officeIds || new Set((data?.offices || []).map((office) => office.id));
  const cityIds = scope?.cityIds || new Set((data?.cities || []).map((city) => city.id));

  return (data?.subjects || []).filter((subject) => {
    const subjectOfficeId = subject.officeId || null;
    const subjectCityId = subject.cityId || null;

    if (scope?.mode === 'beehub') {
      return subjectOfficeId ? officeIds.has(subjectOfficeId) : false;
    }

    if (scope?.mode === 'office') {
      return subjectOfficeId ? officeIds.has(subjectOfficeId) : false;
    }

    if (scope?.mode === 'city') {
      return (subjectCityId && cityIds.has(subjectCityId)) || (subjectOfficeId && officeIds.has(subjectOfficeId));
    }

    return true;
  });
}

function toSalesHeatPoints(records = []) {
  return records
    .map((sale) => ({
      lat: Number(sale.purchaserLat),
      lng: Number(sale.purchaserLng),
      weight: Number(sale.dealCount || 1),
      region: sale.purchaserRegion || sale.purchaserCountry || 'Unassigned',
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

function toSubjectHeatPoints(records = []) {
  return records
    .map((subject) => ({
      lat: Number(subject.lat),
      lng: Number(subject.lng),
      weight: 1,
      region: subject.region || 'Unassigned',
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

function buildOverview(data = {}) {
  return {
    cityCount: (data.cities || []).length,
    officeCount: (data.offices || []).length,
    beeHubCount: (data.beeHubs || []).length,
    salesCount: (data.sales || []).length,
    salesTotal: sum((data.sales || []).map((sale) => sale.amount)),
    subjectCount: (data.subjects || []).length,
  };
}

function buildCityMetrics(data = {}, cityId) {
  const city = getCityById(data, cityId);
  const offices = getOfficesForCity(data, cityId);
  const beeHubs = getBeeHubsForCity(data, cityId);
  const sales = (data.sales || []).filter((sale) => {
    const saleCityId = sale.serviceCityId || sale.cityId || null;
    return saleCityId === cityId || offices.some((office) => office.id === (sale.serviceOfficeId || sale.officeId));
  });
  const subjects = (data.subjects || []).filter((subject) => subject.cityId === cityId || offices.some((office) => office.id === subject.officeId));

  return {
    city,
    offices,
    beeHubs,
    sales,
    subjects,
    officeCount: offices.length,
    beeHubCount: beeHubs.length,
    salesCount: sales.length,
    salesTotal: sum(sales.map((sale) => sale.amount)),
    subjectCount: subjects.length,
  };
}

function buildOfficeMetrics(data = {}, officeId) {
  const office = getOfficeById(data, officeId);
  const city = office ? getCityById(data, office.cityId) : null;
  const beeHubs = getBeeHubsForOffice(data, officeId);
  const sales = (data.sales || []).filter((sale) => (sale.serviceOfficeId || sale.officeId || null) === officeId);
  const subjects = (data.subjects || []).filter((subject) => subject.officeId === officeId);

  return {
    office,
    city,
    beeHubs,
    sales,
    subjects,
    beeHubCount: beeHubs.length,
    salesCount: sales.length,
    salesTotal: sum(sales.map((sale) => sale.amount)),
    subjectCount: subjects.length,
  };
}

function buildSalesLayerContext(data = {}, scope, options = {}) {
  const records = getSalesForScope(data, scope);
  const heatmapMode = options.heatmapMode || 'purchaser';

  let heatPoints = toSalesHeatPoints(records);

  if (heatmapMode === 'serviceOffice') {
    heatPoints = records
      .map((sale) => {
        const officeId = sale.serviceOfficeId || sale.officeId || null;
        const office = officeId ? getOfficeById(data, officeId) : null;
        const city = office ? getCityById(data, office.cityId) : null;

        const lat = Number(office?.lat ?? city?.lat ?? sale.purchaserLat);
        const lng = Number(office?.lng ?? city?.lng ?? sale.purchaserLng);

        return {
          lat,
          lng,
          weight: Number(sale.dealCount || 1),
          region: city?.country || city?.region || sale.purchaserRegion || 'Office scope',
        };
      })
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  } else if (scope?.mode === 'office' && scope.office) {
    const officeLat = Number(scope.office.lat);
    const officeLng = Number(scope.office.lng);

    if (Number.isFinite(officeLat) && Number.isFinite(officeLng)) {
      heatPoints = records
        .map((sale) => ({
          lat: officeLat,
          lng: officeLng,
          weight: Number(sale.dealCount || 1),
          region: scope.city?.country || scope.city?.region || 'Office scope',
        }))
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
    }
  }

  return {
    records,
    heatPoints,
    cityCount: uniqueValues(records.map((sale) => sale.serviceCityId || sale.cityId).filter(Boolean)).length,
    officeCount: uniqueValues(records.map((sale) => sale.serviceOfficeId || sale.officeId).filter(Boolean)).length,
    salesCount: records.length,
    salesTotal: sum(records.map((sale) => sale.amount)),
    regions: uniqueValues(records.map((sale) => sale.purchaserRegion || 'Unassigned')),
  };
}

function buildSubjectLayerContext(data = {}, scope) {
  const records = getSubjectsForScope(data, scope);
  return {
    records,
    heatPoints: toSubjectHeatPoints(records),
    cityCount: uniqueValues(records.map((subject) => subject.cityId).filter(Boolean)).length,
    officeCount: uniqueValues(records.map((subject) => subject.officeId).filter(Boolean)).length,
    subjectCount: records.length,
    regions: uniqueValues(records.map((subject) => subject.region || 'Unassigned')),
  };
}

function formatCurrency(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(round(value));
}

function formatDecimal(value, digits = 1) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(value || 0));
}

function formatMonthLabel(value) {
  if (!value) return '—';
  const date = new Date(`${value}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
}

export {
  buildCityMetrics,
  buildOfficeMetrics,
  buildOverview,
  buildSalesLayerContext,
  buildSubjectLayerContext,
  filterCities,
  formatCurrency,
  formatDecimal,
  formatMonthLabel,
  formatNumber,
  getBeeHubsForScope,
  getScopeContext,
  getSalesForScope,
  getSubjectsForScope,
  uniqueCountries,
  uniqueCountriesFromBeeHubs,
};

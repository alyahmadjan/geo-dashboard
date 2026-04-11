function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function round(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(Number(value || 0) * factor) / factor;
}

function parseMonth(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatMonth(value) {
  const date = parseMonth(value);
  if (!date) return value || '—';

  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
}

function getCityIds(cityScope) {
  if (!Array.isArray(cityScope)) return [];
  return cityScope.map((city) => city.id).filter(Boolean);
}

function getOfficeIdsForCities(data, cityIds) {
  return data.offices.filter((office) => cityIds.has(office.cityId)).map((office) => office.id);
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function getCityById(data, cityId) {
  return data.cities.find((city) => city.id === cityId) || null;
}

function getOfficeById(data, officeId) {
  return data.offices.find((office) => office.id === officeId) || null;
}

function getRegionalOfficeForCity(data, cityId) {
  return data.offices.find((office) => office.cityId === cityId && office.officeType === 'regional') || null;
}

function getSubRegionalOfficesForOffice(data, officeId) {
  return data.offices.filter((office) => office.parentOfficeId === officeId && office.officeType === 'sub-regional');
}

function getRegionForCity(data, cityId) {
  return getCityById(data, cityId)?.region || 'Unassigned';
}

function getCityIdsForScope(data, scope) {
  if (!scope) {
    return new Set((data.cities || []).map((city) => city.id));
  }

  if (scope.mode === 'office' && scope.office?.cityId) {
    return new Set([scope.office.cityId]);
  }

  if (scope.mode === 'city' && scope.city?.id) {
    return new Set([scope.city.id]);
  }

  return new Set((data.cities || []).map((city) => city.id));
}

function getOfficeIdsForScope(data, scope) {
  if (!scope) {
    return new Set((data.offices || []).map((office) => office.id));
  }

  if (scope.mode === 'office' && scope.office?.id) {
    return new Set([scope.office.id]);
  }

  if (scope.mode === 'city' && scope.city?.id) {
    return new Set(getOfficesForCity(data.offices || [], scope.city.id).map((office) => office.id));
  }

  return new Set((data.offices || []).map((office) => office.id));
}

function groupHeatPoints(records, options = {}) {
  const latKey = options.latKey || 'lat';
  const lngKey = options.lngKey || 'lng';
  const weightKey = options.weightKey || 'weight';
  const regionKey = options.regionKey || 'region';
  const groups = new Map();

  for (const record of records) {
    const region = String(record?.[regionKey] || 'Unassigned');
    const lat = Number(record?.[latKey]);
    const lng = Number(record?.[lngKey]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }

    const weight = Number(record?.[weightKey] ?? 1);
    const resolvedWeight = Number.isFinite(weight) ? weight : 1;

    if (!groups.has(region)) {
      groups.set(region, {
        region,
        count: 0,
        weight: 0,
        latSum: 0,
        lngSum: 0,
      });
    }

    const group = groups.get(region);
    group.count += 1;
    group.weight += resolvedWeight;
    group.latSum += lat * resolvedWeight;
    group.lngSum += lng * resolvedWeight;
  }

  return [...groups.values()].map((group) => ({
    region: group.region,
    count: group.count,
    weight: group.weight,
    lat: group.weight ? group.latSum / group.weight : group.latSum / Math.max(group.count, 1),
    lng: group.weight ? group.lngSum / group.weight : group.lngSum / Math.max(group.count, 1),
  }));
}

function resolveBeeHubOwnershipInternal(beeHub, data) {
  const resolvedOfficeId = beeHub.officeId || beeHub.subRegionalOfficeId || beeHub.regionalOfficeId || null;
  const resolvedOffice = resolvedOfficeId ? getOfficeById(data, resolvedOfficeId) : null;
  const resolvedCity = resolvedOffice ? getCityById(data, resolvedOffice.cityId) : getCityById(data, beeHub.cityId);

  return {
    ...beeHub,
    resolvedOfficeId: resolvedOffice ? resolvedOffice.id : null,
    resolvedOffice,
    resolvedOfficeName: resolvedOffice?.name || 'Unassigned',
    resolvedOwnership: resolvedOffice?.officeType || 'unassigned',
    resolvedCity,
    region: beeHub.region || resolvedCity?.region || 'Unassigned',
  };
}

function normalizeSalesScopeRecord(sale, data) {
  const resolvedOfficeId = sale.officeId || sale.serviceOfficeId || null;
  const resolvedOffice = resolvedOfficeId ? getOfficeById(data, resolvedOfficeId) : null;
  const resolvedServiceCityId = sale.serviceCityId || resolvedOffice?.cityId || sale.cityId || null;
  const resolvedServiceCity = resolvedServiceCityId ? getCityById(data, resolvedServiceCityId) : null;
  const resolvedPurchaserCityId = sale.purchaserCityId || null;
  const resolvedPurchaserCity = resolvedPurchaserCityId ? getCityById(data, resolvedPurchaserCityId) : null;
  const resolvedPurchaserCountry = sale.purchaserCountry || resolvedPurchaserCity?.country || 'Unassigned';
  const resolvedPurchaserRegion = sale.purchaserRegion || resolvedPurchaserCity?.region || 'Unassigned';

  return {
    ...sale,
    resolvedOfficeId,
    resolvedOffice,
    resolvedServiceCityId,
    resolvedServiceCity,
    resolvedPurchaserCityId,
    resolvedPurchaserCity,
    resolvedCountry: resolvedPurchaserCountry,
    resolvedRegion: resolvedPurchaserRegion,
  };
}

function getScopedSalesRecords(data, scope = null, region = 'all') {
  const officeIds = getOfficeIdsForScope(data, scope);
  const cityIds = getCityIdsForScope(data, scope);

  return (data.sales || [])
    .map((sale) => normalizeSalesScopeRecord(sale, data))
    .filter((sale) => {
      const matchesRegion = region === 'all' || sale.resolvedRegion === region || sale.purchaserRegion === region;
      const matchesScope =
        !scope ||
        scope.mode === 'global' ||
        (scope.mode === 'city' && cityIds.has(sale.resolvedPurchaserCityId || sale.purchaserCityId)) ||
        (scope.mode === 'office' && officeIds.has(sale.resolvedOfficeId || sale.officeId));

      return matchesRegion && matchesScope;
    });
}

function getScopedSubjects(data, scope = null, period = 'all') {
  const officeIds = getOfficeIdsForScope(data, scope);
  const cityIds = getCityIdsForScope(data, scope);

  return (data.subjects || []).filter((subject) => {
    const matchesPeriod = period === 'all' || String(subject.verifiedAt || '').slice(0, 7) === period;
    const subjectOfficeId = subject.officeId || null;
    const matchesScope =
      !scope ||
      scope.mode === 'global' ||
      (scope.mode === 'city' && cityIds.has(subject.cityId || subject.resolvedCityId)) ||
      (scope.mode === 'office' && officeIds.has(subjectOfficeId));

    return matchesPeriod && matchesScope;
  });
}

function getScopedBeeHubs(data, scope = null, region = 'all') {
  const officeIds = getOfficeIdsForScope(data, scope);
  const cityIds = getCityIdsForScope(data, scope);

  return (data.beeHubs || [])
    .map((beeHub) => resolveBeeHubOwnershipInternal(beeHub, data))
    .filter((beeHub) => {
      const matchesRegion = region === 'all' || beeHub.region === region;
      const resolvedOfficeId = beeHub.resolvedOfficeId || null;
      const resolvedCityId = beeHub.resolvedOffice?.cityId || null;
      const matchesScope =
        !scope ||
        scope.mode === 'global' ||
        (scope.mode === 'city' && cityIds.has(resolvedCityId)) ||
        (scope.mode === 'office' && officeIds.has(resolvedOfficeId));

      return matchesRegion && matchesScope;
    });
}


function getSalesFilterState(data, filters = {}) {
  const country = String(filters.salesCountry || 'all');
  const cityQuery = String(filters.salesCityQuery || '').trim().toLowerCase();
  const salesCityId = String(filters.salesCityId || 'all');
  const salesOfficeId = String(filters.salesOfficeId || 'all');
  const salesRegion = String(filters.salesRegion || 'all');

  const records = (data.sales || []).map((sale) => normalizeSalesScopeRecord(sale, data));
  const selectedCity = salesCityId !== 'all' ? getCityById(data, salesCityId) : null;
  const selectedOffice = salesOfficeId !== 'all' ? getOfficeById(data, salesOfficeId) : null;

  const matchesCountry = (sale) => {
    const purchaserCity = sale.resolvedPurchaserCity || getCityById(data, sale.resolvedPurchaserCityId || sale.purchaserCityId);
    return country === 'all' || sale.resolvedCountry === country || purchaserCity?.country === country;
  };

  const matchesQuery = (sale) => {
    if (!cityQuery) return true;
    const purchaserCity = sale.resolvedPurchaserCity || getCityById(data, sale.resolvedPurchaserCityId || sale.purchaserCityId);
    return (purchaserCity?.name || sale.purchaserCity || '').toLowerCase().includes(cityQuery);
  };

  const matchesCity = (sale) => {
    if (salesCityId === 'all') return true;
    return (sale.resolvedPurchaserCityId || sale.purchaserCityId) === selectedCity?.id;
  };

  const matchesOffice = (sale) => {
    if (salesOfficeId === 'all') return true;
    return (sale.resolvedOfficeId || sale.officeId) === selectedOffice?.id;
  };

  const matchesRegion = (sale) => salesRegion === 'all' || sale.resolvedRegion === salesRegion || sale.purchaserRegion === salesRegion;

  const filteredRecords = records.filter((sale) => matchesCountry(sale) && matchesQuery(sale) && matchesCity(sale) && matchesOffice(sale) && matchesRegion(sale));

  const cityCandidates = [];
  const citySeen = new Set();
  for (const sale of records) {
    if (!matchesCountry(sale) || !matchesQuery(sale) || !matchesRegion(sale)) continue;
    const cityId = sale.resolvedPurchaserCityId || sale.purchaserCityId;
    const city = sale.resolvedPurchaserCity || getCityById(data, cityId);
    if (!city || citySeen.has(city.id)) continue;
    citySeen.add(city.id);
    cityCandidates.push(city);
  }

  const officeCandidates = [];
  const officeSeen = new Set();
  for (const sale of records) {
    if (!matchesCountry(sale) || !matchesQuery(sale) || !matchesRegion(sale)) continue;
    if (salesCityId !== 'all' && !matchesCity(sale)) continue;
    const officeId = sale.resolvedOfficeId || sale.officeId;
    const office = sale.resolvedOffice || getOfficeById(data, officeId);
    if (!office || officeSeen.has(office.id)) continue;
    officeSeen.add(office.id);
    officeCandidates.push(office);
  }

  const cityIdSet = new Set(cityCandidates.map((city) => city.id));
  const officeIdSet = new Set(officeCandidates.map((office) => office.id));

  return {
    country,
    cityQuery,
    salesCityId,
    salesOfficeId,
    salesRegion,
    cityCandidates,
    cityIdSet,
    officeCandidates,
    officeIdSet,
    filteredRecords,
  };
}

function getFilteredSalesRecords(data, filters = {}) {
  return getSalesFilterState(data, filters).filteredRecords;
}

function aggregateSalesByRegionFromRecords(records) {
  const groups = new Map();

  for (const sale of records) {
    const region = sale.purchaserRegion || 'Unassigned';
    if (!groups.has(region)) {
      groups.set(region, { region, records: 0, deals: 0, amount: 0 });
    }

    const group = groups.get(region);
    group.records += 1;
    group.deals += Number(sale.dealCount || 1);
    group.amount += Number(sale.amount || 0);
  }

  return [...groups.values()].sort((a, b) => b.deals - a.deals || a.region.localeCompare(b.region));
}

function aggregateSalesByCityFromRecords(records, data) {
  const groups = new Map();

  for (const sale of records) {
    const city = sale.resolvedPurchaserCity || getCityById(data, sale.resolvedPurchaserCityId || sale.purchaserCityId);
    if (!city) continue;
    const key = city.id;
    if (!groups.has(key)) {
      groups.set(key, {
        city,
        records: 0,
        deals: 0,
        amount: 0,
        regions: new Set(),
        offices: new Set(),
      });
    }

    const group = groups.get(key);
    group.records += 1;
    group.deals += Number(sale.dealCount || 1);
    group.amount += Number(sale.amount || 0);
    group.regions.add(sale.resolvedRegion || sale.purchaserRegion || 'Unassigned');
    if (sale.resolvedOfficeId || sale.officeId) {
      group.offices.add(sale.resolvedOfficeId || sale.officeId);
    }
  }

  return [...groups.values()]
    .map((group) => ({
      city: group.city,
      cityId: group.city.id,
      cityName: group.city.name,
      country: group.city.country,
      region: group.city.region || 'Unassigned',
      records: group.records,
      deals: group.deals,
      salesTotal: group.amount,
      regionCount: group.regions.size,
      officeCount: group.offices.size,
    }))
    .sort((a, b) => b.salesTotal - a.salesTotal || a.cityName.localeCompare(b.cityName));
}

function aggregateSalesByOfficeFromRecords(records, data) {
  const groups = new Map();

  for (const sale of records) {
    const office = sale.resolvedOffice || getOfficeById(data, sale.resolvedOfficeId || sale.officeId);
    if (!office) continue;
    const city = getCityById(data, office.cityId);
    if (!groups.has(office.id)) {
      groups.set(office.id, {
        office,
        city,
        records: 0,
        deals: 0,
        amount: 0,
        regions: new Set(),
      });
    }

    const group = groups.get(office.id);
    group.records += 1;
    group.deals += Number(sale.dealCount || 1);
    group.amount += Number(sale.amount || 0);
    group.regions.add(sale.purchaserRegion || 'Unassigned');
  }

  return [...groups.values()]
    .map((group) => ({
      office: group.office,
      city: group.city,
      records: group.records,
      deals: group.deals,
      salesTotal: group.amount,
      regionCount: group.regions.size,
    }))
    .sort((a, b) => b.salesTotal - a.salesTotal || a.office.name.localeCompare(b.office.name));
}

function getSalesHeatPointsFromRecords(records) {
  return records
    .filter((sale) => Number.isFinite(Number(sale.purchaserLat)) && Number.isFinite(Number(sale.purchaserLng)))
    .map((sale) => ({
      lat: Number(sale.purchaserLat),
      lng: Number(sale.purchaserLng),
      weight: Number(sale.dealCount || 1),
      region: sale.purchaserRegion || 'Unassigned',
    }));
}

function buildSalesDetailsFromCity(data, city, records) {
  const cityRecords = records.filter((sale) => sale.resolvedPurchaserCityId === city.id || sale.purchaserCityId === city.id);
  const officeSummary = aggregateSalesByOfficeFromRecords(cityRecords, data);
  const regionSummary = aggregateSalesByRegionFromRecords(cityRecords);
  const deals = cityRecords.reduce((total, sale) => total + Number(sale.dealCount || 1), 0);
  const salesTotal = cityRecords.reduce((total, sale) => total + Number(sale.amount || 0), 0);

  return {
    city,
    records: cityRecords.length,
    deals,
    salesTotal,
    offices: officeSummary,
    regions: regionSummary,
    officeCount: officeSummary.length,
    regionCount: regionSummary.length,
    heatPoints: getSalesHeatPointsFromRecords(cityRecords),
  };
}

function buildSalesDetailsFromOffice(data, office, records) {
  const officeRecords = records.filter((sale) => (sale.resolvedOfficeId || sale.officeId) === office.id);
  const city = getCityById(data, office.cityId);
  const regionSummary = aggregateSalesByRegionFromRecords(officeRecords);
  const deals = officeRecords.reduce((total, sale) => total + Number(sale.dealCount || 1), 0);
  const salesTotal = officeRecords.reduce((total, sale) => total + Number(sale.amount || 0), 0);

  return {
    office,
    city,
    records: officeRecords.length,
    deals,
    salesTotal,
    regions: regionSummary,
    regionCount: regionSummary.length,
    heatPoints: getSalesHeatPointsFromRecords(officeRecords),
  };
}

export function buildSalesLayerContext(data, filters = {}) {
  const state = getSalesFilterState(data, filters);
  const records = state.filteredRecords;
  const heatPoints = getSalesHeatPointsFromRecords(records);
  const selectedCity = state.salesCityId !== 'all' ? getCityById(data, state.salesCityId) : null;
  const selectedOffice = state.salesOfficeId !== 'all' ? getOfficeById(data, state.salesOfficeId) : null;

  const countries = uniqueValues((data.cities || []).map((city) => city.country || 'Unassigned'));

  const cityListRecords = (data.sales || []).map((sale) => normalizeSalesScopeRecord(sale, data)).filter((sale) => {
    const purchaserCity = sale.resolvedPurchaserCity || getCityById(data, sale.resolvedPurchaserCityId || sale.purchaserCityId);
    const matchesCountry = state.country === 'all' || sale.resolvedCountry === state.country || purchaserCity?.country === state.country;
    const matchesQuery = !state.cityQuery || (purchaserCity?.name || sale.purchaserCity || '').toLowerCase().includes(state.cityQuery);
    const matchesRegion = state.salesRegion === 'all' || sale.resolvedRegion === state.salesRegion || sale.purchaserRegion === state.salesRegion;
    return matchesCountry && matchesQuery && matchesRegion;
  });

  const officeListRecords = (data.sales || []).map((sale) => normalizeSalesScopeRecord(sale, data)).filter((sale) => {
    const purchaserCity = sale.resolvedPurchaserCity || getCityById(data, sale.resolvedPurchaserCityId || sale.purchaserCityId);
    const matchesCountry = state.country === 'all' || sale.resolvedCountry === state.country || purchaserCity?.country === state.country;
    const matchesRegion = state.salesRegion === 'all' || sale.resolvedRegion === state.salesRegion || sale.purchaserRegion === state.salesRegion;
    const matchesCity = state.salesCityId === 'all' || (sale.resolvedPurchaserCityId || sale.purchaserCityId) === selectedCity?.id;
    return matchesCountry && matchesRegion && matchesCity;
  });

  const regionListRecords = (data.sales || []).map((sale) => normalizeSalesScopeRecord(sale, data)).filter((sale) => {
    const purchaserCity = sale.resolvedPurchaserCity || getCityById(data, sale.resolvedPurchaserCityId || sale.purchaserCityId);
    const matchesCountry = state.country === 'all' || sale.resolvedCountry === state.country || purchaserCity?.country === state.country;
    const matchesQuery = !state.cityQuery || (purchaserCity?.name || sale.purchaserCity || '').toLowerCase().includes(state.cityQuery);
    const matchesCity = state.salesCityId === 'all' || (sale.resolvedPurchaserCityId || sale.purchaserCityId) === selectedCity?.id;
    const matchesOffice = state.salesOfficeId === 'all' || (sale.resolvedOfficeId || sale.officeId) === selectedOffice?.id;
    return matchesCountry && matchesQuery && matchesCity && matchesOffice;
  });

  const citySummary = aggregateSalesByCityFromRecords(cityListRecords, data);
  const officeSummary = aggregateSalesByOfficeFromRecords(officeListRecords, data);
  const regionSummary = aggregateSalesByRegionFromRecords(regionListRecords);

  const selectedCityDetails = selectedCity ? buildSalesDetailsFromCity(data, selectedCity, records) : null;
  const selectedOfficeDetails = selectedOffice ? buildSalesDetailsFromOffice(data, selectedOffice, records) : null;

  return {
    countries,
    cityQuery: state.cityQuery,
    selectedCountry: state.country,
    selectedCityId: state.salesCityId,
    selectedOfficeId: state.salesOfficeId,
    selectedRegion: state.salesRegion,
    cities: state.cityCandidates,
    offices: state.officeCandidates,
    records,
    heatPoints,
    overview: {
      records: records.length,
      cities: new Set(records.map((sale) => sale.resolvedPurchaserCityId || sale.purchaserCityId).filter(Boolean)).size,
      offices: new Set(records.map((sale) => sale.resolvedOfficeId || sale.officeId).filter(Boolean)).size,
      regions: regionSummary.length,
      deals: records.reduce((total, sale) => total + Number(sale.dealCount || 1), 0),
      salesTotal: records.reduce((total, sale) => total + Number(sale.amount || 0), 0),
      heatPoints: heatPoints.length,
    },
    regionSummary,
    citySummary,
    officeSummary,
    selectedCity,
    selectedOffice,
    selectedCityDetails,
    selectedOfficeDetails,
  };
}

export function getBeeHubsForCity(data, cityId, region = 'all') {
  return getScopedBeeHubs(data, { mode: 'city', city: { id: cityId } }, region);
}

export function getBeeHubsForCities(data, cityIds = [], region = 'all') {
  const cityIdSet = cityIds instanceof Set ? cityIds : new Set(cityIds || []);

  return (data.beeHubs || [])
    .map((beeHub) => resolveBeeHubOwnershipInternal(beeHub, data))
    .filter((beeHub) => {
      const matchesRegion = region === 'all' || beeHub.region === region;
      const resolvedCityId = beeHub.resolvedCity?.id || beeHub.cityId || null;
      return matchesRegion && cityIdSet.has(resolvedCityId);
    });
}

export function getScopeContext(data, selectedCityId = null, selectedOfficeId = null) {
  const office = selectedOfficeId ? getOfficeById(data, selectedOfficeId) : null;
  const city = office
    ? getCityById(data, office.cityId)
    : selectedCityId
      ? getCityById(data, selectedCityId)
      : null;

  if (office) {
    const officeCity = city || getCityById(data, office.cityId);
    return {
      mode: 'office',
      city: officeCity,
      office,
      cityIds: getCityIdsForScope(data, { mode: 'office', office }),
      officeIds: getOfficeIdsForScope(data, { mode: 'office', office }),
      label: `${office.officeType === 'regional' ? 'Regional office' : 'Sub-regional office'} scope`,
      subtitle: `${office.name}${officeCity ? ` · ${officeCity.name}` : ''}`,
      scopeName: office.name,
    };
  }

  if (city) {
    return {
      mode: 'city',
      city,
      office: null,
      cityIds: getCityIdsForScope(data, { mode: 'city', city }),
      officeIds: getOfficeIdsForScope(data, { mode: 'city', city }),
      label: 'City scope',
      subtitle: `${city.name} · ${city.country} · ${city.region || 'Unassigned'}`,
      scopeName: city.name,
    };
  }

  return {
    mode: 'global',
    city: null,
    office: null,
    cityIds: getCityIdsForScope(data, null),
    officeIds: getOfficeIdsForScope(data, null),
    label: 'Global view',
    subtitle: 'All cities and offices',
    scopeName: 'Global',
  };
}

export function uniqueCountries(cities) {
  return uniqueValues(cities.map((city) => city.country));
}

export function uniqueCountriesFromBeeHubs(data) {
  const beeHubs = data.beeHubs || [];
  const countries = new Set();
  
  beeHubs.forEach((beeHub) => {
    const city = getCityById(data, beeHub.cityId) || beeHub.resolvedCity;
    if (city?.country) {
      countries.add(city.country);
    }
  });
  
  return Array.from(countries).sort((a, b) => String(a).localeCompare(String(b)));
}

export function uniqueRegions(items, accessor = 'region') {
  return uniqueValues(items.map((item) => item?.[accessor]));
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

export function getRegionalOfficeForCityId(data, cityId) {
  return getRegionalOfficeForCity(data, cityId);
}

export function getSubRegionalOfficesForOfficeId(data, officeId) {
  return getSubRegionalOfficesForOffice(data, officeId);
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

export function getIncidentsForBeeHub(data, beeHubId) {
  const beeHub = data.beeHubs?.find((item) => item.id === beeHubId);
  if (!beeHub) return [];
  const officeId = beeHub.officeId || beeHub.subRegionalOfficeId || beeHub.regionalOfficeId || null;
  return data.incidents.filter((incident) => 
    incident.beeHubId === beeHubId || (officeId && incident.officeId === officeId)
  );
}

export function getSalesForBeeHub(data, beeHubId) {
  const beeHub = data.beeHubs?.find((item) => item.id === beeHubId);
  if (!beeHub) return [];
  const officeId = beeHub.officeId || beeHub.subRegionalOfficeId || beeHub.regionalOfficeId || null;
  return data.sales.filter((item) => 
    item.beeHubId === beeHubId || (officeId && item.officeId === officeId)
  );
}

export function buildBeeHubMetrics(data, beeHubId) {
  const beeHub = data.beeHubs?.find((item) => item.id === beeHubId) || null;
  const incidents = getIncidentsForBeeHub(data, beeHubId);
  const sales = getSalesForBeeHub(data, beeHubId);

  return {
    beeHub,
    incidents,
    sales,
    incidentCount: incidents.length,
    salesTotal: sum(sales.map((item) => item.amount)),
  };
}

export function resolveBeeHubOwnership(beeHub, data) {
  return resolveBeeHubOwnershipInternal(beeHub, data);
}

export function getBeeHubsForRegion(data, region = 'all') {
  return getScopedBeeHubs(data, null, region);
}

export function getBeeHubsForScope(data, scope = null, region = 'all') {
  return getScopedBeeHubs(data, scope, region);
}

export function getSalesRecordsForScope(data, scope = null, region = 'all') {
  return getScopedSalesRecords(data, scope, region);
}

export function getSubjectsForScope(data, scope = null, period = 'all') {
  return getScopedSubjects(data, scope, period);
}

export function buildBeeHubOverview(data, beeHubs = []) {
  const resolved = beeHubs.length ? beeHubs : getBeeHubsForRegion(data);
  const regions = uniqueRegions(resolved);
  const subRegionalRollups = resolved.filter((beeHub) => beeHub.resolvedOwnership === 'sub-regional').length;

  return {
    beeHubCount: resolved.length,
    regionCount: regions.length,
    subRegionalRollups,
    regionalRollups: resolved.filter((beeHub) => beeHub.resolvedOwnership === 'regional').length,
  };
}

export function aggregateSalesByRegion(data, region = 'all') {
  return aggregateSalesByRegionForScope(data, null, region);
}

export function aggregateSalesByRegionForScope(data, scope = null, region = 'all') {
  const records = getScopedSalesRecords(data, scope, region);
  const groups = new Map();

  for (const sale of records) {
    const groupRegion = sale.purchaserRegion || 'Unassigned';
    if (!groups.has(groupRegion)) {
      groups.set(groupRegion, {
        region: groupRegion,
        records: 0,
        deals: 0,
        amountByCurrency: {},
        latSum: 0,
        lngSum: 0,
        weight: 0,
      });
    }

    const group = groups.get(groupRegion);
    const dealWeight = Number(sale.dealCount || 1);
    const lat = Number(sale.purchaserLat);
    const lng = Number(sale.purchaserLng);

    group.records += 1;
    group.deals += dealWeight;
    group.amountByCurrency[sale.currency || 'USD'] = (group.amountByCurrency[sale.currency || 'USD'] || 0) + Number(sale.amount || 0);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      group.latSum += lat * dealWeight;
      group.lngSum += lng * dealWeight;
      group.weight += dealWeight;
    }
  }

  return [...groups.values()]
    .map((group) => ({
      region: group.region,
      records: group.records,
      deals: group.deals,
      amountByCurrency: group.amountByCurrency,
      lat: group.weight ? group.latSum / group.weight : 0,
      lng: group.weight ? group.lngSum / group.weight : 0,
      weight: group.deals || group.records || 1,
    }))
    .sort((a, b) => b.deals - a.deals || a.region.localeCompare(b.region));
}

export function getSalesHeatPoints(data, region = 'all') {
  return getSalesHeatPointsForScope(data, null, region);
}

export function getSalesHeatPointsForScope(data, scope = null, region = 'all') {
  return aggregateSalesByRegionForScope(data, scope, region).map((group) => ({
    lat: group.lat,
    lng: group.lng,
    weight: group.weight,
    region: group.region,
  }));
}

export function buildSalesOverview(data, region = 'all') {
  return buildSalesOverviewForScope(data, null, region);
}

export function buildSalesOverviewForScope(data, scope = null, region = 'all') {
  const summary = aggregateSalesByRegionForScope(data, scope, region);
  const totalDeals = summary.reduce((total, item) => total + item.deals, 0);
  const totalRecords = summary.reduce((total, item) => total + item.records, 0);

  return {
    records: totalRecords,
    regions: summary.length,
    deals: totalDeals,
    summary,
  };
}

export function getSubjectPeriods(subjects = []) {
  return uniqueValues(subjects.map((subject) => String(subject.verifiedAt || '').slice(0, 7))).reverse();
}

export function getSubjectHeatPoints(data, period = 'all') {
  return getSubjectHeatPointsForScope(data, null, period);
}

export function getSubjectHeatPointsForScope(data, scope = null, period = 'all') {
  return getScopedSubjects(data, scope, period).map((subject) => ({
    lat: Number(subject.lat),
    lng: Number(subject.lng),
    weight: Number(subject.weight || 1),
    region: subject.region || 'Unassigned',
  }));
}

export function buildSubjectTimeline(subjects = []) {
  return buildSubjectTimelineForScope({ subjects }, null);
}

export function buildSubjectTimelineForScope(data, scope = null) {
  const groups = new Map();
  const subjects = getScopedSubjects(data, scope, 'all');

  for (const subject of subjects) {
    const period = String(subject.verifiedAt || '').slice(0, 7) || 'Unknown';
    groups.set(period, (groups.get(period) || 0) + 1);
  }

  return [...groups.entries()]
    .map(([period, count]) => ({ period, count }))
    .sort((a, b) => (a.period < b.period ? -1 : 1));
}

export function buildSubjectOverview(data, period = 'all') {
  return buildSubjectOverviewForScope(data, null, period);
}

export function buildSubjectOverviewForScope(data, scope = null, period = 'all') {
  const filtered = getScopedSubjects(data, scope, period);
  const regions = uniqueRegions(filtered);
  const points = getSubjectHeatPointsForScope(data, scope, period);

  return {
    records: filtered.length,
    regions: regions.length,
    heatPoints: points.length,
    latestPeriod: getSubjectPeriods(getScopedSubjects(data, scope, 'all'))[0] || '—',
    summary: filtered.reduce((acc, subject) => {
      const key = subject.region || 'Unassigned';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
  };
}

export function getCitiesOverviewMetrics(data, cityScope) {
  const cityIds = new Set(getCityIds(cityScope));
  const officeIds = new Set(getOfficeIdsForCities(data, cityIds));
  const offices = data.offices.filter((office) => cityIds.has(office.cityId));
  const incidents = data.incidents.filter((incident) => cityIds.has(incident.cityId) || officeIds.has(incident.officeId));
  const sales = data.sales.filter((sale) => cityIds.has(sale.cityId) || officeIds.has(sale.officeId) || officeIds.has(sale.serviceOfficeId));
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

export function formatMonthLabel(value) {
  return formatMonth(value);
}

function getSubjectFilterState(data, filters = {}) {
  const country = String(filters.subjectCountry || 'all');
  const cityQuery = String(filters.subjectCityQuery || '').trim().toLowerCase();
  const subjectCityId = String(filters.subjectCityId || 'all');
  const subjectOfficeId = String(filters.subjectOfficeId || 'all');
  const subjectRegion = String(filters.subjectRegion || 'all');

  const records = (data.subjects || []).map((subject) => subject);
  const selectedCity = subjectCityId !== 'all' ? getCityById(data, subjectCityId) : null;
  const selectedOffice = subjectOfficeId !== 'all' ? getOfficeById(data, subjectOfficeId) : null;

  const matchesCountry = (subject) => {
    const city = getCityById(data, subject.cityId);
    return country === 'all' || city?.country === country;
  };

  const matchesQuery = (subject) => {
    if (!cityQuery) return true;
    const city = getCityById(data, subject.cityId);
    return (city?.name || '').toLowerCase().includes(cityQuery);
  };

  const matchesCity = (subject) => {
    if (subjectCityId === 'all') return true;
    return subject.cityId === selectedCity?.id;
  };

  const matchesOffice = (subject) => {
    if (subjectOfficeId === 'all') return true;
    return subject.officeId === selectedOffice?.id;
  };

  const matchesRegion = (subject) => subjectRegion === 'all' || subject.region === subjectRegion;

  const filteredRecords = records.filter((subject) => matchesCountry(subject) && matchesQuery(subject) && matchesCity(subject) && matchesOffice(subject) && matchesRegion(subject));

  const cityCandidates = [];
  const citySeen = new Set();
  for (const subject of records) {
    if (!matchesCountry(subject) || !matchesQuery(subject) || !matchesRegion(subject)) continue;
    const city = getCityById(data, subject.cityId);
    if (!city || citySeen.has(city.id)) continue;
    citySeen.add(city.id);
    cityCandidates.push(city);
  }

  const officeCandidates = [];
  const officeSeen = new Set();
  for (const subject of records) {
    if (!matchesCountry(subject) || !matchesQuery(subject) || !matchesRegion(subject)) continue;
    if (subjectCityId !== 'all' && !matchesCity(subject)) continue;
    const office = subject.officeId ? getOfficeById(data, subject.officeId) : null;
    if (!office || officeSeen.has(office.id)) continue;
    officeSeen.add(office.id);
    officeCandidates.push(office);
  }

  const cityIdSet = new Set(cityCandidates.map((city) => city.id));
  const officeIdSet = new Set(officeCandidates.map((office) => office.id));

  return {
    country,
    cityQuery,
    subjectCityId,
    subjectOfficeId,
    subjectRegion,
    cityCandidates,
    cityIdSet,
    officeCandidates,
    officeIdSet,
    filteredRecords,
    selectedCity,
    selectedOffice,
  };
}

function aggregateSubjectsByRegionFromRecords(records) {
  const groups = new Map();

  for (const subject of records) {
    const region = subject.region || 'Unassigned';
    if (!groups.has(region)) {
      groups.set(region, { region, count: 0 });
    }

    const group = groups.get(region);
    group.count += 1;
  }

  return [...groups.values()].sort((a, b) => b.count - a.count || a.region.localeCompare(b.region));
}

function aggregateSubjectsByCityFromRecords(records, data) {
  const groups = new Map();

  for (const subject of records) {
    const city = getCityById(data, subject.cityId);
    if (!city) continue;
    const key = city.id;
    if (!groups.has(key)) {
      groups.set(key, {
        city,
        count: 0,
        regions: new Set(),
        offices: new Set(),
      });
    }

    const group = groups.get(key);
    group.count += 1;
    group.regions.add(subject.region || 'Unassigned');
    if (subject.officeId) {
      group.offices.add(subject.officeId);
    }
  }

  return [...groups.values()]
    .map((group) => ({
      city: group.city,
      cityId: group.city.id,
      cityName: group.city.name,
      country: group.city.country,
      region: group.city.region || 'Unassigned',
      count: group.count,
      regionCount: group.regions.size,
      officeCount: group.offices.size,
    }))
    .sort((a, b) => b.count - a.count || a.cityName.localeCompare(b.cityName));
}

function aggregateSubjectsByOfficeFromRecords(records, data) {
  const groups = new Map();

  for (const subject of records) {
    const office = subject.officeId ? getOfficeById(data, subject.officeId) : null;
    if (!office) continue;
    const city = getCityById(data, office.cityId);
    if (!groups.has(office.id)) {
      groups.set(office.id, {
        office,
        city,
        count: 0,
        regions: new Set(),
      });
    }

    const group = groups.get(office.id);
    group.count += 1;
    group.regions.add(subject.region || 'Unassigned');
  }

  return [...groups.values()]
    .map((group) => ({
      office: group.office,
      city: group.city,
      count: group.count,
      regionCount: group.regions.size,
    }))
    .sort((a, b) => b.count - a.count || a.office.name.localeCompare(b.office.name));
}

function buildSubjectDetailsFromCity(data, city, records) {
  const cityRecords = records.filter((subject) => subject.cityId === city.id);
  const officeSummary = aggregateSubjectsByOfficeFromRecords(cityRecords, data);
  const regionSummary = aggregateSubjectsByRegionFromRecords(cityRecords);

  return {
    city,
    count: cityRecords.length,
    offices: officeSummary,
    regions: regionSummary,
    officeCount: officeSummary.length,
    regionCount: regionSummary.length,
  };
}

function buildSubjectDetailsFromOffice(data, office, records) {
  const officeRecords = records.filter((subject) => subject.officeId === office.id);
  const city = getCityById(data, office.cityId);
  const regionSummary = aggregateSubjectsByRegionFromRecords(officeRecords);

  return {
    office,
    city,
    count: officeRecords.length,
    regions: regionSummary,
    regionCount: regionSummary.length,
  };
}

export function buildSubjectLayerContext(data, filters = {}) {
  const state = getSubjectFilterState(data, filters);
  const records = state.filteredRecords;
  
  // Calculate heat points from filtered records
  const heatPoints = records
    .filter((subject) => Number.isFinite(Number(subject.lat)) && Number.isFinite(Number(subject.lng)))
    .map((subject) => ({
      lat: Number(subject.lat),
      lng: Number(subject.lng),
      weight: 1,
      region: subject.region || 'Unassigned',
    }));
  
  const selectedCity = state.selectedCity;
  const selectedOffice = state.selectedOffice;

  const countries = uniqueValues((data.cities || []).map((city) => city.country || 'Unassigned'));

  const cityListRecords = (data.subjects || []).filter((subject) => {
    const city = getCityById(data, subject.cityId);
    const matchesCountry = state.country === 'all' || city?.country === state.country;
    const matchesQuery = !state.cityQuery || (city?.name || '').toLowerCase().includes(state.cityQuery);
    const matchesRegion = state.subjectRegion === 'all' || subject.region === state.subjectRegion;
    return matchesCountry && matchesQuery && matchesRegion;
  });

  const officeListRecords = (data.subjects || []).filter((subject) => {
    const city = getCityById(data, subject.cityId);
    const matchesCountry = state.country === 'all' || city?.country === state.country;
    const matchesRegion = state.subjectRegion === 'all' || subject.region === state.subjectRegion;
    const matchesCity = state.subjectCityId === 'all' || subject.cityId === selectedCity?.id;
    return matchesCountry && matchesRegion && matchesCity;
  });

  const regionListRecords = (data.subjects || []).filter((subject) => {
    const city = getCityById(data, subject.cityId);
    const matchesCountry = state.country === 'all' || city?.country === state.country;
    const matchesQuery = !state.cityQuery || (city?.name || '').toLowerCase().includes(state.cityQuery);
    const matchesCity = state.subjectCityId === 'all' || subject.cityId === selectedCity?.id;
    const matchesOffice = state.subjectOfficeId === 'all' || subject.officeId === selectedOffice?.id;
    return matchesCountry && matchesQuery && matchesCity && matchesOffice;
  });

  const citySummary = aggregateSubjectsByCityFromRecords(cityListRecords, data);
  const officeSummary = aggregateSubjectsByOfficeFromRecords(officeListRecords, data);
  const regionSummary = aggregateSubjectsByRegionFromRecords(regionListRecords);

  const selectedCityDetails = selectedCity ? buildSubjectDetailsFromCity(data, selectedCity, records) : null;
  const selectedOfficeDetails = selectedOffice ? buildSubjectDetailsFromOffice(data, selectedOffice, records) : null;

  return {
    countries,
    cityQuery: state.cityQuery,
    selectedCountry: state.country,
    selectedCityId: state.subjectCityId,
    selectedOfficeId: state.subjectOfficeId,
    selectedRegion: state.subjectRegion,
    cities: state.cityCandidates,
    offices: state.officeCandidates,
    records,
    heatPoints,
    overview: {
      records: records.length,
      cities: new Set(records.map((subject) => subject.cityId).filter(Boolean)).size,
      offices: new Set(records.map((subject) => subject.officeId).filter(Boolean)).size,
      regions: regionSummary.length,
      heatPoints: heatPoints.length,
    },
    regionSummary,
    citySummary,
    officeSummary,
    selectedCity,
    selectedOffice,
    selectedCityDetails,
    selectedOfficeDetails,
  };
}

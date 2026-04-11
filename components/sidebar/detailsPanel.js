import { formatCurrency, formatDecimal, formatMonthLabel, formatNumber } from '../../services/filterService.js';

function renderMetricCard(label, value, subtitle = '') {
  return `
    <article class="metric-card">
      <span class="metric-label">${label}</span>
      <strong class="metric-value">${value}</strong>
      ${subtitle ? `<span class="metric-subtitle">${subtitle}</span>` : ''}
    </article>
  `;
}

function renderListItem(city, isSelected) {
  return `
    <button type="button" class="list-button ${isSelected ? 'active' : ''}" data-city-id="${city.id}">
      <div>
        <b>${city.name}</b>
        <span>${city.country} · ${formatNumber(city.population)} people</span>
      </div>
      <span>${city.region || ''}</span>
    </button>
  `;
}

function renderOfficeListItem(item, isSelected) {
  return `
    <button type="button" class="list-button ${isSelected ? 'active' : ''}" data-office-id="${item.office.id}">
      <div>
        <b>${item.office.name}</b>
        <span>${item.city?.name || '—'} · ${item.office.status || 'unknown'} · ${item.office.officeType || item.office.category || 'Office'}</span>
      </div>
      <span>${formatNumber(item.office.teamSize)} staff</span>
    </button>
  `;
}

function renderBeeHubListItem(item, isSelected) {
  return `
    <button type="button" class="list-button ${isSelected ? 'active' : ''}" data-beehub-id="${item.id}">
      <div>
        <b>${item.name}</b>
        <span>${(item.city || item.resolvedCity)?.name || '—'} · ${(item.city || item.resolvedCity)?.country || '—'} · ${item.resolvedOfficeName || 'Unassigned'}</span>
      </div>
      <span>${item.hoursOfOperation || item.hours || '—'}</span>
    </button>
  `;
}

function renderBeeHubListItemWithCount(city, beeHubCount, isSelected) {
  return `
    <button type="button" class="list-button ${isSelected ? 'active' : ''}" data-city-id="${city.id}">
      <div>
        <b>${city.name}</b>
        <span>${city.country} · ${beeHubCount} beeHub${beeHubCount !== 1 ? 's' : ''}</span>
      </div>
      <span>${city.region || ''}</span>
    </button>
  `;
}

function renderKpiCard(kpi) {
  const value = typeof kpi.value === 'number' ? formatDecimal(kpi.value, 1) : kpi.value;
  const meta = kpi.summary || kpi.period || `${kpi.entityType === 'city' ? 'City' : 'Office'} KPI`;
  return `
    <div class="list-row kpi-row">
      <div>
        <strong>${kpi.name}</strong>
        <span>${meta}</span>
      </div>
      <b>${value}</b>
    </div>
  `;
}

function renderRegionRow(region, primary, secondary = '') {
  return `
    <div class="list-row">
      <div>
        <strong>${region}</strong>
        <span>${secondary}</span>
      </div>
      <b>${primary}</b>
    </div>
  `;
}

function renderPeriodRow(period, count) {
  return `
    <div class="list-row">
      <div>
        <strong>${formatMonthLabel(period)}</strong>
        <span>${period}</span>
      </div>
      <b>${formatNumber(count)}</b>
    </div>
  `;
}

function renderScopeInfo(scopeLabel = '', scopeSubtitle = '') {
  if (!scopeLabel && !scopeSubtitle) {
    return '';
  }

  return `
    <section class="panel-section">
      <h3>Current scope</h3>
      <div class="key-value"><span>View</span><b>${scopeLabel || 'Global view'}</b></div>
      ${scopeSubtitle ? `<div class="key-value"><span>Details</span><b>${scopeSubtitle}</b></div>` : ''}
    </section>
  `;
}

function bindCityFilters(root, callbacks = {}) {
  const citySearch = root.querySelector('#citySearch');
  const countryFilter = root.querySelector('#countryFilter');

  if (citySearch) {
    citySearch.addEventListener('input', (event) => {
      callbacks.onCityQueryChange?.(event.target.value);
    });
  }

  if (countryFilter) {
    countryFilter.addEventListener('change', (event) => {
      callbacks.onCountryChange?.(event.target.value);
    });
  }
}

function bindSelect(root, selector, handler) {
  const node = root.querySelector(selector);
  if (!node) return;
  node.addEventListener('change', (event) => handler?.(event.target.value));
}

function attachCityEvents(root, callbacks = {}) {
  root.querySelectorAll('[data-city-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const cityId = button.dataset.cityId;
      const city = callbacks.cities?.find((item) => item.id === cityId);
      if (city) callbacks.onCitySelect?.(city);
    });
  });
}

export function createDetailsPanel(root) {
  function renderOverview({ overview, cities, countries, filters, visibleCities, visibleKpis, onCitySelect, onCityQueryChange, onCountryChange }) {
    root.innerHTML = `
      <div class="panel-head">
        <p class="eyebrow">City overview</p>
        <h2>How to use it</h2>
        <p class="muted">Use the city search and country filter, then click any city name or marker to drill down.</p>
      </div>

      <section class="filter-panel">
        <div class="field-group">
          <label for="citySearch">Search city</label>
          <input id="citySearch" type="search" placeholder="Type a city name" value="${filters.cityQuery || ''}" />
        </div>
        <div class="field-group">
          <label for="countryFilter">Country</label>
          <select id="countryFilter">
            <option value="all">All countries</option>
            ${countries.map((country) => `<option value="${country}" ${filters.country === country ? 'selected' : ''}>${country}</option>`).join('')}
          </select>
        </div>
      </section>

      <div class="metric-grid">
        ${renderMetricCard('Cities', formatNumber(overview.cityCount))}
        ${renderMetricCard('Offices', formatNumber(overview.officeCount))}
        ${renderMetricCard('Incidents', formatNumber(overview.incidentCount))}
        ${renderMetricCard('Sales', formatCurrency(overview.salesTotal))}
      </div>

      <section class="panel-section">
        <h3>City list</h3>
        <div class="scroll-box city-scroll">
          ${visibleCities.length ? visibleCities.map((city) => renderListItem(city, false)).join('') : '<div class="empty-state">No cities match the current filters.</div>'}
        </div>
      </section>

      <section class="panel-section">
        <h3>KPIs</h3>
        <div class="scroll-box kpi-scroll">
          ${visibleKpis.length ? visibleKpis.map(renderKpiCard).join('') : '<div class="empty-state">No KPI records available.</div>'}
        </div>
      </section>
    `;

    bindCityFilters(root, { onCityQueryChange, onCountryChange });
    attachCityEvents(root, { cities, onCitySelect });
  }

  function renderCity({ city, metrics, cities, countries, filters, visibleCities, visibleKpis, onCitySelect, onOfficeClick, onCityQueryChange, onCountryChange }) {
    root.innerHTML = `
      <div class="panel-head">
        <p class="eyebrow">City drill-down</p>
        <h2>${city.name}</h2>
        <p class="muted">${city.country} · Population ${formatNumber(city.population)} · ${city.region || '—'}</p>
      </div>

      <section class="filter-panel">
        <div class="field-group">
          <label for="citySearch">Search city</label>
          <input id="citySearch" type="search" placeholder="Type a city name" value="${filters.cityQuery || ''}" />
        </div>
        <div class="field-group">
          <label for="countryFilter">Country</label>
          <select id="countryFilter">
            <option value="all">All countries</option>
            ${countries.map((country) => `<option value="${country}" ${filters.country === country ? 'selected' : ''}>${country}</option>`).join('')}
          </select>
        </div>
      </section>

      <div class="metric-grid">
        ${renderMetricCard('Offices', formatNumber(metrics.officeCount))}
        ${renderMetricCard('Incidents', formatNumber(metrics.incidentCount))}
        ${renderMetricCard('Sales', formatCurrency(metrics.salesTotal))}
        ${renderMetricCard('KPIs', formatNumber(metrics.kpiCount))}
      </div>

      <section class="panel-section">
        <h3>Office list</h3>
        <div class="scroll-box city-scroll">
          ${metrics.offices.length ? metrics.offices.map((office) => `
            <button type="button" class="list-button" data-office-id="${office.id}">
              <div>
                <b>${office.name}</b>
                <span>${office.category || 'Office'} · ${office.status || 'unknown'}</span>
              </div>
              <span>${office.teamSize || 0} staff</span>
            </button>
          `).join('') : '<div class="empty-state">No offices available for this city.</div>'}
        </div>
      </section>

      <section class="panel-section">
        <h3>City list</h3>
        <div class="scroll-box city-scroll">
          ${visibleCities.length ? visibleCities.map((item) => renderListItem(item, item.id === city.id)).join('') : '<div class="empty-state">No cities match the current filters.</div>'}
        </div>
      </section>

      <section class="panel-section">
        <h3>KPIs</h3>
        <div class="scroll-box kpi-scroll">
          ${visibleKpis.length ? visibleKpis.map(renderKpiCard).join('') : '<div class="empty-state">No KPI records available.</div>'}
        </div>
      </section>
    `;

    bindCityFilters(root, { onCityQueryChange, onCountryChange });
    attachCityEvents(root, { cities, onCitySelect });
    root.querySelectorAll('[data-office-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const office = metrics.offices.find((item) => item.id === button.dataset.officeId);
        if (office) onOfficeClick?.(office);
      });
    });
  }

  function renderOffice({ office, city, metrics, onBack, backLabel = 'Back' }) {
    root.innerHTML = `
      <div class="panel-head">
        <p class="eyebrow">Office drill-down</p>
        <h2>${office.name}</h2>
        <p class="muted">${city ? `${city.name} · ` : ''}${office.officeType || office.category || 'Office'} · ${office.status || 'unknown'}</p>
      </div>

      <div class="metric-grid">
        ${renderMetricCard('Incidents', formatNumber(metrics.incidentCount))}
        ${renderMetricCard('Sales', formatCurrency(metrics.salesTotal))}
        ${renderMetricCard('KPIs', formatNumber(metrics.kpiCount))}
        ${renderMetricCard('Team size', formatNumber(office.teamSize))}
      </div>

      <section class="panel-section">
        <h3>Office details</h3>
        <div class="key-value"><span>Address</span><b>${office.address || '—'}</b></div>
        <div class="key-value"><span>Office type</span><b>${office.officeType || '—'}</b></div>
        <div class="key-value"><span>Parent office</span><b>${office.parentOfficeId || '—'}</b></div>
        <div class="key-value"><span>Category</span><b>${office.category || '—'}</b></div>
        <div class="key-value"><span>Status</span><b>${office.status || '—'}</b></div>
        <div class="key-value"><span>City</span><b>${city?.name || '—'}</b></div>
      </section>

      <section class="panel-section">
        <h3>KPI snapshot</h3>
        <div class="scroll-box kpi-scroll">
          ${metrics.kpis.length ? metrics.kpis.map(renderKpiCard).join('') : '<div class="empty-state">No KPI records available for this office.</div>'}
        </div>
      </section>

      ${onBack ? `<button id="backBtn" class="btn btn-secondary btn-full">${backLabel}</button>` : ''}
    `;

    if (onBack) {
      root.querySelector('#backBtn')?.addEventListener('click', onBack);
    }
  }

  function renderOfficeDirectory({ overview, cities, countries, filters, offices, visibleCities, selectedCityId, selectedOfficeId, onCitySelect, onCityQueryChange, onCountryChange, onOfficeClick }) {
    const selected = selectedOfficeId ? offices.find((item) => item.office.id === selectedOfficeId) : null;

    root.innerHTML = `
      <div class="panel-head">
        <p class="eyebrow">Office layer</p>
        <h2>Office directory</h2>
        <p class="muted">Regional and sub-regional offices live inside the city hierarchy. Click any office to open its details here.</p>
      </div>

      <section class="filter-panel">
        <div class="field-group">
          <label for="citySearch">Search city</label>
          <input id="citySearch" type="search" placeholder="Type a city name" value="${filters.cityQuery || ''}" />
        </div>
        <div class="field-group">
          <label for="countryFilter">Country</label>
          <select id="countryFilter">
            <option value="all">All countries</option>
            ${countries.map((country) => `<option value="${country}" ${filters.country === country ? 'selected' : ''}>${country}</option>`).join('')}
          </select>
        </div>
      </section>

      <div class="metric-grid">
        ${renderMetricCard('Cities', formatNumber(overview.cityCount))}
        ${renderMetricCard('Offices', formatNumber(overview.officeCount))}
        ${renderMetricCard('Incidents', formatNumber(overview.incidentCount))}
        ${renderMetricCard('Sales', formatCurrency(overview.salesTotal))}
      </div>

      ${selected ? `
      <section class="panel-section">
        <h3>Selected office</h3>
        <div class="key-value"><span>Name</span><b>${selected.office.name}</b></div>
        <div class="key-value"><span>City</span><b>${selected.city?.name || '—'}</b></div>
        <div class="key-value"><span>Country</span><b>${selected.city?.country || '—'}</b></div>
        <div class="key-value"><span>Status</span><b>${selected.office.status || '—'}</b></div>
        <div class="key-value"><span>Office type</span><b>${selected.office.officeType || '—'}</b></div>
        <div class="key-value"><span>Parent office</span><b>${selected.office.parentOfficeId || '—'}</b></div>
        <div class="key-value"><span>Category</span><b>${selected.office.category || '—'}</b></div>
        <div class="key-value"><span>Address</span><b>${selected.office.address || '—'}</b></div>
        <div class="key-value"><span>Phone</span><b>${selected.office.phone || '—'}</b></div>
        <div class="metric-grid metric-grid-compact">
          ${renderMetricCard('Incidents', formatNumber(selected.metrics.incidentCount))}
          ${renderMetricCard('Sales', formatCurrency(selected.metrics.salesTotal))}
          ${renderMetricCard('KPIs', formatNumber(selected.metrics.kpiCount))}
          ${renderMetricCard('Team size', formatNumber(selected.office.teamSize))}
        </div>
      </section>` : ''}

      <section class="panel-section">
        <h3>All offices</h3>
        <div class="scroll-box city-scroll">
          ${offices.length ? offices.map((item) => renderOfficeListItem(item, item.office.id === selectedOfficeId)).join('') : '<div class="empty-state">No offices available.</div>'}
        </div>
      </section>

      <section class="panel-section">
        <h3>Cities in view</h3>
        <div class="scroll-box city-scroll">
          ${visibleCities.length ? visibleCities.map((city) => renderListItem(city, city.id === selectedCityId)).join('') : '<div class="empty-state">No cities match the current filters.</div>'}
        </div>
      </section>
    `;

    bindCityFilters(root, { onCityQueryChange, onCountryChange });
    attachCityEvents(root, { cities, onCitySelect });
    root.querySelectorAll('[data-office-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const office = offices.find((item) => item.office.id === button.dataset.officeId);
        if (office) onOfficeClick?.(office.office);
      });
    });
  }

  function renderBeeHub({
    beeHub,
    city,
    metrics,
    beeHubs,
    onBack,
    onBeeHubClick,
  }) {
    root.innerHTML = `
      <div class="panel-head">
        <p class="eyebrow">beeHub details</p>
        <h2>${beeHub.name}</h2>
        <p class="muted">${city?.name || '—'} · ${city?.country || '—'}</p>
      </div>

      <div class="metric-grid">
        ${renderMetricCard('Incidents', formatNumber(metrics.incidentCount))}
        ${renderMetricCard('Sales', formatCurrency(metrics.salesTotal))}
        ${renderMetricCard('Team size', formatNumber(beeHub.teamSize || '—'))}
      </div>

      <section class="panel-section">
        <h3>beeHub details</h3>
        <div class="key-value"><span>Name</span><b>${beeHub.name}</b></div>
        <div class="key-value"><span>City</span><b>${city?.name || '—'}</b></div>
        <div class="key-value"><span>Country</span><b>${city?.country || '—'}</b></div>
        <div class="key-value"><span>Office</span><b>${beeHub.resolvedOfficeName || 'Unassigned'}</b></div>
        <div class="key-value"><span>Address</span><b>${beeHub.address || '—'}</b></div>
        <div class="key-value"><span>Hours</span><b>${beeHub.hoursOfOperation || beeHub.hours || '—'}</b></div>
      </section>

      <section class="panel-section">
        <button type="button" class="action-button" id="backToBeeHubBtn">Back to beeHub</button>
      </section>
    `;

    root.querySelector('#backToBeeHubBtn')?.addEventListener('click', onBack);
  }

  function renderBeeHubLayer({
    beeHubs,
    allBeeHubs,
    cities,
    countries,
    filters,
    visibleCities,
    selectedCityId,
    selectedBeeHubId,
    overview,
    offices,
    onCitySelect,
    onCityQueryChange,
    onCountryChange,
    onBeeHubClick,
    onOfficeChange,
  }) {
    // Build a map of cities to beeHub counts using ALL beeHubs (not filtered by selected city)
    const cityBeeHubCounts = new Map();
    (allBeeHubs || beeHubs).forEach((beeHub) => {
      const cityId = beeHub.resolvedCity?.id || beeHub.cityId;
      if (cityId) {
        cityBeeHubCounts.set(cityId, (cityBeeHubCounts.get(cityId) || 0) + 1);
      }
    });

    // Filter visible cities to only those with beeHubs
    const citiesWithBeeHubs = visibleCities.filter((city) => cityBeeHubCounts.has(city.id));

    root.innerHTML = `
      <div class="panel-head">
        <p class="eyebrow">beeHub layer</p>
        <h2>beeHub directory</h2>
        <p class="muted">beeHubs belong to a single office. Use the city search and country filter to narrow the map, then click a beeHub to view its details.</p>
      </div>

      <section class="filter-panel">
        <div class="field-group">
          <label for="citySearch">Search city</label>
          <input id="citySearch" type="search" placeholder="Type a city name" value="${filters.cityQuery || ''}" />
        </div>
        <div class="field-group">
          <label for="countryFilter">Country</label>
          <select id="countryFilter">
            <option value="all">All countries</option>
            ${countries.map((country) => `<option value="${country}" ${filters.country === country ? 'selected' : ''}>${country}</option>`).join('')}
          </select>
        </div>
        <div class="field-group">
          <label for="beeHubOfficeFilter">Office</label>
          <select id="beeHubOfficeFilter">
            <option value="all">All offices</option>
            ${(offices || []).map((office) => `<option value="${office.id}" ${filters.beeHubOfficeId === office.id ? 'selected' : ''}>${office.name}</option>`).join('')}
          </select>
        </div>
      </section>

      <div class="metric-grid">
        ${renderMetricCard('Cities', formatNumber(overview.cityCount))}
        ${renderMetricCard('beeHubs', formatNumber(overview.beeHubCount))}
        ${renderMetricCard('Offices', formatNumber(overview.officeCount))}
        ${renderMetricCard('Owned offices', formatNumber(overview.ownedOfficeCount))}
      </div>

      <section class="panel-section">
        <h3>All beeHubs</h3>
        <div class="scroll-box city-scroll">
          ${beeHubs.length ? beeHubs.map((beeHub) => renderBeeHubListItem(beeHub, beeHub.id === selectedBeeHubId)).join('') : '<div class="empty-state">No beeHubs available for the current filters.</div>'}
        </div>
      </section>

      <section class="panel-section">
        <h3>Cities in view</h3>
        <div class="scroll-box city-scroll">
          ${citiesWithBeeHubs.length ? citiesWithBeeHubs.map((city) => renderBeeHubListItemWithCount(city, cityBeeHubCounts.get(city.id) || 0, city.id === selectedCityId)).join('') : '<div class="empty-state">No cities with beeHubs match the current filters.</div>'}
        </div>
      </section>
    `;

    bindCityFilters(root, { onCityQueryChange, onCountryChange });
    bindSelect(root, '#beeHubOfficeFilter', onOfficeChange);
    attachCityEvents(root, { cities, onCitySelect });
    root.querySelectorAll('[data-beehub-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const beeHub = beeHubs.find((item) => item.id === button.dataset.beehubId);
        if (beeHub) onBeeHubClick?.(beeHub);
      });
    });
  }

  
function renderSalesControlRow(label, primary, secondary = '', attrs = {}, active = false) {
  const toKebabCase = (value) => String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();

  const attrMarkup = Object.entries(attrs)
    .map(([key, value]) => `data-${toKebabCase(key)}="${String(value).replace(/"/g, '&quot;')}"`)
    .join(' ');

  return `
    <button type="button" class="list-button ${active ? 'active' : ''}" ${attrMarkup}>
      <div>
        <b>${label}</b>
        <span>${secondary}</span>
      </div>
      <span>${primary}</span>
    </button>
  `;
}

function renderSalesCityDetail(details, onBackToSales, onOfficeClick) {
  return `
    <div class="panel-head">
      <p class="eyebrow">Sales city details</p>
      <h2>${details.city.name}</h2>
      <p class="muted">${details.city.country} · ${details.city.region || '—'} · ${formatNumber(details.records)} records</p>
    </div>

    <div class="metric-grid">
      ${renderMetricCard('Sales', formatCurrency(details.salesTotal))}
      ${renderMetricCard('Records', formatNumber(details.records))}
      ${renderMetricCard('Deals', formatNumber(details.deals))}
      ${renderMetricCard('Offices', formatNumber(details.officeCount))}
    </div>

    <section class="panel-section">
      <h3>City details</h3>
      <div class="key-value"><span>Name</span><b>${details.city.name}</b></div>
      <div class="key-value"><span>Country</span><b>${details.city.country || '—'}</b></div>
      <div class="key-value"><span>Region</span><b>${details.city.region || '—'}</b></div>
      <div class="key-value"><span>Records</span><b>${formatNumber(details.records)}</b></div>
      <div class="key-value"><span>Deals</span><b>${formatNumber(details.deals)}</b></div>
      <div class="key-value"><span>Sales total</span><b>${formatCurrency(details.salesTotal)}</b></div>
    </section>

    <section class="panel-section">
      <h3>Office aggregation</h3>
      <div class="scroll-box city-scroll">
        ${details.offices.length
          ? details.offices.map((item) => renderSalesControlRow(
              item.office.name,
              formatCurrency(item.salesTotal),
              `${formatNumber(item.records)} records · ${formatNumber(item.deals)} deals`,
              { officeId: item.office.id },
              false,
            )).join('')
          : '<div class="empty-state">No offices available for this city.</div>'}
      </div>
    </section>

    <section class="panel-section">
      <h3>Regional snapshot</h3>
      <div class="scroll-box city-scroll">
        ${details.regions.length
          ? details.regions.map((item) => renderSalesControlRow(
              item.region,
              `${formatNumber(item.deals)} deals`,
              `${formatNumber(item.records)} records · ${formatCurrency(item.amount)}`,
              { region: item.region },
              false,
            )).join('')
          : '<div class="empty-state">No regional data available.</div>'}
      </div>
    </section>

    ${onBackToSales ? `<button id="backToSalesBtn" class="btn btn-secondary btn-full">Back to Sales</button>` : ''}
  `;

}

function renderSubjectCityDetail(details, onBackToSubjects, onOfficeClick) {
  return `
    <div class="panel-head">
      <p class="eyebrow">Subject city details</p>
      <h2>${details.city.name}</h2>
      <p class="muted">${details.city.country} · ${details.city.region || '—'} · ${formatNumber(details.count)} subjects</p>
    </div>

    <div class="metric-grid">
      ${renderMetricCard('Subjects', formatNumber(details.count))}
      ${renderMetricCard('Offices', formatNumber(details.officeCount))}
      ${renderMetricCard('Regions', formatNumber(details.regionCount))}
      ${renderMetricCard('City', details.city.name)}
    </div>

    <section class="panel-section">
      <h3>City details</h3>
      <div class="key-value"><span>Name</span><b>${details.city.name}</b></div>
      <div class="key-value"><span>Country</span><b>${details.city.country || '—'}</b></div>
      <div class="key-value"><span>Region</span><b>${details.city.region || '—'}</b></div>
      <div class="key-value"><span>Verified subjects</span><b>${formatNumber(details.count)}</b></div>
      <div class="key-value"><span>Covering offices</span><b>${formatNumber(details.officeCount)}</b></div>
      <div class="key-value"><span>Geographic regions</span><b>${formatNumber(details.regionCount)}</b></div>
    </section>

    <section class="panel-section">
      <h3>Office aggregation</h3>
      <div class="scroll-box city-scroll">
        ${details.offices.length
          ? details.offices.map((item) => renderSalesControlRow(
              item.office.name,
              formatNumber(item.count),
              `${formatNumber(item.regionCount)} region${item.regionCount !== 1 ? 's' : ''} · ${item.city?.name || '—'}`,
              { officeId: item.office.id },
              false,
            )).join('')
          : '<div class="empty-state">No offices available for this city.</div>'}
      </div>
    </section>

    <section class="panel-section">
      <h3>Regional snapshot</h3>
      <div class="scroll-box city-scroll">
        ${details.regions.length
          ? details.regions.map((item) => renderSalesControlRow(
              item.region,
              formatNumber(item.count),
              'Verified subjects in this region',
              { region: item.region },
              false,
            )).join('')
          : '<div class="empty-state">No regional data available.</div>'}
      </div>
    </section>

    ${onBackToSubjects ? `<button id="backToSubjectsBtn" class="btn btn-secondary btn-full">Back to Subjects</button>` : ''}
  `;

}

function renderSubjectOfficeDetail(details, onBackToSubjects, backLabel = 'Back to Subjects') {
  return `
    <div class="panel-head">
      <p class="eyebrow">Subject office details</p>
      <h2>${details.office.name}</h2>
      <p class="muted">${details.city?.name || '—'} · ${details.city?.country || '—'} · ${details.office.status || 'unknown'}</p>
    </div>

    <div class="metric-grid">
      ${renderMetricCard('Subjects', formatNumber(details.count))}
      ${renderMetricCard('Regions', formatNumber(details.regionCount))}
      ${renderMetricCard('City', details.city?.name || '—')}
      ${renderMetricCard('Status', details.office.status || 'unknown')}
    </div>

    <section class="panel-section">
      <h3>Office details</h3>
      <div class="key-value"><span>Name</span><b>${details.office.name}</b></div>
      <div class="key-value"><span>City</span><b>${details.city?.name || '—'}</b></div>
      <div class="key-value"><span>Country</span><b>${details.city?.country || '—'}</b></div>
      <div class="key-value"><span>Office type</span><b>${details.office.officeType || details.office.category || '—'}</b></div>
      <div class="key-value"><span>Status</span><b>${details.office.status || '—'}</b></div>
      <div class="key-value"><span>Parent office</span><b>${details.office.parentOfficeId || '—'}</b></div>
      <div class="key-value"><span>Address</span><b>${details.office.address || '—'}</b></div>
      <div class="key-value"><span>Verified subjects</span><b>${formatNumber(details.count)}</b></div>
    </section>

    <section class="panel-section">
      <h3>Regional snapshot</h3>
      <div class="scroll-box city-scroll">
        ${details.regions.length
          ? details.regions.map((item) => renderSalesControlRow(
              item.region,
              formatNumber(item.count),
              'Verified subjects in this region',
              { region: item.region },
              false,
            )).join('')
          : '<div class="empty-state">No regional data available.</div>'}
      </div>
    </section>

    ${onBackToSubjects ? `<button id="backToSubjectsBtn" class="btn btn-secondary btn-full">${backLabel}</button>` : ''}
  `;

}



function renderSalesOfficeDetail(details, onBackToSales, backLabel = 'Back to Sales') {
  return `
    <div class="panel-head">
      <p class="eyebrow">Sales office details</p>
      <h2>${details.office.name}</h2>
      <p class="muted">${details.city?.name || '—'} · ${details.city?.country || '—'} · ${details.office.status || 'unknown'}</p>
    </div>

    <div class="metric-grid">
      ${renderMetricCard('Sales', formatCurrency(details.salesTotal))}
      ${renderMetricCard('Records', formatNumber(details.records))}
      ${renderMetricCard('Deals', formatNumber(details.deals))}
      ${renderMetricCard('Regions', formatNumber(details.regionCount))}
    </div>

    <section class="panel-section">
      <h3>Office details</h3>
      <div class="key-value"><span>Name</span><b>${details.office.name}</b></div>
      <div class="key-value"><span>City</span><b>${details.city?.name || '—'}</b></div>
      <div class="key-value"><span>Country</span><b>${details.city?.country || '—'}</b></div>
      <div class="key-value"><span>Office type</span><b>${details.office.officeType || details.office.category || '—'}</b></div>
      <div class="key-value"><span>Status</span><b>${details.office.status || '—'}</b></div>
      <div class="key-value"><span>Parent office</span><b>${details.office.parentOfficeId || '—'}</b></div>
      <div class="key-value"><span>Address</span><b>${details.office.address || '—'}</b></div>
      <div class="key-value"><span>Phone</span><b>${details.office.phone || '—'}</b></div>
      <div class="key-value"><span>Records</span><b>${formatNumber(details.records)}</b></div>
      <div class="key-value"><span>Sales total</span><b>${formatCurrency(details.salesTotal)}</b></div>
    </section>

    <section class="panel-section">
      <h3>Regional snapshot</h3>
      <div class="scroll-box city-scroll">
        ${details.regions.length
          ? details.regions.map((item) => renderSalesControlRow(
              item.region,
              `${formatNumber(item.deals)} deals`,
              `${formatNumber(item.records)} records · ${formatCurrency(item.amount)}`,
              { region: item.region },
              false,
            )).join('')
          : '<div class="empty-state">No regional data available.</div>'}
      </div>
    </section>

    ${onBackToSales ? `<button id="backToSalesBtn" class="btn btn-secondary btn-full">Back to Sales</button>` : ''}
  `;

}
function renderSalesLayer({
    countries,
    cityQuery,
    selectedCountry,
    selectedCityId,
    selectedOfficeId,
    selectedBeeHub,
    cities,
    offices,
    overview,
    citySummary,
    officeSummary,
    beeHubSummary,
    selectedCityDetails,
    selectedOfficeDetails,
    onCountryChange,
    onCityQueryChange,
    onCitySelect,
    onOfficeChange,
    onOfficeSelect,
    onBeeHubChange,
    onBackToSales,
    backButtonLabel,
  }) {
    if (selectedOfficeDetails) {
      root.innerHTML = renderSalesOfficeDetail(selectedOfficeDetails, onBackToSales, backButtonLabel || 'Back to Sales');
      root.querySelectorAll('[data-region]').forEach((button) => {
        button.addEventListener('click', () => {
          const region = button.dataset.region;
          if (region) onRegionChange?.(region);
        });
      });
      root.querySelector('#backToSalesBtn')?.addEventListener('click', onBackToSales || (() => {}));
      return;
    }

    if (selectedCityDetails) {
      root.innerHTML = renderSalesCityDetail(selectedCityDetails, onBackToSales, onOfficeSelect);
      root.querySelectorAll('[data-office-id]').forEach((button) => {
        button.addEventListener('click', () => {
          const officeId = button.dataset.officeId;
          if (officeId) onOfficeSelect?.(officeId, 'city');
        });
      });
      root.querySelectorAll('[data-region]').forEach((button) => {
        button.addEventListener('click', () => {
          const region = button.dataset.region;
          if (region) onRegionChange?.(region);
        });
      });
      root.querySelector('#backToSalesBtn')?.addEventListener('click', onBackToSales || (() => {}));
      return;
    }

    root.innerHTML = `
      <div class="panel-head">
        <p class="eyebrow">Sales layer</p>
        <h2>Demand heatmap</h2>
        <p class="muted">Use the country, city, and office filters to narrow the sales view, then open any city or office for details.</p>
      </div>

      <section class="filter-panel">
        <div class="field-group">
          <label for="salesCountryFilter">Country</label>
          <select id="salesCountryFilter">
            <option value="all">All countries</option>
            ${countries.map((country) => `<option value="${country}" ${selectedCountry === country ? 'selected' : ''}>${country}</option>`).join('')}
          </select>
        </div>
        <div class="field-group">
          <label for="salesCitySearch">City</label>
          <input id="salesCitySearch" type="search" list="salesCityOptions" placeholder="Type a city name" value="${cityQuery || ''}" />
          <datalist id="salesCityOptions">
            ${cities.map((city) => `<option value="${city.name}">${city.country}</option>`).join('')}
          </datalist>
        </div>
        <div class="field-group">
          <label for="salesOfficeFilter">Office</label>
          <select id="salesOfficeFilter">
            <option value="all">All offices</option>
            ${offices.map((office) => `<option value="${office.id}" ${selectedOfficeId === office.id ? 'selected' : ''}>${office.name}</option>`).join('')}
          </select>
        </div>
        <div class="field-group">
          <label for="salesBeeHubFilter">beeHub</label>
          <select id="salesBeeHubFilter">
            <option value="all">All beeHubs</option>
            ${(beeHubSummary || []).map((beeHub) => `<option value="${beeHub.id}" ${selectedBeeHub === beeHub.id ? 'selected' : ''}>${beeHub.name}</option>`).join('')}
          </select>
        </div>
      </section>

      <div class="metric-grid">
        ${renderMetricCard('Sales', formatCurrency(overview.salesTotal))}
        ${renderMetricCard('Records', formatNumber(overview.records))}
        ${renderMetricCard('Cities', formatNumber(overview.cities))}
        ${renderMetricCard('Offices', formatNumber(overview.offices))}
      </div>

      <section class="panel-section">
        <h3>City aggregation</h3>
        <div class="scroll-box city-scroll">
          ${(citySummary || []).length
            ? citySummary.map((item) => renderSalesControlRow(
                item.cityName,
                formatCurrency(item.salesTotal),
                `${formatNumber(item.records)} records · ${formatNumber(item.deals)} deals`,
                { cityId: item.cityId },
                selectedCityId === item.cityId,
              )).join('')
            : '<div class="empty-state">No cities available for the current filters.</div>'}
        </div>
      </section>

      <section class="panel-section">
        <h3>Office aggregation</h3>
        <div class="scroll-box city-scroll">
          ${(officeSummary || []).length
            ? officeSummary.map((item) => renderSalesControlRow(
                item.office.name,
                formatCurrency(item.salesTotal),
                `${formatNumber(item.records)} records · ${item.city?.name || '—'}`,
                { officeId: item.office.id },
                selectedOfficeId === item.office.id,
              )).join('')
            : '<div class="empty-state">No offices available for the current filters.</div>'}
        </div>
      </section>

      <section class="panel-section">
        <h3>beeHub aggregation</h3>
        <div class="scroll-box city-scroll">
          ${(beeHubSummary || []).length
            ? beeHubSummary.map((item) => renderSalesControlRow(
                item.name,
                formatCurrency(item.salesTotal),
                `${formatNumber(item.records)} records · ${item.city?.name || '—'}`,
                { beeHubId: item.id },
                selectedBeeHub === item.id,
              )).join('')
            : '<div class="empty-state">No beeHubs available for the current filters.</div>'}
        </div>
      </section>
    `;

    bindSelect(root, '#salesCountryFilter', onCountryChange);
    bindSelect(root, '#salesOfficeFilter', onOfficeChange);
    bindSelect(root, '#salesBeeHubFilter', onBeeHubChange);
    const citySearch = root.querySelector('#salesCitySearch');
    if (citySearch) {
      citySearch.addEventListener('input', (event) => {
        onCityQueryChange?.(event.target.value);
      });
    }
    root.querySelectorAll('[data-city-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const city = cities.find((item) => item.id === button.dataset.cityId);
        if (city) {
          onCitySelect?.(city);
        }
      });
    });
    root.querySelectorAll('[data-office-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const officeId = button.dataset.officeId;
        if (officeId) {
          onOfficeSelect?.(officeId, 'sales');
        }
      });
    });
    root.querySelectorAll('[data-beehub-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const beeHubId = button.dataset.beehubId;
        if (beeHubId) {
          onBeeHubChange?.(beeHubId);
        }
      });
    });
  }

  function renderSubjectLayer({
    countries,
    cityQuery,
    selectedCountry,
    selectedCityId,
    selectedOfficeId,
    selectedBeeHub,
    cities,
    offices,
    overview,
    citySummary,
    officeSummary,
    beeHubSummary,
    selectedCityDetails,
    selectedOfficeDetails,
    onCountryChange,
    onCityQueryChange,
    onCitySelect,
    onOfficeChange,
    onOfficeSelect,
    onBeeHubChange,
    onBackToSubjects,
    backButtonLabel,
  }) {
    if (selectedOfficeDetails) {
      root.innerHTML = renderSubjectOfficeDetail(selectedOfficeDetails, onBackToSubjects, backButtonLabel || 'Back to Subjects');
      root.querySelectorAll('[data-region]').forEach((button) => {
        button.addEventListener('click', () => {
          const region = button.dataset.region;
          if (region) onRegionChange?.(region);
        });
      });
      root.querySelector('#backToSubjectsBtn')?.addEventListener('click', onBackToSubjects || (() => {}));
      return;
    }

    if (selectedCityDetails) {
      root.innerHTML = renderSubjectCityDetail(selectedCityDetails, onBackToSubjects, onOfficeSelect);
      root.querySelectorAll('[data-office-id]').forEach((button) => {
        button.addEventListener('click', () => {
          const officeId = button.dataset.officeId;
          if (officeId) onOfficeSelect?.(officeId, 'city');
        });
      });
      root.querySelectorAll('[data-region]').forEach((button) => {
        button.addEventListener('click', () => {
          const region = button.dataset.region;
          if (region) onRegionChange?.(region);
        });
      });
      root.querySelector('#backToSubjectsBtn')?.addEventListener('click', onBackToSubjects || (() => {}));
      return;
    }

    root.innerHTML = `
      <div class="panel-head">
        <p class="eyebrow">Subject layer</p>
        <h2>Verified subject density</h2>
        <p class="muted">Use the country, city, and office filters to narrow the subject view, then open any city or office for details.</p>
      </div>

      <section class="filter-panel">
        <div class="field-group">
          <label for="subjectCountryFilter">Country</label>
          <select id="subjectCountryFilter">
            <option value="all">All countries</option>
            ${countries.map((country) => `<option value="${country}" ${selectedCountry === country ? 'selected' : ''}>${country}</option>`).join('')}
          </select>
        </div>
        <div class="field-group">
          <label for="subjectCitySearch">City</label>
          <input id="subjectCitySearch" type="search" list="subjectCityOptions" placeholder="Type a city name" value="${cityQuery || ''}" />
          <datalist id="subjectCityOptions">
            ${cities.map((city) => `<option value="${city.name}">${city.country}</option>`).join('')}
          </datalist>
        </div>
        <div class="field-group">
          <label for="subjectOfficeFilter">Office</label>
          <select id="subjectOfficeFilter">
            <option value="all">All offices</option>
            ${offices.map((office) => `<option value="${office.id}" ${selectedOfficeId === office.id ? 'selected' : ''}>${office.name}</option>`).join('')}
          </select>
        </div>
        <div class="field-group">
          <label for="subjectBeeHubFilter">beeHub</label>
          <select id="subjectBeeHubFilter">
            <option value="all">All beeHubs</option>
            ${(beeHubSummary || []).map((beeHub) => `<option value="${beeHub.id}" ${selectedBeeHub === beeHub.id ? 'selected' : ''}>${beeHub.name}</option>`).join('')}
          </select>
        </div>
      </section>

      <div class="metric-grid">
        ${renderMetricCard('Subjects', formatNumber(overview.records))}
        ${renderMetricCard('Records', formatNumber(overview.records))}
        ${renderMetricCard('Cities', formatNumber(overview.cities))}
        ${renderMetricCard('Offices', formatNumber(overview.offices))}
      </div>

      <section class="panel-section">
        <h3>City aggregation</h3>
        <div class="scroll-box city-scroll">
          ${(citySummary || []).length
            ? citySummary.map((item) => renderSalesControlRow(
                item.cityName,
                formatNumber(item.count),
                `${formatNumber(item.regionCount)} region${item.regionCount !== 1 ? 's' : ''} · ${formatNumber(item.officeCount)} office${item.officeCount !== 1 ? 's' : ''}`,
                { cityId: item.cityId },
                selectedCityId === item.cityId,
              )).join('')
            : '<div class="empty-state">No cities available for the current filters.</div>'}
        </div>
      </section>

      <section class="panel-section">
        <h3>Office aggregation</h3>
        <div class="scroll-box city-scroll">
          ${(officeSummary || []).length
            ? officeSummary.map((item) => renderSalesControlRow(
                item.office.name,
                formatNumber(item.count),
                `${formatNumber(item.regionCount)} region${item.regionCount !== 1 ? 's' : ''} · ${item.city?.name || '—'}`,
                { officeId: item.office.id },
                selectedOfficeId === item.office.id,
              )).join('')
            : '<div class="empty-state">No offices available for the current filters.</div>'}
        </div>
      </section>

      <section class="panel-section">
        <h3>beeHub aggregation</h3>
        <div class="scroll-box city-scroll">
          ${(beeHubSummary || []).length
            ? beeHubSummary.map((item) => renderSalesControlRow(
                item.name,
                formatNumber(item.count),
                `${item.city?.name || '—'} · ${item.resolvedOfficeName || 'Unassigned'}`,
                { beeHubId: item.id },
                selectedBeeHub === item.id,
              )).join('')
            : '<div class="empty-state">No beeHubs available for the current filters.</div>'}
        </div>
      </section>
    `;

    bindSelect(root, '#subjectCountryFilter', onCountryChange);
    bindSelect(root, '#subjectOfficeFilter', onOfficeChange);
    bindSelect(root, '#subjectBeeHubFilter', onBeeHubChange);
    const citySearch = root.querySelector('#subjectCitySearch');
    if (citySearch) {
      citySearch.addEventListener('input', (event) => {
        onCityQueryChange?.(event.target.value);
      });
    }
    root.querySelectorAll('[data-city-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const city = cities.find((item) => item.id === button.dataset.cityId);
        if (city) {
          onCitySelect?.(city);
        }
      });
    });
    root.querySelectorAll('[data-office-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const officeId = button.dataset.officeId;
        if (officeId) {
          onOfficeSelect?.(officeId, 'subjects');
        }
      });
    });
    root.querySelectorAll('[data-beehub-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const beeHubId = button.dataset.beehubId;
        if (beeHubId) {
          onBeeHubChange?.(beeHubId);
        }
      });
    });
  }

  function renderMessage(title, message) {
    root.innerHTML = `
      <div class="panel-head">
        <p class="eyebrow">Status</p>
        <h2>${title}</h2>
        <p class="muted">${message}</p>
      </div>
    `;
  }

  return {
    renderOverview,
    renderCity,
    renderOffice,
    renderOfficeDirectory,
    renderBeeHub,
    renderBeeHubLayer,
    renderSalesLayer,
    renderSubjectLayer,
    renderMessage,
  };
}

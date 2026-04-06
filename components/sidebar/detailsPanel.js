import { formatCurrency, formatDecimal, formatNumber } from '../../services/filterService.js';

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
        <span>${item.city?.name || '—'} · ${item.office.status || 'unknown'} · ${item.office.category || 'Office'}</span>
      </div>
      <span>${formatNumber(item.office.teamSize)} staff</span>
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

export function createDetailsPanel(root) {
  function attachCityEvents(callbacks = {}) {
    root.querySelectorAll('[data-city-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const cityId = button.dataset.cityId;
        const city = callbacks.cities?.find((item) => item.id === cityId);
        if (city) callbacks.onCitySelect?.(city);
      });
    });
  }

  function bindFilters(callbacks = {}) {
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

    bindFilters({ onCityQueryChange, onCountryChange });
    attachCityEvents({ cities, onCitySelect });
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

    bindFilters({ onCityQueryChange, onCountryChange });
    attachCityEvents({ cities, onCitySelect });
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
        <p class="muted">${city ? `${city.name} · ` : ''}${office.status || 'unknown'}</p>
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

  function renderOfficeDirectory({
    overview,
    cities,
    countries,
    filters,
    offices,
    visibleCities,
    selectedCityId,
    selectedOfficeId,
    onCitySelect,
    onCityQueryChange,
    onCountryChange,
    onOfficeClick,
  }) {
    const selected = selectedOfficeId ? offices.find((item) => item.office.id === selectedOfficeId) : null;

    root.innerHTML = `
      <div class="panel-head">
        <p class="eyebrow">Office layer</p>
        <h2>Office directory</h2>
        <p class="muted">Use the city search and country filter to narrow the office map and list. Click any office to open its details here.</p>
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

    bindFilters({ onCityQueryChange, onCountryChange });
    attachCityEvents({ cities, onCitySelect });
    root.querySelectorAll('[data-office-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const office = offices.find((item) => item.office.id === button.dataset.officeId);
        if (office) onOfficeClick?.(office.office);
      });
    });
  }

  function renderMessage(title, message) {
    root.innerHTML = `
      <div class="panel-head">
        <p class="eyebrow">Office layer</p>
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
    renderMessage,
  };
}

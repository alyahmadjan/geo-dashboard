function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

function formatCurrency(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function uniqueCountries(cities = []) {
  return [...new Set(cities.map((city) => city.country).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function renderCityOptions(cities = []) {
  return cities
    .map((city) => `
      <option value="${city.name}"></option>
    `)
    .join('');
}

function renderCityButton(city, isSelected = false) {
  return `
    <button type="button" class="list-button ${isSelected ? 'active' : ''}" data-city-id="${city.id}">
      <div>
        <b>${city.name}</b>
        <span>${city.country || '—'}${city.region ? ` · ${city.region}` : ''} · ${formatNumber(city.population || 0)} people</span>
      </div>
      <span>${city.status || ''}</span>
    </button>
  `;
}

function renderOfficeButton(item, isSelected = false) {
  return `
    <button type="button" class="list-button ${isSelected ? 'active' : ''}" data-office-id="${item.office.id}">
      <div>
        <b>${item.office.name}</b>
        <span>${item.city?.name || '—'} · ${item.office.officeType || item.office.category || 'Office'} · ${item.office.status || 'unknown'}</span>
      </div>
      <span>${formatNumber(item.office.teamSize || 0)} staff</span>
    </button>
  `;
}

function renderBeeHubButton(item, isSelected = false) {
  return `
    <button type="button" class="list-button ${isSelected ? 'active' : ''}" data-beehub-id="${item.id}">
      <div>
        <b>${item.name}</b>
        <span>${item.city?.name || item.resolvedCity?.name || '—'} · ${item.city?.country || item.resolvedCity?.country || '—'}</span>
      </div>
      <span>${item.hoursOfOperation || item.hours || '—'}</span>
    </button>
  `;
}

function bindFilters(root, callbacks = {}) {
  const citySearch = root.querySelector('#citySearch');
  const countryFilter = root.querySelector('#countryFilter');
  let citySearchTimer = null;

  const commitCityQuery = (value) => {
    if (citySearchTimer) {
      clearTimeout(citySearchTimer);
    }
    citySearchTimer = setTimeout(() => {
      callbacks.onCityQueryChange?.(value);
    }, 350);
  };

  citySearch?.addEventListener('input', (event) => {
    commitCityQuery(event.target.value);
  });

  citySearch?.addEventListener('change', (event) => {
    const value = String(event.target.value || '').trim();
    const city = callbacks.cities?.find((item) => String(item.name).toLowerCase() === value.toLowerCase());
    if (city) {
      callbacks.onCityQueryChange?.(city.name);
      callbacks.onCitySelect?.(city);
    }
  });

  citySearch?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const value = String(citySearch.value || '').trim();
    const city = callbacks.cities?.find((item) => String(item.name).toLowerCase() === value.toLowerCase());
    if (city) {
      callbacks.onCityQueryChange?.(city.name);
      callbacks.onCitySelect?.(city);
    }
  });

  countryFilter?.addEventListener('change', (event) => {
    callbacks.onCountryChange?.(event.target.value);
  });
}

function bindSelections(root, callbacks = {}) {
  root.querySelectorAll('[data-city-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const city = callbacks.cities?.find((item) => item.id === button.dataset.cityId);
      if (city) callbacks.onCitySelect?.(city);
    });
  });

  root.querySelectorAll('[data-office-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const office = callbacks.offices?.find((item) => item.office.id === button.dataset.officeId);
      if (office) callbacks.onOfficeSelect?.(office.office);
    });
  });

  root.querySelectorAll('[data-beehub-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const beeHub = callbacks.beeHubs?.find((item) => item.id === button.dataset.beehubId);
      if (beeHub) callbacks.onBeeHubSelect?.(beeHub);
    });
  });
}

export function createDetailsPanel(root) {
  function renderOverview({ overview, cities, filters, visibleCities, onCitySelect, onCityQueryChange, onCountryChange }) {
    root.innerHTML = `
      <div class="panel-head">
        <p class="eyebrow">City level</p>
        <h2>City overview</h2>
        <p class="muted">Search and filter cities, then drill down by clicking a city.</p>
      </div>

      <section class="filter-panel">
        <div class="field-group">
          <label for="citySearch">City search</label>
          <input id="citySearch" type="search" list="cityOptions" placeholder="Type or choose a city" value="${filters.cityQuery || ''}" />
          <datalist id="cityOptions">
            ${renderCityOptions(cities)}
          </datalist>
        </div>
        <div class="field-group">
          <label for="countryFilter">Country</label>
          <select id="countryFilter">
            <option value="all">All countries</option>
            ${uniqueCountries(cities).map((country) => `<option value="${country}" ${filters.country === country ? 'selected' : ''}>${country}</option>`).join('')}
          </select>
        </div>
      </section>

      <div class="metric-grid">
        ${renderMetricCard('Cities', formatNumber(overview.cityCount))}
        ${renderMetricCard('Offices', formatNumber(overview.officeCount))}
        ${renderMetricCard('Sales', formatCurrency(overview.salesTotal))}
        ${renderMetricCard('Subjects', formatNumber(overview.subjectCount))}
      </div>

      <section class="panel-section">
        <h3>Cities in view</h3>
        <div class="scroll-box city-scroll">
          ${visibleCities.length ? visibleCities.map((city) => renderCityButton(city)).join('') : '<div class="empty-state">No cities match the current filters.</div>'}
        </div>
      </section>
    `;

    bindFilters(root, { cities, onCityQueryChange, onCountryChange, onCitySelect });
    bindSelections(root, { cities, onCitySelect });
  }

  function renderCityDetail({ city, cities, metrics, filters, visibleCities, onCitySelect, onOfficeSelect, onCityQueryChange, onCountryChange, onBack }) {
    root.innerHTML = `
      <div class="panel-head">
        <p class="eyebrow">City level</p>
        <h2>${city.name}</h2>
        <p class="muted">${city.country}${city.region ? ` · ${city.region}` : ''} · Population ${formatNumber(city.population || 0)}</p>
      </div>

      <section class="filter-panel">
        <div class="field-group">
          <label for="citySearch">City search</label>
          <input id="citySearch" type="search" list="cityOptions" placeholder="Type or choose a city" value="${filters.cityQuery || ''}" />
          <datalist id="cityOptions">
            ${renderCityOptions(cities.length ? cities : [city])}
          </datalist>
        </div>
        <div class="field-group">
          <label for="countryFilter">Country</label>
          <select id="countryFilter">
            <option value="all">All countries</option>
            ${uniqueCountries(cities.length ? cities : [city]).map((country) => `<option value="${country}" ${filters.country === country ? 'selected' : ''}>${country}</option>`).join('')}
          </select>
        </div>
      </section>

      <div class="metric-grid">
        ${renderMetricCard('Offices', formatNumber(metrics.officeCount))}
        ${renderMetricCard('Sales', formatCurrency(metrics.salesTotal))}
        ${renderMetricCard('Subjects', formatNumber(metrics.subjectCount))}
        ${renderMetricCard('beeHubs', formatNumber(metrics.beeHubCount))}
      </div>

      <section class="panel-section">
        <h3>City details</h3>
        <div class="key-value"><span>Name</span><b>${city.name}</b></div>
        <div class="key-value"><span>Country</span><b>${city.country || '—'}</b></div>
        <div class="key-value"><span>Region</span><b>${city.region || '—'}</b></div>
        <div class="key-value"><span>Population</span><b>${formatNumber(city.population || 0)}</b></div>
        <div class="key-value"><span>Sales records</span><b>${formatNumber(metrics.salesCount)}</b></div>
        <div class="key-value"><span>Subject records</span><b>${formatNumber(metrics.subjectCount)}</b></div>
      </section>

      <section class="panel-section">
        <h3>Offices in city</h3>
        <div class="scroll-box city-scroll">
          ${metrics.offices.length ? metrics.offices.map((office) => renderOfficeButton({ office, city }, false)).join('') : '<div class="empty-state">No offices available for this city.</div>'}
        </div>
      </section>

      <section class="panel-section">
        <h3>Cities in view</h3>
        <div class="scroll-box city-scroll">
          ${visibleCities.length ? visibleCities.map((item) => renderCityButton(item, item.id === city.id)).join('') : '<div class="empty-state">No cities match the current filters.</div>'}
        </div>
      </section>

      ${onBack ? '<button type="button" class="btn btn-back-city btn-full" id="backToCityOverviewBtn">Back to city overview</button>' : ''}
    `;

    bindFilters(root, { cities, onCityQueryChange, onCountryChange, onCitySelect });
    bindSelections(root, { cities: visibleCities, offices: metrics.offices.map((office) => ({ office, city })), onCitySelect, onOfficeSelect });
    root.querySelector('#backToCityOverviewBtn')?.addEventListener('click', () => onBack?.());
  }

  function renderOfficeDirectory({ overview, cities, filters, visibleCities, offices, beeHubs, selectedCity, selectedOffice, onCitySelect, onOfficeSelect, onBeeHubSelect, onCityQueryChange, onCountryChange, onBackToCity }) {
    root.innerHTML = `
      <div class="panel-head">
        <p class="eyebrow">Office level</p>
        <h2>Office directory</h2>
        <p class="muted">Offices are the primary view here. beeHubs, sales, and subjects can be switched on independently.</p>
      </div>

      <section class="filter-panel">
        <div class="field-group">
          <label for="citySearch">City search</label>
          <input id="citySearch" type="search" list="cityOptions" placeholder="Type or choose a city" value="${filters.cityQuery || ''}" />
          <datalist id="cityOptions">
            ${renderCityOptions(cities)}
          </datalist>
        </div>
        <div class="field-group">
          <label for="countryFilter">Country</label>
          <select id="countryFilter">
            <option value="all">All countries</option>
            ${uniqueCountries(cities).map((country) => `<option value="${country}" ${filters.country === country ? 'selected' : ''}>${country}</option>`).join('')}
          </select>
        </div>
      </section>

      <div class="metric-grid">
        ${renderMetricCard('Offices', formatNumber(overview.officeCount))}
        ${renderMetricCard('beeHubs', formatNumber(overview.beeHubCount))}
        ${renderMetricCard('Sales', formatCurrency(overview.salesTotal))}
        ${renderMetricCard('Subjects', formatNumber(overview.subjectCount))}
      </div>

      ${selectedCity ? `
      <section class="panel-section">
        <h3>Selected city</h3>
        <div class="key-value"><span>Name</span><b>${selectedCity.name}</b></div>
        <div class="key-value"><span>Country</span><b>${selectedCity.country || '—'}</b></div>
        <div class="key-value"><span>Region</span><b>${selectedCity.region || '—'}</b></div>
        ${onBackToCity ? '<button type="button" id="backToCityBtn" class="btn btn-secondary btn-full">Back to city view</button>' : ''}
      </section>
      ` : ''}

      ${selectedOffice ? `
      <section class="panel-section">
        <h3>Selected office</h3>
        <div class="key-value"><span>Name</span><b>${selectedOffice.name}</b></div>
        <div class="key-value"><span>City</span><b>${selectedCity?.name || '—'}</b></div>
        <div class="key-value"><span>Type</span><b>${selectedOffice.officeType || selectedOffice.category || 'Office'}</b></div>
        <div class="key-value"><span>Status</span><b>${selectedOffice.status || '—'}</b></div>
        <div class="key-value"><span>Team size</span><b>${formatNumber(selectedOffice.teamSize || 0)}</b></div>
      </section>
      ` : ''}

      <section class="panel-section">
        <h3>All offices</h3>
        <div class="scroll-box city-scroll">
          ${offices.length ? offices.map((item) => renderOfficeButton(item, item.office.id === selectedOffice?.id)).join('') : '<div class="empty-state">No offices available.</div>'}
        </div>
      </section>

      <section class="panel-section">
        <h3>Cities in view</h3>
        <div class="scroll-box city-scroll">
          ${visibleCities.length ? visibleCities.map((city) => renderCityButton(city, city.id === selectedCity?.id)).join('') : '<div class="empty-state">No cities match the current filters.</div>'}
        </div>
      </section>

      ${beeHubs.length ? `
      <section class="panel-section">
        <h3>beeHubs in view</h3>
        <div class="scroll-box city-scroll">
          ${beeHubs.map((beeHub) => renderBeeHubButton(beeHub, false)).join('')}
        </div>
      </section>
      ` : ''}
    `;

    bindFilters(root, { cities, onCityQueryChange, onCountryChange, onCitySelect });
    bindSelections(root, { cities, offices, beeHubs, onCitySelect, onOfficeSelect, onBeeHubSelect });
    root.querySelector('#backToCityBtn')?.addEventListener('click', () => onBackToCity?.());
  }

  function renderOfficeDetail({ office, city, metrics, onBack, onOfficeSelect, onBeeHubSelect }) {
    root.innerHTML = `
      <div class="panel-head">
        <p class="eyebrow">Office level</p>
        <h2>${office.name}</h2>
        <p class="muted">${city ? `${city.name} · ` : ''}${office.officeType || office.category || 'Office'} · ${office.status || 'unknown'}</p>
      </div>

      <div class="metric-grid">
        ${renderMetricCard('Sales', formatCurrency(metrics.salesTotal))}
        ${renderMetricCard('Subjects', formatNumber(metrics.subjectCount))}
        ${renderMetricCard('beeHubs', formatNumber(metrics.beeHubCount))}
        ${renderMetricCard('Team size', formatNumber(office.teamSize || 0))}
      </div>

      <section class="panel-section">
        <h3>Office details</h3>
        <div class="key-value"><span>Name</span><b>${office.name}</b></div>
        <div class="key-value"><span>City</span><b>${city?.name || '—'}</b></div>
        <div class="key-value"><span>Country</span><b>${city?.country || '—'}</b></div>
        <div class="key-value"><span>Address</span><b>${office.address || '—'}</b></div>
        <div class="key-value"><span>Type</span><b>${office.officeType || office.category || '—'}</b></div>
        <div class="key-value"><span>Parent office</span><b>${office.parentOfficeId || '—'}</b></div>
        <div class="key-value"><span>Status</span><b>${office.status || '—'}</b></div>
        <div class="key-value"><span>Team size</span><b>${formatNumber(office.teamSize || 0)}</b></div>
      </section>

      <section class="panel-section">
        <h3>Related beeHubs</h3>
        <div class="scroll-box city-scroll">
          ${metrics.beeHubs.length ? metrics.beeHubs.map((beeHub) => renderBeeHubButton(beeHub, false)).join('') : '<div class="empty-state">No beeHubs are linked to this office.</div>'}
        </div>
      </section>

      ${onBack ? `<button id="backBtn" class="btn btn-back-office btn-full">Back to office directory</button>` : ''}
    `;

    if (onBack) {
      root.querySelector('#backBtn')?.addEventListener('click', onBack);
    }

    bindSelections(root, { beeHubs: metrics.beeHubs, onOfficeSelect, onBeeHubSelect });
  }

  return {
    renderOverview,
    renderCityDetail,
    renderOfficeDirectory,
    renderOfficeDetail,
  };
}

function renderMetricCard(label, value, subtitle = '') {
  return `
    <div class="metric-card">
      <span class="metric-label">${label}</span>
      <strong class="metric-value">${value}</strong>
      ${subtitle ? `<span class="metric-subtitle">${subtitle}</span>` : ''}
    </div>
  `;
}

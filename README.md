# Geospatial Dashboard

A lightweight, API-ready Leaflet dashboard built with static JSON for now.

## What is included

- Leaflet + OpenStreetMap map
- 10 cities with population data
- City and office drill-down
- Searchable city filter and country filter
- Independent scrolling for city list and KPI list
- Sidebar details panel
- Reset button
- City layer / Office layer switching
- Data loading separated from rendering logic

## How it works

Default view shows all cities on the map. Click a city marker or a city name in the sidebar to drill into that city and show its offices on the map. Click an office to see its details in the panel. Use Reset to return to the default city view.

## Switching to an API later

The UI reads everything through `loadAllData()` in `services/dataService.js`. To replace the static JSON files later, keep the same response shape and point `window.GEO_DASHBOARD_API_BASE_URL` to your backend.

Example:

```html
<script>
  window.GEO_DASHBOARD_API_BASE_URL = 'https://your-domain.com/api';
</script>
```

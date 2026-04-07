# Geo Dashboard — Phase 2

A lightweight, static **Location Intelligence Dashboard** built with **HTML, CSS, and vanilla JavaScript**. It uses **Leaflet** for the map and loads data from local JSON files by default, with an easy path to switch to an API later.

This phase focuses on **city-level and office-level drill-down**, filter-driven exploration, and clean separation between data loading, filtering, map rendering, and sidebar rendering.

## What the dashboard does

- Shows a global map using **Leaflet + OpenStreetMap**.
- Displays a **city layer** and an **office layer**.
- Lets users search cities by name and filter by country.
- Supports **drill-down from city to office**.
- Shows a right-side details panel for overview, city, and office states.
- Loads supporting metrics from **cities, offices, incidents, sales, KPIs, and settings** JSON files.
- Uses a modular structure so map logic, filtering logic, and UI rendering stay separate.

## Project type

- Static site, no build step required
- No React, no npm dependency for runtime
- Uses ES modules in the browser
- Requires a local server because the app fetches JSON files with `fetch()`

## Folder structure

```text
geo-dashboard/
├── index.html
├── app.js
├── README.md
├── assets/
│   ├── icons/
│   │   └── .gitkeep
│   └── images/
│       └── .gitkeep
├── components/
│   ├── filters/
│   │   └── layerControls.js
│   ├── map/
│   │   └── mapView.js
│   ├── markers/
│   │   ├── cityMarkers.js
│   │   └── officeMarkers.js
│   └── sidebar/
│       └── detailsPanel.js
├── data/
│   ├── cities.json
│   ├── offices.json
│   ├── incidents.json
│   ├── sales.json
│   ├── kpis.json
│   └── settings.json
├── services/
│   ├── dataService.js
│   ├── filterService.js
│   └── mapService.js
└── styles/
    └── style.css
```

### What each part does

| Path | Purpose |
| --- | --- |
| `index.html` | Main page shell. Loads Leaflet, the app stylesheet, and the main JavaScript module. |
| `app.js` | Application entry point. Controls app state, view switching, filters, selection, and rendering flow. |
| `styles/style.css` | All layout and visual styling. |
| `services/dataService.js` | Loads local JSON files or API data using one common interface. |
| `services/filterService.js` | Contains filtering, grouping, KPI calculations, and formatting helpers. |
| `services/mapService.js` | Handles Leaflet layer management and marker rendering. |
| `components/map/mapView.js` | Creates the Leaflet map and handles base map behavior. |
| `components/markers/cityMarkers.js` | Builds city markers. |
| `components/markers/officeMarkers.js` | Builds office markers. |
| `components/sidebar/detailsPanel.js` | Renders the overview, drill-down panels, lists, and KPI cards. |
| `components/filters/layerControls.js` | Handles the city/office layer buttons and reset button behavior. |
| `data/*.json` | Static datasets used by the dashboard. |
| `assets/` | Reserved for future images and icons. |

## Data files

The dashboard loads these datasets from `data/` by default:

### `cities.json`
City records used for the main map layer and city drill-down.

Typical fields:
- `id`
- `name`
- `country`
- `region`
- `lat`
- `lng`
- `population`
- `status`

### `offices.json`
Office records used for the office layer and office drill-down.

Typical fields:
- `id`
- `cityId`
- `name`
- `address`
- `lat`
- `lng`
- `status`
- `teamSize`
- `category`
- `phone`

### `incidents.json`
Operational incident records.

Typical fields:
- `id`
- `cityId`
- `officeId`
- `category`
- `severity`
- `status`
- `date`
- `title`

### `sales.json`
Sales records tied to cities and offices.

Typical fields:
- `id`
- `cityId`
- `officeId`
- `period`
- `amount`
- `currency`
- `dealCount`

### `kpis.json`
KPI records for cities and offices.

Typical fields:
- `id`
- `entityType` (`city` or `office`)
- `entityId`
- `name`
- `value`
- `unit`
- `period`

### `settings.json`
Dashboard configuration.

Typical fields:
- `defaultLayer`
- `map.center`
- `map.zoom`
- `map.minZoom`
- `map.maxZoom`
- `markerStyles.city`
- `markerStyles.office`

## How the dashboard works

The app is driven by a single state object inside `app.js`.

### Main interaction flow

1. **Default view** loads the city layer.
2. User filters cities using search and country selection.
3. Clicking a city marker or city list item opens **city drill-down**.
4. Clicking an office marker or office list item opens **office drill-down**.
5. The **City layer / Office layer** buttons switch the map mode.
6. **Reset** clears filters and returns to the default view.

### Rendering logic

- **City layer**
  - Shows city markers by default.
  - Clicking a city shows its offices on the map and city-specific metrics in the sidebar.
  - Clicking an office opens office details.

- **Office layer**
  - Shows offices for the current filter scope.
  - Clicking an office opens its details in the sidebar.
  - Changing country or city search recalculates visible offices.

### Metrics shown in the UI

The sidebar can show:
- total cities
- total offices
- total incidents
- total sales
- KPI counts and KPI summaries
- city-level drill-down metrics
- office-level drill-down metrics

## Local run instructions

This project must be served from a local web server. Opening `index.html` directly from disk can break `fetch()`.

### Recommended command

```bash
python -m http.server 8000
```

### Windows fallback

```bash
py -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Make sure you run the server from the **`geo-dashboard/`** folder.

## How to use the dashboard

- Use **City layer** to explore cities first.
- Use **Office layer** to focus on offices.
- Search by city name in the sidebar.
- Filter by country.
- Click any city or office marker on the map.
- Click any city or office item in the sidebar list.
- Use **Reset** to return to the default state.

## API-ready data loading

The app loads data through `services/dataService.js`.

By default it reads local files from `./data`.

To switch to an API later, define:

```html
<script>
  window.GEO_DASHBOARD_API_BASE_URL = 'https://your-domain.com/api';
</script>
```

Place that script before `app.js` runs.

### Expected API format

Each endpoint should return either:

- a plain array of objects, or
- an object containing the dataset under the matching key, for example `{ cities: [...] }`

The app currently expects these resources:

- `cities`
- `offices`
- `incidents`
- `sales`
- `kpis`
- `settings`

## File responsibilities in more detail

### `app.js`

Main orchestration file. It:
- loads all datasets
- stores app state
- switches between city and office layers
- handles search and country filtering
- manages drill-down and back navigation
- rerenders the sidebar and map after every state change

### `services/dataService.js`

Responsible for data loading only.

It exposes:
- `loadDataset(name)`
- `loadAllData()`

It reads the base URL from `window.GEO_DASHBOARD_API_BASE_URL` when present, otherwise it uses `./data`.

### `services/filterService.js`

Contains the data logic used by the dashboard, including:
- city filtering
- unique country extraction
- office lookup by city
- incident, sales, and KPI aggregation
- overview metric building
- city metrics
- office metrics
- KPI formatting and summarization
- number and currency formatting

### `services/mapService.js`

Manages Leaflet layers and marker rendering.

It supports:
- city rendering
- office rendering
- switching active layers
- resetting the map view
- opening an office popup after selection

### `components/sidebar/detailsPanel.js`

Builds the right-side content for:
- dashboard overview
- city drill-down
- office drill-down
- office directory in office layer

### `components/filters/layerControls.js`

Connects the layer buttons and the reset button to the app state.

### `components/map/mapView.js`

Creates the Leaflet map, adds the OpenStreetMap tile layer, and fits the map to the visible points.

### `components/markers/*.js`

Contains reusable marker builders:
- city circle markers
- office pin markers

## Deployment notes

Because this is a static dashboard:

- It can be hosted on any static hosting provider.
- GitHub Pages works well.
- The project must include the `data/` folder if you want to use local JSON files.
- If you move to an API, you only need to update the API base URL and keep the response shape compatible.

## Troubleshooting

### Blank page or data not loading

- Confirm you started a local server.
- Confirm you are serving from the `geo-dashboard/` directory.
- Check the browser console for fetch errors.

### Map appears but tiles do not load

- OpenStreetMap tiles require internet access.
- The app also loads Leaflet from a CDN.

### No markers appear

- Confirm the JSON files exist in `data/`.
- Confirm the data is valid JSON.
- Confirm city coordinates and office coordinates are present.

### Filter results look empty

- Check the city search text.
- Check the country filter.
- Use Reset to return to a clean state.

### API migration issues

- Make sure the API returns arrays or keyed objects.
- Make sure field names match the existing JSON structure.
- Make sure `settings.json`-style values are still available for map defaults.

## Summary

Phase 2 is a modular geospatial dashboard with:

- a city layer
- an office layer
- drill-down navigation
- searchable filters
- data-driven metrics
- local JSON loading
- API-ready architecture

It is designed to stay lightweight while still being easy to extend.

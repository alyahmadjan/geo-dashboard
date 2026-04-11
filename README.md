# Geo Dashboard — Phase 2

A lightweight, static **Location Intelligence Dashboard** built with **HTML, CSS, and vanilla JavaScript**. It uses **Leaflet** for the map and loads data from local JSON files by default, with an easy path to switch to an API later.

This phase focuses on **city-level and office-level drill-down**, plus additional **beeHub**, **Sales heatmap**, and **Subject heatmap** layers. The app keeps the existing city and office flow intact while adding modular support for the new layers.

## What the dashboard does

- Shows a global map using **Leaflet + OpenStreetMap**.
- Displays a **city layer**, **office layer**, **beeHub layer**, **Sales heatmap**, and **Subject heatmap**.
- Lets users search cities by name and filter by country.
- Supports **drill-down from city to office**.
- Adds beeHub region filtering, sales demand aggregation, and subject temporal filtering.
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
│   │   ├── heatLayer.js
│   │   └── mapView.js
│   ├── markers/
│   │   ├── beeHubMarkers.js
│   │   ├── cityMarkers.js
│   │   └── officeMarkers.js
│   └── sidebar/
│       └── detailsPanel.js
├── data/
│   ├── beeHubs.json
│   ├── cities.json
│   ├── incidents.json
│   ├── kpis.json
│   ├── offices.json
│   ├── sales.json
│   ├── subjects.json
│   └── settings.json
├── services/
│   ├── dataService.js
│   ├── filterService.js
│   └── mapService.js
└── styles/
    └── style.css
```

## Local run instructions

This project must be served from a local web server. Opening `index.html` directly from disk can break `fetch()`.

### Recommended command

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Make sure you run the server from the **`geo-dashboard/`** folder.

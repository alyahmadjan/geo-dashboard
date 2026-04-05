# Geo Dashboard MVP+

Leaflet + OpenStreetMap demo with:
- filters
- heatmap toggle
- drill-down analytics panel
- API-ready data service
- 

## Structure

```text
geo-dashboard/
├── index.html
├── app.js
├── data/
│   └── cities.json
├── services/
│   └── dataService.js
├── styles/
│   └── style.css
└── README.md
```

## Run locally

From inside the `geo-dashboard` folder:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Live data integration

By default, the app loads `data/cities.json`.

To point it at your own API later, set this before `app.js` runs:

```html
<script>
  window.GEO_DASHBOARD_API_URL = 'https://your-domain.com/api/cities';
</script>
```

Then make sure the API returns either:
- an array of city objects, or
- `{ "cities": [...] }`

## What changed for Phase 2 features

### 1) Interactive filters
Changed files:
- `index.html` → added search, country, and population controls
- `app.js` → added filter state and re-render logic
- `styles/style.css` → added control and panel styling

### 2) Heatmap
Changed files:
- `index.html` → added Leaflet.heat script
- `app.js` → added a heat layer and toggle handling

### 3) Drill-down analytics
Changed files:
- `app.js` → added the right-side details panel and city analytics view
- `index.html` → added the details panel container

### 4) Live data integration
Changed files:
- `services/dataService.js` → data now loads from a configurable URL
- `README.md` → explains how to switch to your own backend

## Notes

- The app still uses Leaflet + OpenStreetMap for the base map.
- If you open `index.html` directly from disk, `fetch()` may be blocked. Use a local server.

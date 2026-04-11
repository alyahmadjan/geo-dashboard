export function createHeatLayer(points = [], options = {}) {
  const HeatLayer = L.Layer.extend({
    initialize(initialPoints = [], layerOptions = {}) {
      this._points = initialPoints;
      this.options = {
        radius: 42,
        blur: 28,
        maxOpacity: 0.75,
        minOpacity: 0.12,
        intensityScale: 1,
        gradient: {
          0.15: 'rgba(255,255,255,0)',
          0.35: 'rgba(59,130,246,0.22)',
          0.55: 'rgba(34,197,94,0.42)',
          0.75: 'rgba(250,204,21,0.62)',
          1: 'rgba(239,68,68,0.86)',
        },
        ...layerOptions,
      };
    },

    onAdd(map) {
      this._map = map;
      this._canvas = L.DomUtil.create('canvas', 'leaflet-heat-layer');
      this._canvas.style.position = 'absolute';
      this._canvas.style.pointerEvents = 'none';
      this._ctx = this._canvas.getContext('2d');
      map.getPanes().overlayPane.appendChild(this._canvas);
      map.on('moveend zoomend resize', this._reset, this);
      this._reset();
    },

    onRemove(map) {
      map.off('moveend zoomend resize', this._reset, this);
      if (this._canvas && this._canvas.parentNode) {
        this._canvas.parentNode.removeChild(this._canvas);
      }
      this._canvas = null;
      this._ctx = null;
      this._map = null;
    },

    setPoints(points = []) {
      this._points = points;
      this._redraw();
    },

    _reset() {
      if (!this._map || !this._canvas) return;
      const size = this._map.getSize();
      this._canvas.width = size.x;
      this._canvas.height = size.y;
      const topLeft = this._map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(this._canvas, topLeft);
      this._redraw();
    },

    _getMaxWeight() {
      return this._points.reduce((max, point) => Math.max(max, Number(point.weight || 1)), 1);
    },

    _resolveRadius(weightRatio) {
      const baseRadius = Number(this.options.radius || 42);
      const blur = Number(this.options.blur || 28);
      return baseRadius + blur * Math.max(weightRatio, 0.2);
    },

    _buildGradient(ctx, radius) {
      const gradient = ctx.createRadialGradient(radius, radius, radius * 0.15, radius, radius, radius);
      const stops = Object.entries(this.options.gradient || {}).sort((a, b) => Number(a[0]) - Number(b[0]));
      stops.forEach(([stop, color]) => gradient.addColorStop(Number(stop), color));
      return gradient;
    },

    _redraw() {
      if (!this._map || !this._ctx || !this._canvas) return;

      const ctx = this._ctx;
      ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

      if (!Array.isArray(this._points) || this._points.length === 0) {
        return;
      }

      const maxWeight = this._getMaxWeight();
      ctx.globalCompositeOperation = 'source-over';

      for (const point of this._points) {
        const lat = Number(point.lat);
        const lng = Number(point.lng);
        const weight = Number(point.weight || 1);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const projected = this._map.latLngToContainerPoint([lat, lng]);
        if (!projected || projected.x < -150 || projected.y < -150 || projected.x > this._canvas.width + 150 || projected.y > this._canvas.height + 150) {
          continue;
        }

        const ratio = Math.min(weight / maxWeight, 1);
        const radius = this._resolveRadius(ratio);
        const alpha = Math.min(Number(this.options.minOpacity || 0.12) + ratio * Number(this.options.maxOpacity || 0.75), 0.95);
        const gradient = this._buildGradient(ctx, radius);

        ctx.save();
        ctx.globalAlpha = alpha * Number(this.options.intensityScale || 1);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    },
  });

  return new HeatLayer(points, options);
}

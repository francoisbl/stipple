"use strict";
var MaplibrePatternFills = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    DASH_PRESETS: () => DASH_PRESETS,
    addSvgIcon: () => addSvgIcon,
    buildIconStyleFragment: () => buildIconStyleFragment,
    buildLineStyleFragment: () => buildLineStyleFragment,
    buildStyleFragment: () => buildStyleFragment,
    createMiniContext: () => createMiniContext,
    createSvgScatterTile: () => createSvgScatterTile,
    hashStringToSeed: () => hashStringToSeed,
    installIconStyles: () => installIconStyles,
    installPatternFills: () => installPatternFills,
    installSvgIconScatter: () => installSvgIconScatter,
    installSvgPatternFill: () => installSvgPatternFill,
    makeTile: () => makeTile,
    mulberry32: () => mulberry32,
    scatterIconPoints: () => scatterIconPoints,
    scatterPointsInPolygon: () => scatterPointsInPolygon,
    syncPatternTexture: () => syncPatternTexture
  });

  // src/engine/miniContext.ts
  function parseColor(v) {
    const hex = v.match(/^#([0-9a-f]{6})$/i);
    if (hex) {
      const n = parseInt(hex[1], 16);
      return { r: n >> 16 & 255, g: n >> 8 & 255, b: n & 255, a: 1 };
    }
    const rgba = v.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i);
    if (rgba) {
      return { r: +rgba[1], g: +rgba[2], b: +rgba[3], a: rgba[4] !== void 0 ? +rgba[4] : 1 };
    }
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  var clamp01 = (v) => Math.max(0, Math.min(1, v));
  function createMiniContext(size) {
    const buf = new Uint8ClampedArray(size * size * 4);
    let strokeColor = { r: 0, g: 0, b: 0, a: 1 };
    let fillColor = { r: 0, g: 0, b: 0, a: 1 };
    let lineWidth = 1;
    let subpaths = [];
    let pendingArc = null;
    function setPixel(x, y, c) {
      if (x < 0 || y < 0 || x >= size || y >= size || c.a <= 0) return;
      const i = (y * size + x) * 4;
      if (c.a >= 1) {
        buf[i] = c.r;
        buf[i + 1] = c.g;
        buf[i + 2] = c.b;
        buf[i + 3] = 255;
        return;
      }
      const dstA = buf[i + 3] / 255;
      const outA = c.a + dstA * (1 - c.a);
      if (outA <= 0) return;
      buf[i] = (c.r * c.a + buf[i] * dstA * (1 - c.a)) / outA;
      buf[i + 1] = (c.g * c.a + buf[i + 1] * dstA * (1 - c.a)) / outA;
      buf[i + 2] = (c.b * c.a + buf[i + 2] * dstA * (1 - c.a)) / outA;
      buf[i + 3] = outA * 255;
    }
    function strokeSegment(x0, y0, x1, y1) {
      const half = lineWidth / 2;
      const minX = Math.max(0, Math.floor(Math.min(x0, x1) - half - 1));
      const maxX = Math.min(size - 1, Math.ceil(Math.max(x0, x1) + half + 1));
      const minY = Math.max(0, Math.floor(Math.min(y0, y1) - half - 1));
      const maxY = Math.min(size - 1, Math.ceil(Math.max(y0, y1) + half + 1));
      const dx = x1 - x0;
      const dy = y1 - y0;
      const lenSq = dx * dx + dy * dy;
      for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
          const cx = px + 0.5;
          const cy = py + 0.5;
          let t = lenSq === 0 ? 0 : ((cx - x0) * dx + (cy - y0) * dy) / lenSq;
          t = clamp01(t);
          const projX = x0 + t * dx;
          const projY = y0 + t * dy;
          const dist = Math.hypot(cx - projX, cy - projY);
          const coverage = clamp01(half + 0.5 - dist);
          if (coverage > 0) setPixel(px, py, { ...strokeColor, a: strokeColor.a * coverage });
        }
      }
    }
    function fillCircle(cx, cy, r) {
      const minX = Math.max(0, Math.floor(cx - r - 1));
      const maxX = Math.min(size - 1, Math.ceil(cx + r + 1));
      const minY = Math.max(0, Math.floor(cy - r - 1));
      const maxY = Math.min(size - 1, Math.ceil(cy + r + 1));
      for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
          const dist = Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
          const coverage = clamp01(r + 0.5 - dist);
          if (coverage > 0) setPixel(px, py, { ...fillColor, a: fillColor.a * coverage });
        }
      }
    }
    const ctx = {
      get strokeStyle() {
        return `rgba(${strokeColor.r},${strokeColor.g},${strokeColor.b},${strokeColor.a})`;
      },
      set strokeStyle(v) {
        strokeColor = parseColor(v);
      },
      get fillStyle() {
        return `rgba(${fillColor.r},${fillColor.g},${fillColor.b},${fillColor.a})`;
      },
      set fillStyle(v) {
        fillColor = parseColor(v);
      },
      get lineWidth() {
        return lineWidth;
      },
      set lineWidth(v) {
        lineWidth = v;
      },
      lineCap: "round",
      clearRect() {
        buf.fill(0);
      },
      beginPath() {
        subpaths = [];
        pendingArc = null;
      },
      moveTo(x, y) {
        subpaths.push([{ x, y }]);
      },
      lineTo(x, y) {
        const current = subpaths[subpaths.length - 1];
        if (current) current.push({ x, y });
      },
      stroke() {
        for (const sp of subpaths) {
          for (let i = 1; i < sp.length; i++) strokeSegment(sp[i - 1].x, sp[i - 1].y, sp[i].x, sp[i].y);
        }
      },
      arc(x, y, radius) {
        pendingArc = { x, y, r: radius };
      },
      fill() {
        if (pendingArc) fillCircle(pendingArc.x, pendingArc.y, pendingArc.r);
      }
    };
    return {
      ctx,
      toTileImage: () => ({ width: size, height: size, data: new Uint8Array(buf.buffer) })
    };
  }

  // src/engine/makeTile.ts
  function defaultContextFactory(size) {
    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const canvasCtx = canvas.getContext("2d");
      if (!canvasCtx) throw new Error("2D canvas context unavailable");
      return {
        ctx: canvasCtx,
        toTileImage: () => {
          const img = canvasCtx.getImageData(0, 0, size, size);
          return { width: size, height: size, data: new Uint8Array(img.data.buffer) };
        }
      };
    }
    return createMiniContext(size);
  }
  function makeTile(pattern, size, color, weight, angle, options = {}) {
    const { ctx, toTileImage } = (options.contextFactory ?? defaultContextFactory)(size);
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = weight;
    ctx.lineCap = "round";
    const drawHachures = (deg) => {
      ctx.beginPath();
      const step = Math.max(size / 2, 4);
      if (deg === 0) {
        for (let y = 0; y <= size; y += step) {
          ctx.moveTo(0, y + 0.5);
          ctx.lineTo(size, y + 0.5);
        }
      } else if (deg === 90) {
        for (let x = 0; x <= size; x += step) {
          ctx.moveTo(x + 0.5, 0);
          ctx.lineTo(x + 0.5, size);
        }
      } else if (deg === 45) {
        for (let o = -size; o <= size * 2; o += step) {
          ctx.moveTo(o, 0);
          ctx.lineTo(o + size, size);
        }
      } else {
        for (let o = -size; o <= size * 2; o += step) {
          ctx.moveTo(o + size, 0);
          ctx.lineTo(o, size);
        }
      }
      ctx.stroke();
    };
    switch (pattern) {
      case "hachures":
        drawHachures(angle);
        break;
      case "cross":
        drawHachures(angle);
        drawHachures((angle + 90 + 45) % 180 - 45);
        break;
      case "grid": {
        ctx.beginPath();
        ctx.moveTo(0.5, 0);
        ctx.lineTo(0.5, size);
        ctx.moveTo(0, 0.5);
        ctx.lineTo(size, 0.5);
        ctx.stroke();
        break;
      }
      case "stipple": {
        const r = weight * 0.6;
        const cells = Math.max(2, Math.round(size / 6));
        const s = size / cells;
        for (let i = 0; i < cells; i++) {
          for (let j = 0; j < cells; j++) {
            const cx = (i + (j % 2 ? 0.75 : 0.25)) * s;
            const cy = (j + 0.5) * s;
            ctx.beginPath();
            ctx.arc(cx % size, cy % size, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }
      case "dots": {
        const r = Math.max(weight * 0.5, 1);
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "solid":
        break;
    }
    return toTileImage();
  }

  // src/engine/seededRandom.ts
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function next() {
      a |= 0;
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hashStringToSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = h << 13 | h >>> 19;
    }
    return (h ^ h >>> 16) >>> 0;
  }

  // src/engine/scatterPoints.ts
  function isInsideRings(x, y, rings) {
    let inside = false;
    for (const ring of rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        const crosses = yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi;
        if (crosses) inside = !inside;
      }
    }
    return inside;
  }
  function discFitsInside(x, y, radius, rings, samples) {
    if (!isInsideRings(x, y, rings)) return false;
    for (let k = 0; k < samples; k++) {
      const angle = k / samples * Math.PI * 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (!isInsideRings(px, py, rings)) return false;
    }
    return true;
  }
  function scatterPointsInPolygon(rings, options) {
    const {
      radius,
      density = 1,
      seed = 1,
      samples = 12,
      rotationJitterDeg = 0,
      scaleJitter = 0,
      positionJitter = 0.15,
      stagger = true
    } = options;
    const exterior = rings[0] ?? [];
    if (exterior.length === 0) return [];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of exterior) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const seedNum = typeof seed === "string" ? hashStringToSeed(seed) : seed;
    const rand = mulberry32(seedNum);
    const cell = 100 / Math.sqrt(density);
    const points = [];
    let row = 0;
    for (let y = minY; y <= maxY; y += cell, row++) {
      const rowOffset = stagger && row % 2 === 1 ? cell / 2 : 0;
      for (let x = minX; x <= maxX; x += cell) {
        const jx = x + rowOffset + (rand() - 0.5) * cell * positionJitter;
        const jy = y + (rand() - 0.5) * cell * positionJitter;
        const rotation = (rand() * 2 - 1) * rotationJitterDeg;
        const scale = 1 + (rand() * 2 - 1) * scaleJitter;
        if (discFitsInside(jx, jy, radius * scale, rings, samples)) points.push({ x: jx, y: jy, rotation, scale });
      }
    }
    return points;
  }

  // src/maplibre/types.ts
  var DASH_PRESETS = {
    solid: [],
    dotted: [1, 2],
    dashdot: [4, 2, 1, 2]
  };

  // src/maplibre/syncPatternTexture.ts
  var signatures = /* @__PURE__ */ new WeakMap();
  function syncPatternTexture(map, options) {
    const { imageId, pattern, size, color, weight, angle } = options;
    if (pattern === "solid") return;
    let bySource = signatures.get(map);
    if (!bySource) {
      bySource = /* @__PURE__ */ new Map();
      signatures.set(map, bySource);
    }
    const signature = `${pattern}@${size}`;
    const tile = makeTile(pattern, size, color, weight, angle);
    if (map.hasImage(imageId) && bySource.get(imageId) === signature) {
      map.updateImage(imageId, tile);
    } else {
      if (map.hasImage(imageId)) map.removeImage(imageId);
      map.addImage(imageId, tile);
      bySource.set(imageId, signature);
    }
    map.triggerRepaint();
  }

  // src/maplibre/buildStyleFragment.ts
  function buildStyleFragment(options) {
    const { source, sourceLayer, sourceUrl, bg, pattern, line } = options;
    const layers = [];
    if (bg?.enabled) {
      layers.push({
        id: `${source}__bg`,
        type: "fill",
        source,
        "source-layer": sourceLayer,
        paint: { "fill-color": bg.color, "fill-opacity": bg.opacity }
      });
    }
    if (pattern.pattern === "solid") {
      layers.push({
        id: `${source}__pat`,
        type: "fill",
        source,
        "source-layer": sourceLayer,
        paint: { "fill-color": pattern.color, "fill-opacity": pattern.opacity }
      });
    } else {
      const imageId = `${source}__pat_img`;
      layers.push({
        id: `${source}__pat`,
        type: "fill",
        source,
        "source-layer": sourceLayer,
        paint: { "fill-pattern": imageId, "fill-opacity": pattern.opacity },
        metadata: {
          "enhanced:pattern": {
            type: pattern.pattern,
            tile: pattern.tile,
            color: pattern.color,
            weight: pattern.weight,
            angle: pattern.angle,
            imageId
          }
        }
      });
    }
    if (line?.enabled) {
      layers.push({
        id: `${source}__line`,
        type: "line",
        source,
        "source-layer": sourceLayer,
        paint: {
          "line-color": line.color,
          "line-width": line.width,
          ...line.dash.length ? { "line-dasharray": line.dash } : {}
        }
      });
    }
    return {
      sources: { [source]: { type: "vector", url: sourceUrl ?? `<url>/${source}` } },
      layers
    };
  }

  // src/maplibre/buildLineStyleFragment.ts
  function buildLineStyleFragment(options) {
    const { source, sourceLayer, sourceUrl, line } = options;
    const layers = [];
    if (line.enabled) {
      layers.push({
        id: `${source}__line`,
        type: "line",
        source,
        "source-layer": sourceLayer,
        paint: {
          "line-color": line.color,
          "line-width": line.width,
          ...line.dash.length ? { "line-dasharray": line.dash } : {}
        }
      });
    }
    return {
      sources: { [source]: { type: "vector", url: sourceUrl ?? `<url>/${source}` } },
      layers
    };
  }

  // src/maplibre/iconStyleFragment.ts
  function buildIconStyleFragment(options) {
    const { source, sourceLayer, sourceUrl, icon, rotationDeg } = options;
    const layers = [
      {
        id: `${source}__icon`,
        type: "symbol",
        source,
        "source-layer": sourceLayer,
        layout: {
          "icon-image": icon.imageId,
          "icon-allow-overlap": true,
          ...rotationDeg ? { "icon-rotate": rotationDeg } : {}
        },
        metadata: {
          "enhanced:icon": { svg: icon.svg, size: icon.size, imageId: icon.imageId }
        }
      }
    ];
    return {
      sources: { [source]: { type: "vector", url: sourceUrl ?? `<url>/${source}` } },
      layers
    };
  }

  // src/maplibre/installPatternFills.ts
  function installPatternFills(map, style) {
    for (const layer of style.layers) {
      const p = layer.metadata?.["enhanced:pattern"];
      if (!p) continue;
      syncPatternTexture(map, {
        imageId: p.imageId,
        pattern: p.type,
        size: p.tile,
        color: p.color,
        weight: p.weight,
        angle: p.angle
      });
    }
  }

  // src/maplibre/loadSvgImage.ts
  async function loadSvgImage(svg) {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // src/maplibre/svgIcon.ts
  async function addSvgIcon(map, options) {
    const { id, svg, size = 32, pixelRatio = 2 } = options;
    const image = await loadSvgImage(svg);
    const px = Math.round(size * pixelRatio);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = px;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    ctx.clearRect(0, 0, px, px);
    ctx.drawImage(image, 0, 0, px, px);
    const imageData = ctx.getImageData(0, 0, px, px);
    const tile = { width: px, height: px, data: new Uint8Array(imageData.data.buffer) };
    if (map.hasImage(id)) map.removeImage(id);
    map.addImage(id, tile, { pixelRatio });
    return { id, width: px, height: px };
  }

  // src/maplibre/installIconStyles.ts
  async function installIconStyles(map, style) {
    for (const layer of style.layers) {
      const meta = layer.metadata?.["enhanced:icon"];
      if (!meta) continue;
      await addSvgIcon(map, { id: meta.imageId, svg: meta.svg, size: meta.size });
    }
  }

  // src/maplibre/svgPattern.ts
  async function createSvgScatterTile(options) {
    const {
      svg,
      tileSize = 192,
      stampSize = 28,
      density = 1.4,
      seed = 1,
      rotationJitterDeg = 0,
      scaleJitter = 0,
      positionJitter = 0.15,
      stagger = true
    } = options;
    const image = await loadSvgImage(svg);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = tileSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    ctx.clearRect(0, 0, tileSize, tileSize);
    const seedNum = typeof seed === "string" ? hashStringToSeed(seed) : seed;
    const rand = mulberry32(seedNum);
    const cell = 100 / Math.sqrt(density);
    const cols = Math.ceil(tileSize / cell);
    let rows = Math.ceil(tileSize / cell);
    if (stagger && rows % 2 !== 0) rows += 1;
    const margin = stampSize;
    const stamp = (cx, cy) => {
      const rotation = (rand() * 2 - 1) * rotationJitterDeg * (Math.PI / 180);
      const scale = 1 + (rand() * 2 - 1) * scaleJitter;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);
      ctx.drawImage(image, -stampSize / 2, -stampSize / 2, stampSize, stampSize);
      ctx.restore();
    };
    for (let row = 0; row < rows; row++) {
      const rowOffset = stagger && row % 2 === 1 ? cell / 2 : 0;
      for (let col = 0; col < cols; col++) {
        const jitterX = (rand() - 0.5) * cell * positionJitter;
        const jitterY = (rand() - 0.5) * cell * positionJitter;
        const cx = col * cell + cell / 2 + rowOffset + jitterX;
        const cy = row * cell + cell / 2 + jitterY;
        stamp(cx, cy);
        const nearLeft = cx < margin;
        const nearRight = cx > tileSize - margin;
        const nearTop = cy < margin;
        const nearBottom = cy > tileSize - margin;
        if (nearLeft) stamp(cx + tileSize, cy);
        if (nearRight) stamp(cx - tileSize, cy);
        if (nearTop) stamp(cx, cy + tileSize);
        if (nearBottom) stamp(cx, cy - tileSize);
        if (nearLeft && nearTop) stamp(cx + tileSize, cy + tileSize);
        if (nearRight && nearTop) stamp(cx - tileSize, cy + tileSize);
        if (nearLeft && nearBottom) stamp(cx + tileSize, cy - tileSize);
        if (nearRight && nearBottom) stamp(cx - tileSize, cy - tileSize);
      }
    }
    const imageData = ctx.getImageData(0, 0, tileSize, tileSize);
    return { width: tileSize, height: tileSize, data: new Uint8Array(imageData.data.buffer) };
  }
  async function installSvgPatternFill(map, options) {
    const tile = await createSvgScatterTile(options);
    if (map.hasImage(options.imageId)) map.removeImage(options.imageId);
    map.addImage(options.imageId, tile);
    map.triggerRepaint();
  }

  // src/maplibre/scatterIconPoints.ts
  function toRings(polygon) {
    return polygon.type === "Polygon" ? polygon.coordinates : polygon.coordinates.flat();
  }
  function scatterIconPoints(options) {
    const { map, polygon, iconRadiusPx, density, seed, samples, rotationJitterDeg, scaleJitter, positionJitter, stagger } = options;
    const pixelRings = toRings(polygon).map(
      (ring) => ring.map(([lng, lat]) => {
        const p = map.project([lng, lat]);
        return [p.x, p.y];
      })
    );
    const points = scatterPointsInPolygon(pixelRings, {
      radius: iconRadiusPx,
      density,
      seed,
      samples,
      rotationJitterDeg,
      scaleJitter,
      positionJitter,
      stagger
    });
    const features = points.map(({ x, y, rotation, scale }) => {
      const lngLat = map.unproject([x, y]);
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lngLat.lng, lngLat.lat] },
        properties: { rotation, scale }
      };
    });
    return { type: "FeatureCollection", features };
  }

  // src/maplibre/svgIconScatter.ts
  async function installSvgIconScatter(map, options) {
    const { sourceId, layerId, iconId, polygon, svg, size = 32, density, seed, rotationJitterDeg, scaleJitter, positionJitter, stagger } = options;
    await addSvgIcon(map, { id: iconId, svg, size });
    const points = scatterIconPoints({ map, polygon, iconRadiusPx: size / 2, density, seed, rotationJitterDeg, scaleJitter, positionJitter, stagger });
    const existingSource = map.getSource(sourceId);
    if (existingSource) {
      existingSource.setData(points);
    } else {
      map.addSource(sourceId, { type: "geojson", data: points });
    }
    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: "symbol",
        source: sourceId,
        layout: {
          "icon-image": iconId,
          "icon-rotate": ["get", "rotation"],
          "icon-size": ["get", "scale"],
          "icon-allow-overlap": true
        }
      });
    }
  }
  return __toCommonJS(src_exports);
})();
//# sourceMappingURL=index.global.js.map
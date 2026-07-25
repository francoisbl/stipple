"use strict";
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

// src/experimental.ts
var experimental_exports = {};
__export(experimental_exports, {
  installSvgIconScatter: () => installSvgIconScatter,
  scatterIconPoints: () => scatterIconPoints
});
module.exports = __toCommonJS(experimental_exports);

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
function squaredDistanceToSegment(x, y, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return (x - start[0]) ** 2 + (y - start[1]) ** 2;
  const projection = Math.max(
    0,
    Math.min(1, ((x - start[0]) * dx + (y - start[1]) * dy) / (dx * dx + dy * dy))
  );
  const nearestX = start[0] + projection * dx;
  const nearestY = start[1] + projection * dy;
  return (x - nearestX) ** 2 + (y - nearestY) ** 2;
}
function discFitsInside(x, y, radius, rings) {
  if (!isInsideRings(x, y, rings)) return false;
  const squaredRadius = radius * radius;
  for (const ring of rings) {
    for (let index = 0; index < ring.length; index++) {
      const start = ring[index];
      const end = ring[(index + 1) % ring.length];
      if (squaredDistanceToSegment(x, y, start, end) < squaredRadius) return false;
    }
  }
  return true;
}
function scatterPointsInPolygon(rings, options) {
  const {
    radius,
    density = 1,
    seed = 1,
    rotationJitterDeg = 0,
    scaleJitter = 0,
    positionJitter = 0.15,
    stagger = true,
    distribution = stagger ? "offset" : "regular",
    minSpacing = 0
  } = options;
  if (!Number.isFinite(radius) || radius < 0) {
    throw new RangeError("radius must be a finite number greater than or equal to 0");
  }
  if (!Number.isFinite(density) || density <= 0) {
    throw new RangeError("density must be a finite number greater than 0");
  }
  if (!Number.isFinite(rotationJitterDeg) || rotationJitterDeg < 0) {
    throw new RangeError("rotationJitterDeg must be a finite number greater than or equal to 0");
  }
  if (!Number.isFinite(scaleJitter) || scaleJitter < 0 || scaleJitter >= 1) {
    throw new RangeError("scaleJitter must be a finite number greater than or equal to 0 and less than 1");
  }
  if (!Number.isFinite(positionJitter) || positionJitter < 0) {
    throw new RangeError("positionJitter must be a finite number greater than or equal to 0");
  }
  if (!["regular", "offset", "natural"].includes(distribution)) {
    throw new TypeError("distribution must be regular, offset, or natural");
  }
  if (!Number.isFinite(minSpacing) || minSpacing < 0) {
    throw new RangeError("minSpacing must be a finite number greater than or equal to 0");
  }
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
  const width = maxX - minX;
  const height = maxY - minY;
  if (distribution === "natural") {
    const targetCount = Math.max(1, Math.round(density * width * height / 1e4));
    const minimumDistance = radius * 2 * (1 + scaleJitter) + minSpacing;
    const conservativeRadius = radius * (1 + scaleJitter);
    while (points.length < targetCount) {
      let best;
      let bestDistanceSquared = -1;
      for (let candidateIndex = 0; candidateIndex < 32; candidateIndex++) {
        const x = minX + rand() * width;
        const y = minY + rand() * height;
        if (!discFitsInside(x, y, conservativeRadius, rings)) continue;
        let nearestDistanceSquared = Infinity;
        for (const point of points) {
          const distanceSquared = (x - point.x) ** 2 + (y - point.y) ** 2;
          if (distanceSquared < nearestDistanceSquared) nearestDistanceSquared = distanceSquared;
        }
        if (nearestDistanceSquared > bestDistanceSquared) {
          best = [x, y];
          bestDistanceSquared = nearestDistanceSquared;
        }
      }
      if (!best || bestDistanceSquared < minimumDistance ** 2) break;
      points.push({
        x: best[0],
        y: best[1],
        rotation: (rand() * 2 - 1) * rotationJitterDeg,
        scale: 1 + (rand() * 2 - 1) * scaleJitter
      });
    }
    return points;
  }
  const columns = Math.max(1, Math.floor(width / cell));
  const rows = Math.max(1, Math.floor(height / cell));
  const startX = minX + (width - (columns - 1) * cell) / 2;
  const startY = minY + (height - (rows - 1) * cell) / 2;
  for (let row = 0; row < rows; row++) {
    const rowOffset = distribution === "offset" && columns > 1 ? row % 2 === 0 ? -cell / 4 : cell / 4 : 0;
    for (let column = 0; column < columns; column++) {
      const jitter = distribution === "offset" ? positionJitter : 0;
      const jx = startX + column * cell + rowOffset + (rand() - 0.5) * cell * jitter;
      const jy = startY + row * cell + (rand() - 0.5) * cell * jitter;
      const rotation = (rand() * 2 - 1) * rotationJitterDeg;
      const scale = 1 + (rand() * 2 - 1) * scaleJitter;
      if (discFitsInside(jx, jy, radius * scale, rings)) points.push({ x: jx, y: jy, rotation, scale });
    }
  }
  return points;
}

// src/maplibre/scatterIconPoints.ts
function toPolygons(polygon) {
  return polygon.type === "Polygon" ? [polygon.coordinates] : polygon.coordinates;
}
function componentSeed(seed, index) {
  const base = seed ?? 1;
  return typeof base === "string" ? `${base}:${index}` : base + Math.imul(index, 2654435761);
}
function scatterIconPoints(options) {
  const {
    map,
    polygon,
    iconRadiusPx,
    density,
    seed,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger,
    distribution,
    minSpacing
  } = options;
  const points = toPolygons(polygon).flatMap((polygonRings, polygonIndex) => {
    const pixelRings = polygonRings.map(
      (ring) => ring.map(([lng, lat]) => {
        const p = map.project([lng, lat]);
        return [p.x, p.y];
      })
    );
    return scatterPointsInPolygon(pixelRings, {
      radius: iconRadiusPx,
      density,
      seed: componentSeed(seed, polygonIndex),
      rotationJitterDeg,
      scaleJitter,
      positionJitter,
      stagger,
      distribution,
      minSpacing
    });
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

// src/maplibre/svgIconScatter.ts
async function installSvgIconScatter(map, options) {
  const {
    sourceId,
    layerId,
    iconId,
    polygon,
    svg,
    size = 32,
    density,
    seed,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger,
    distribution,
    minSpacing,
    opacity = 1,
    scaleMode = "screen"
  } = options;
  if (scaleMode !== "screen" && scaleMode !== "map") {
    throw new TypeError("scaleMode must be screen or map");
  }
  await addSvgIcon(map, { id: iconId, svg, size });
  const points = scatterIconPoints({
    map,
    polygon,
    iconRadiusPx: size / Math.SQRT2,
    density,
    seed,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger,
    distribution,
    minSpacing
  });
  const existingSource = map.getSource(sourceId);
  if (existingSource) {
    existingSource.setData(points);
  } else {
    map.addSource(sourceId, { type: "geojson", data: points });
  }
  const iconSize = scaleMode === "map" ? [
    "*",
    ["get", "scale"],
    [
      "interpolate",
      ["exponential", 2],
      ["zoom"],
      map.getZoom() - 8,
      1 / 256,
      map.getZoom(),
      1,
      map.getZoom() + 8,
      256
    ]
  ] : ["get", "scale"];
  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: "symbol",
      source: sourceId,
      layout: {
        "icon-image": iconId,
        "icon-rotate": ["get", "rotation"],
        "icon-size": iconSize,
        "icon-allow-overlap": true
      },
      paint: {
        "icon-opacity": opacity
      }
    });
  } else {
    map.setLayoutProperty(layerId, "icon-size", iconSize);
    map.setPaintProperty(layerId, "icon-opacity", opacity);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  installSvgIconScatter,
  scatterIconPoints
});
//# sourceMappingURL=experimental.cjs.map
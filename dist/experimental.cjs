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
    minSpacing = 0,
    clipBounds
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
  const clipMinX = Math.max(minX, clipBounds?.minX ?? minX);
  const clipMinY = Math.max(minY, clipBounds?.minY ?? minY);
  const clipMaxX = Math.min(maxX, clipBounds?.maxX ?? maxX);
  const clipMaxY = Math.min(maxY, clipBounds?.maxY ?? maxY);
  if (clipMaxX <= clipMinX || clipMaxY <= clipMinY) return [];
  if (distribution === "natural") {
    const clippedWidth = clipMaxX - clipMinX;
    const clippedHeight = clipMaxY - clipMinY;
    const targetCount = Math.max(1, Math.round(density * clippedWidth * clippedHeight / 1e4));
    const minimumDistance = Math.max(
      cell * 0.76,
      radius * 2 * (1 + scaleJitter) + minSpacing
    );
    const conservativeRadius = radius * (1 + scaleJitter);
    const minimumDistanceSquared = minimumDistance ** 2;
    const gridCell = Math.max(minimumDistance / Math.SQRT2, 1);
    const grid = /* @__PURE__ */ new Map();
    const active = [];
    const gridCoordinate = (value, origin) => Math.floor((value - origin) / gridCell);
    const gridKey = (column, row) => `${column}:${row}`;
    const isFarEnough = (x, y) => {
      if (minimumDistanceSquared === 0) return true;
      const column = gridCoordinate(x, clipMinX);
      const row = gridCoordinate(y, clipMinY);
      for (let offsetY = -2; offsetY <= 2; offsetY++) {
        for (let offsetX = -2; offsetX <= 2; offsetX++) {
          const pointIndex = grid.get(gridKey(column + offsetX, row + offsetY));
          if (pointIndex === void 0) continue;
          const point = points[pointIndex];
          if ((x - point.x) ** 2 + (y - point.y) ** 2 < minimumDistanceSquared) return false;
        }
      }
      return true;
    };
    const addPoint = (x, y) => {
      const pointIndex = points.length;
      points.push({
        x,
        y,
        rotation: (rand() * 2 - 1) * rotationJitterDeg,
        scale: 1 + (rand() * 2 - 1) * scaleJitter
      });
      active.push(pointIndex);
      grid.set(gridKey(
        gridCoordinate(x, clipMinX),
        gridCoordinate(y, clipMinY)
      ), pointIndex);
    };
    for (let attempt = 0; attempt < 128 && points.length === 0; attempt++) {
      const x = clipMinX + rand() * clippedWidth;
      const y = clipMinY + rand() * clippedHeight;
      if (discFitsInside(x, y, conservativeRadius, rings)) addPoint(x, y);
    }
    while (active.length > 0 && points.length < targetCount) {
      const activeSlot = Math.floor(rand() * active.length);
      const origin = points[active[activeSlot]];
      let accepted = false;
      for (let attempt = 0; attempt < 30; attempt++) {
        const angle = rand() * Math.PI * 2;
        const distance = minimumDistance * (1 + rand());
        const x = origin.x + Math.cos(angle) * distance;
        const y = origin.y + Math.sin(angle) * distance;
        if (x < clipMinX || x > clipMaxX || y < clipMinY || y > clipMaxY || !discFitsInside(x, y, conservativeRadius, rings) || !isFarEnough(x, y)) continue;
        addPoint(x, y);
        accepted = true;
        break;
      }
      if (!accepted) active.splice(activeSlot, 1);
    }
    return points;
  }
  const columns = Math.max(1, Math.floor(width / cell));
  const rows = Math.max(1, Math.floor(height / cell));
  const startX = minX + (width - (columns - 1) * cell) / 2;
  const startY = minY + (height - (rows - 1) * cell) / 2;
  const jitterMargin = cell * positionJitter / 2;
  const firstRow = Math.max(0, Math.ceil((clipMinY - jitterMargin - startY) / cell));
  const lastRow = Math.min(rows - 1, Math.floor((clipMaxY + jitterMargin - startY) / cell));
  for (let row = firstRow; row <= lastRow; row++) {
    const rowOffset = distribution === "offset" && columns > 1 ? row % 2 === 0 ? -cell / 4 : cell / 4 : 0;
    const firstColumn = Math.max(
      0,
      Math.ceil((clipMinX - jitterMargin - startX - rowOffset) / cell)
    );
    const lastColumn = Math.min(
      columns - 1,
      Math.floor((clipMaxX + jitterMargin - startX - rowOffset) / cell)
    );
    for (let column = firstColumn; column <= lastColumn; column++) {
      const jitter = distribution === "offset" ? positionJitter : 0;
      const jx = startX + column * cell + rowOffset + (rand() - 0.5) * cell * jitter;
      const jy = startY + row * cell + (rand() - 0.5) * cell * jitter;
      if (jx < clipMinX || jx > clipMaxX || jy < clipMinY || jy > clipMaxY) continue;
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
    minSpacing,
    viewportPaddingPx
  } = options;
  let clipBounds;
  if (viewportPaddingPx !== void 0) {
    if (!Number.isFinite(viewportPaddingPx) || viewportPaddingPx < 0) {
      throw new RangeError("viewportPaddingPx must be a finite number greater than or equal to 0");
    }
    const canvas = map.getCanvas?.();
    if (canvas) {
      const pixelRatio = globalThis.devicePixelRatio || 1;
      const width = canvas.clientWidth || canvas.width / pixelRatio;
      const height = canvas.clientHeight || canvas.height / pixelRatio;
      clipBounds = {
        minX: -viewportPaddingPx,
        minY: -viewportPaddingPx,
        maxX: width + viewportPaddingPx,
        maxY: height + viewportPaddingPx
      };
    }
  }
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
      minSpacing,
      clipBounds
    });
  });
  const features = points.map(({ x, y, rotation, scale }, index) => {
    const lngLat = map.unproject([x, y]);
    return {
      type: "Feature",
      id: index,
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
var installedSvgIcons = /* @__PURE__ */ new WeakMap();
async function addSvgIcon(map, options) {
  const { id, svg, size = 32, pixelRatio = 2 } = options;
  const px = Math.round(size * pixelRatio);
  const signature = `${size}@${pixelRatio}:${svg}`;
  let installedById = installedSvgIcons.get(map);
  if (!installedById) {
    installedById = /* @__PURE__ */ new Map();
    installedSvgIcons.set(map, installedById);
  }
  const previous = installedById.get(id);
  if (map.hasImage(id) && previous?.signature === signature) {
    return { id, width: previous.width, height: previous.height };
  }
  const image = await loadSvgImage(svg);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  ctx.clearRect(0, 0, px, px);
  ctx.drawImage(image, 0, 0, px, px);
  const imageData = ctx.getImageData(0, 0, px, px);
  const tile = { width: px, height: px, data: new Uint8Array(imageData.data.buffer) };
  if (map.hasImage(id) && previous?.width === px && previous.height === px && previous.pixelRatio === pixelRatio) {
    map.updateImage(id, tile);
  } else {
    if (map.hasImage(id)) map.removeImage(id);
    map.addImage(id, tile, { pixelRatio });
  }
  installedById.set(id, {
    signature,
    width: px,
    height: px,
    pixelRatio
  });
  return { id, width: px, height: px };
}

// src/maplibre/svgIconScatter.ts
var installedScatterFeatures = /* @__PURE__ */ new WeakMap();
var installedScatterLayerStates = /* @__PURE__ */ new WeakMap();
function featureDiff(previous, next) {
  const [previousLng, previousLat] = previous.geometry.coordinates;
  const [nextLng, nextLat] = next.geometry.coordinates;
  const geometryChanged = previousLng !== nextLng || previousLat !== nextLat;
  const propertiesChanged = previous.properties.rotation !== next.properties.rotation || previous.properties.scale !== next.properties.scale;
  if (!geometryChanged && !propertiesChanged) return void 0;
  return {
    id: next.id,
    ...geometryChanged ? { newGeometry: next.geometry } : {},
    ...propertiesChanged ? {
      addOrUpdateProperties: [
        { key: "rotation", value: next.properties.rotation },
        { key: "scale", value: next.properties.scale }
      ]
    } : {}
  };
}
function scatterSourceDiff(previous, next) {
  const sharedCount = Math.min(previous.length, next.length);
  const update = [];
  for (let index = 0; index < sharedCount; index++) {
    const diff = featureDiff(previous[index], next[index]);
    if (diff) update.push(diff);
  }
  return {
    ...previous.length > next.length ? { remove: previous.slice(next.length).map(({ id }) => id) } : {},
    ...next.length > previous.length ? { add: next.slice(previous.length) } : {},
    ...update.length ? { update } : {}
  };
}
async function updateScatterSource(map, sourceId, points) {
  let featuresBySource = installedScatterFeatures.get(map);
  if (!featuresBySource) {
    featuresBySource = /* @__PURE__ */ new Map();
    installedScatterFeatures.set(map, featuresBySource);
  }
  const previous = featuresBySource.get(sourceId);
  featuresBySource.set(sourceId, points.features);
  const existingSource = map.getSource(sourceId);
  if (!existingSource) {
    map.addSource(sourceId, {
      type: "geojson",
      data: points,
      // Point geometry does not need high-zoom vector-tile subdivision.
      // Overscaling above z14 preserves positions while reducing rebuild work.
      maxzoom: 14
    });
    return;
  }
  if (previous && typeof existingSource.updateData === "function") {
    const diff = scatterSourceDiff(previous, points.features);
    if (!diff.add && !diff.remove && !diff.update) return;
    try {
      await existingSource.updateData(diff);
      return;
    } catch {
    }
  }
  existingSource.setData(points);
}
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
    scaleMode = "screen",
    edgeClearance = true,
    viewportPaddingPx
  } = options;
  if (scaleMode !== "screen" && scaleMode !== "map") {
    throw new TypeError("scaleMode must be screen or map");
  }
  await addSvgIcon(map, { id: iconId, svg, size });
  const approximateSpacing = density && density > 0 ? 100 / Math.sqrt(density) : 100;
  const screenPadding = viewportPaddingPx ?? Math.max(
    192,
    size * (1 + (scaleJitter ?? 0)) * 2,
    approximateSpacing * 2
  );
  const points = scatterIconPoints({
    map,
    polygon,
    iconRadiusPx: edgeClearance ? size / Math.SQRT2 : 0,
    density,
    seed,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger,
    distribution,
    minSpacing,
    viewportPaddingPx: scaleMode === "screen" ? screenPadding : void 0
  });
  await updateScatterSource(map, sourceId, points);
  const iconSize = scaleMode === "map" ? [
    "interpolate",
    ["exponential", 2],
    ["zoom"],
    map.getZoom() - 8,
    ["*", ["get", "scale"], 1 / 256],
    map.getZoom(),
    ["get", "scale"],
    map.getZoom() + 8,
    ["*", ["get", "scale"], 256]
  ] : ["get", "scale"];
  let layerStates = installedScatterLayerStates.get(map);
  if (!layerStates) {
    layerStates = /* @__PURE__ */ new Map();
    installedScatterLayerStates.set(map, layerStates);
  }
  const layerModeSignature = scaleMode === "screen" ? "screen" : `map:${map.getZoom()}`;
  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: "symbol",
      source: sourceId,
      layout: {
        "icon-image": iconId,
        "icon-rotate": ["get", "rotation"],
        "icon-size": iconSize,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "symbol-z-order": "source"
      },
      paint: {
        "icon-opacity": opacity
      }
    });
    layerStates.set(layerId, {
      mode: layerModeSignature,
      iconId,
      opacity
    });
  } else {
    const previousLayer = layerStates.get(layerId);
    if (previousLayer?.mode !== layerModeSignature) {
      map.setLayoutProperty(layerId, "icon-size", iconSize);
    }
    if (previousLayer?.iconId !== iconId) {
      map.setLayoutProperty(layerId, "icon-image", iconId);
    }
    if (previousLayer?.opacity !== opacity) {
      map.setPaintProperty(layerId, "icon-opacity", opacity);
    }
    layerStates.set(layerId, {
      mode: layerModeSignature,
      iconId,
      opacity
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  installSvgIconScatter,
  scatterIconPoints
});
//# sourceMappingURL=experimental.cjs.map
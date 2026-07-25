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

// src/entries/maplibre.ts
var maplibre_exports = {};
__export(maplibre_exports, {
  LEGACY_PATTERN_METADATA_KEY: () => LEGACY_PATTERN_METADATA_KEY,
  PATTERN_METADATA_KEY: () => PATTERN_METADATA_KEY,
  buildStyleFragment: () => buildStyleFragment,
  createSvgPatternDefinition: () => createSvgPatternDefinition,
  createSvgScatterTile: () => createSvgScatterTile,
  installPatternFills: () => installPatternFills,
  installSvgPatternFill: () => installSvgPatternFill,
  observePatternFills: () => observePatternFills,
  parsePatternDefinition: () => parsePatternDefinition,
  parsePatternMetadata: () => parsePatternMetadata,
  patternDefinitionId: () => patternDefinitionId,
  serializePatternDefinition: () => serializePatternDefinition,
  syncPatternTexture: () => syncPatternTexture
});
module.exports = __toCommonJS(maplibre_exports);

// src/maplibre/patternDefinition.ts
var PATTERN_METADATA_KEY = "maplibre-pattern-fills:v1";
var LEGACY_PATTERN_METADATA_KEY = "enhanced:pattern";
var geometricTypes = /* @__PURE__ */ new Set([
  "stipple",
  "hachures",
  "cross",
  "grid",
  "dots"
]);
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function finiteNumber(record, key) {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${key} must be a finite number`);
  }
  return value;
}
function positiveNumber(record, key) {
  const value = finiteNumber(record, key);
  if (value <= 0) throw new RangeError(`${key} must be greater than 0`);
  return value;
}
function nonNegativeNumber(record, key) {
  const value = finiteNumber(record, key);
  if (value < 0) throw new RangeError(`${key} must be greater than or equal to 0`);
  return value;
}
function nonEmptyString(record, key) {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${key} must be a non-empty string`);
  }
  return value;
}
function parsePatternDefinition(value) {
  if (!isRecord(value)) throw new TypeError("pattern definition must be an object");
  if (value.kind === "geometric") {
    if (typeof value.pattern !== "string" || !geometricTypes.has(value.pattern)) {
      throw new TypeError("pattern must be a supported non-solid geometric pattern");
    }
    return {
      kind: "geometric",
      pattern: value.pattern,
      size: positiveNumber(value, "size"),
      color: nonEmptyString(value, "color"),
      weight: positiveNumber(value, "weight"),
      angle: finiteNumber(value, "angle")
    };
  }
  if (value.kind === "svg") {
    const scaleJitter = nonNegativeNumber(value, "scaleJitter");
    if (scaleJitter >= 1) throw new RangeError("scaleJitter must be less than 1");
    const seed = value.seed;
    if ((typeof seed !== "string" || seed.length === 0) && (typeof seed !== "number" || !Number.isFinite(seed))) {
      throw new TypeError("seed must be a finite number or a non-empty string");
    }
    if (typeof value.stagger !== "boolean") throw new TypeError("stagger must be a boolean");
    const distribution = value.distribution ?? (value.stagger ? "offset" : "regular");
    if (distribution !== "regular" && distribution !== "offset" && distribution !== "natural") {
      throw new TypeError("distribution must be regular, offset, or natural");
    }
    return {
      kind: "svg",
      svg: nonEmptyString(value, "svg"),
      tileSize: positiveNumber(value, "tileSize"),
      stampSize: positiveNumber(value, "stampSize"),
      density: positiveNumber(value, "density"),
      seed,
      rotationJitterDeg: nonNegativeNumber(value, "rotationJitterDeg"),
      scaleJitter,
      positionJitter: nonNegativeNumber(value, "positionJitter"),
      stagger: distribution === "offset",
      distribution,
      minSpacing: value.minSpacing === void 0 ? 0 : nonNegativeNumber(value, "minSpacing")
    };
  }
  throw new TypeError('pattern definition kind must be "geometric" or "svg"');
}
function parsePatternMetadata(value) {
  if (!isRecord(value)) throw new TypeError("pattern metadata must be an object");
  return {
    imageId: nonEmptyString(value, "imageId"),
    definition: parsePatternDefinition(value.definition)
  };
}
function serializePatternDefinition(definition) {
  return JSON.stringify(parsePatternDefinition(definition));
}
function patternDefinitionId(definition, prefix = "mpf") {
  const serialized = serializePatternDefinition(definition);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index++) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
function createSvgPatternDefinition(options) {
  const distribution = options.distribution ?? (options.stagger === false ? "regular" : "offset");
  return parsePatternDefinition({
    kind: "svg",
    svg: options.svg,
    tileSize: options.tileSize ?? 288,
    stampSize: options.stampSize ?? 28,
    density: options.density ?? 1.4,
    seed: options.seed ?? 1,
    rotationJitterDeg: options.rotationJitterDeg ?? 0,
    scaleJitter: options.scaleJitter ?? 0,
    positionJitter: options.positionJitter ?? 0.15,
    stagger: distribution === "offset",
    distribution,
    minSpacing: options.minSpacing ?? 0
  });
}

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
  const pixelRatio = options.pixelRatio ?? 1;
  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) {
    throw new RangeError("pixelRatio must be a finite number greater than 0");
  }
  const physicalSize = Math.max(1, Math.round(size * pixelRatio));
  const renderScale = physicalSize / size;
  const { ctx, toTileImage } = (options.contextFactory ?? defaultContextFactory)(physicalSize);
  ctx.clearRect(0, 0, physicalSize, physicalSize);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = weight * renderScale;
  ctx.lineCap = "round";
  const drawHachures = (deg) => {
    ctx.beginPath();
    const step = Math.max(physicalSize / 2, 4 * renderScale);
    if (deg === 0) {
      for (let y = 0; y <= physicalSize; y += step) {
        ctx.moveTo(0, y + 0.5 * renderScale);
        ctx.lineTo(physicalSize, y + 0.5 * renderScale);
      }
    } else if (deg === 90) {
      for (let x = 0; x <= physicalSize; x += step) {
        ctx.moveTo(x + 0.5 * renderScale, 0);
        ctx.lineTo(x + 0.5 * renderScale, physicalSize);
      }
    } else if (deg === 45) {
      for (let o = -physicalSize; o <= physicalSize * 2; o += step) {
        ctx.moveTo(o, 0);
        ctx.lineTo(o + physicalSize, physicalSize);
      }
    } else {
      for (let o = -physicalSize; o <= physicalSize * 2; o += step) {
        ctx.moveTo(o + physicalSize, 0);
        ctx.lineTo(o, physicalSize);
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
      ctx.moveTo(0.5 * renderScale, 0);
      ctx.lineTo(0.5 * renderScale, physicalSize);
      ctx.moveTo(0, 0.5 * renderScale);
      ctx.lineTo(physicalSize, 0.5 * renderScale);
      ctx.stroke();
      break;
    }
    case "stipple": {
      const r = weight * renderScale * 0.6;
      const cells = Math.max(2, Math.round(size / 6));
      const s = physicalSize / cells;
      for (let i = 0; i < cells; i++) {
        for (let j = 0; j < cells; j++) {
          const cx = (i + (j % 2 ? 0.75 : 0.25)) * s;
          const cy = (j + 0.5) * s;
          ctx.beginPath();
          ctx.arc(cx % physicalSize, cy % physicalSize, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "dots": {
      const r = Math.max(weight * renderScale * 0.5, renderScale);
      ctx.beginPath();
      ctx.arc(physicalSize / 2, physicalSize / 2, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "solid":
      break;
  }
  return toTileImage();
}

// src/maplibre/syncPatternTexture.ts
var installedPatterns = /* @__PURE__ */ new WeakMap();
function resolvePixelRatio(value) {
  const displayRatio = typeof globalThis.devicePixelRatio === "number" ? globalThis.devicePixelRatio : 1;
  const ratio = value ?? Math.min(Math.max(displayRatio, 1), 2);
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new RangeError("pixelRatio must be a finite number greater than 0");
  }
  return ratio;
}
function syncPatternTexture(map, options) {
  const { imageId, pattern, size, color, weight, angle } = options;
  if (pattern === "solid") return;
  const pixelRatio = resolvePixelRatio(options.pixelRatio);
  let byImage = installedPatterns.get(map);
  if (!byImage) {
    byImage = /* @__PURE__ */ new Map();
    installedPatterns.set(map, byImage);
  }
  const signature = JSON.stringify({ pattern, size, color, weight, angle, pixelRatio });
  const previous = byImage.get(imageId);
  if (map.hasImage(imageId) && previous?.signature === signature) return;
  const tile = makeTile(pattern, size, color, weight, angle, { pixelRatio });
  if (map.hasImage(imageId) && previous?.width === tile.width && previous.height === tile.height && previous.pixelRatio === pixelRatio) {
    map.updateImage(imageId, tile);
  } else {
    if (map.hasImage(imageId)) map.removeImage(imageId);
    map.addImage(imageId, tile, { pixelRatio });
  }
  byImage.set(imageId, {
    signature,
    width: tile.width,
    height: tile.height,
    pixelRatio
  });
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
    const definition = {
      kind: "geometric",
      pattern: pattern.pattern,
      size: pattern.tile,
      color: pattern.color,
      weight: pattern.weight,
      angle: pattern.angle
    };
    const imageId = patternDefinitionId(definition);
    layers.push({
      id: `${source}__pat`,
      type: "fill",
      source,
      "source-layer": sourceLayer,
      paint: { "fill-pattern": imageId, "fill-opacity": pattern.opacity },
      metadata: {
        [PATTERN_METADATA_KEY]: { imageId, definition }
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

// src/engine/svgScatterLayout.ts
function positiveFinite(name, value) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite number greater than 0`);
  }
}
function nonNegativeFinite(name, value) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite number greater than or equal to 0`);
  }
}
function modulo(value, divisor) {
  return (value % divisor + divisor) % divisor;
}
function toroidalDistance(first, second, tileSize) {
  const dx = Math.min(Math.abs(first.x - second.x), tileSize - Math.abs(first.x - second.x));
  const dy = Math.min(Math.abs(first.y - second.y), tileSize - Math.abs(first.y - second.y));
  return Math.hypot(dx, dy);
}
function createNaturalPositions(count, tileSize, minimumDistance, rand) {
  const positions = [];
  const candidateCount = 24;
  while (positions.length < count) {
    let best;
    let bestDistance = -1;
    for (let candidateIndex = 0; candidateIndex < candidateCount; candidateIndex++) {
      const candidate = { x: rand() * tileSize, y: rand() * tileSize };
      const nearest = positions.length === 0 ? Infinity : Math.min(...positions.map((position) => toroidalDistance(candidate, position, tileSize)));
      if (nearest > bestDistance) {
        best = candidate;
        bestDistance = nearest;
      }
    }
    if (!best || positions.length > 0 && bestDistance < minimumDistance) break;
    positions.push(best);
  }
  return positions;
}
function createSvgScatterLayout(options) {
  const {
    tileSize,
    stampSize,
    density,
    seed,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger
  } = options;
  const distribution = options.distribution ?? (stagger ? "offset" : "regular");
  const minSpacing = options.minSpacing ?? 0;
  positiveFinite("tileSize", tileSize);
  positiveFinite("stampSize", stampSize);
  positiveFinite("density", density);
  nonNegativeFinite("rotationJitterDeg", rotationJitterDeg);
  nonNegativeFinite("scaleJitter", scaleJitter);
  nonNegativeFinite("positionJitter", positionJitter);
  nonNegativeFinite("minSpacing", minSpacing);
  if (!["regular", "offset", "natural"].includes(distribution)) {
    throw new TypeError("distribution must be regular, offset, or natural");
  }
  if (scaleJitter >= 1) {
    throw new RangeError("scaleJitter must be less than 1 so every stamp has a positive scale");
  }
  const seedNum = typeof seed === "string" ? hashStringToSeed(seed) : seed;
  if (!Number.isFinite(seedNum)) throw new RangeError("seed must be a finite number or a string");
  const rand = mulberry32(seedNum);
  const targetCount = Math.max(1, Math.round(density * (tileSize * tileSize) / 1e4));
  let positions;
  if (distribution === "natural") {
    const minimumDistance = stampSize * Math.SQRT2 * (1 + scaleJitter) + minSpacing;
    positions = createNaturalPositions(targetCount, tileSize, minimumDistance, rand);
  } else {
    const targetCell = 100 / Math.sqrt(density);
    const cols = Math.max(1, Math.round(tileSize / targetCell));
    let rows = Math.max(1, Math.round(tileSize / targetCell));
    const isOffset = distribution === "offset";
    if (isOffset && rows % 2 !== 0) {
      const lower = Math.max(2, rows - 1);
      const upper = rows + 1;
      rows = Math.abs(cols * lower - targetCount) <= Math.abs(cols * upper - targetCount) ? lower : upper;
    }
    const cellWidth = tileSize / cols;
    const cellHeight = tileSize / rows;
    const jitterAmount = distribution === "regular" ? 0 : positionJitter;
    positions = [];
    for (let row = 0; row < rows; row++) {
      const rowOffset = isOffset && row % 2 === 1 ? cellWidth / 2 : 0;
      for (let col = 0; col < cols; col++) {
        const jitterX = (rand() - 0.5) * cellWidth * jitterAmount;
        const jitterY = (rand() - 0.5) * cellHeight * jitterAmount;
        positions.push({
          x: modulo(col * cellWidth + cellWidth / 2 + rowOffset + jitterX, tileSize),
          y: modulo(row * cellHeight + cellHeight / 2 + jitterY, tileSize)
        });
      }
    }
  }
  const placements = [];
  positions.forEach(({ x, y }, stampIndex) => {
    const rotationRad = (rand() * 2 - 1) * rotationJitterDeg * (Math.PI / 180);
    const scale = 1 + (rand() * 2 - 1) * scaleJitter;
    const extent = stampSize * scale * Math.SQRT2 / 2;
    const minShiftX = Math.ceil((-extent - x) / tileSize);
    const maxShiftX = Math.floor((tileSize + extent - x) / tileSize);
    const minShiftY = Math.ceil((-extent - y) / tileSize);
    const maxShiftY = Math.floor((tileSize + extent - y) / tileSize);
    for (let shiftY = minShiftY; shiftY <= maxShiftY; shiftY++) {
      for (let shiftX = minShiftX; shiftX <= maxShiftX; shiftX++) {
        placements.push({
          stampIndex,
          x: x + shiftX * tileSize,
          y: y + shiftY * tileSize,
          rotationRad,
          scale
        });
      }
    }
  });
  return placements;
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

// src/maplibre/svgPattern.ts
function resolvePixelRatio2(value, useDisplayRatio) {
  const displayRatio = useDisplayRatio && typeof globalThis.devicePixelRatio === "number" ? globalThis.devicePixelRatio : 1;
  const ratio = value ?? Math.min(Math.max(displayRatio, 1), 2);
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new RangeError("pixelRatio must be a finite number greater than 0");
  }
  return ratio;
}
async function createSvgScatterTile(options) {
  const definition = createSvgPatternDefinition(options);
  const pixelRatio = resolvePixelRatio2(options.pixelRatio, false);
  const {
    svg,
    tileSize,
    stampSize,
    density,
    seed,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger,
    distribution,
    minSpacing
  } = definition;
  const image = await loadSvgImage(svg);
  const canvas = document.createElement("canvas");
  const physicalTileSize = Math.max(1, Math.round(tileSize * pixelRatio));
  const renderScale = physicalTileSize / tileSize;
  canvas.width = canvas.height = physicalTileSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  ctx.clearRect(0, 0, physicalTileSize, physicalTileSize);
  ctx.scale(renderScale, renderScale);
  const placements = createSvgScatterLayout({
    tileSize,
    stampSize,
    density,
    seed,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger,
    distribution,
    minSpacing
  });
  for (const placement of placements) {
    ctx.save();
    ctx.translate(placement.x, placement.y);
    ctx.rotate(placement.rotationRad);
    ctx.scale(placement.scale, placement.scale);
    ctx.drawImage(image, -stampSize / 2, -stampSize / 2, stampSize, stampSize);
    ctx.restore();
  }
  const imageData = ctx.getImageData(0, 0, physicalTileSize, physicalTileSize);
  return {
    width: physicalTileSize,
    height: physicalTileSize,
    data: new Uint8Array(imageData.data.buffer)
  };
}
var installedSvgPatterns = /* @__PURE__ */ new WeakMap();
var svgPatternGenerations = /* @__PURE__ */ new WeakMap();
async function installSvgPatternFill(map, options) {
  const definition = createSvgPatternDefinition(options);
  const pixelRatio = resolvePixelRatio2(options.pixelRatio, true);
  const signature = `${serializePatternDefinition(definition)}@${pixelRatio}`;
  let installedById = installedSvgPatterns.get(map);
  if (!installedById) {
    installedById = /* @__PURE__ */ new Map();
    installedSvgPatterns.set(map, installedById);
  }
  if (map.hasImage(options.imageId) && installedById.get(options.imageId)?.signature === signature) {
    return;
  }
  let generationsById = svgPatternGenerations.get(map);
  if (!generationsById) {
    generationsById = /* @__PURE__ */ new Map();
    svgPatternGenerations.set(map, generationsById);
  }
  const generation = (generationsById.get(options.imageId) ?? 0) + 1;
  generationsById.set(options.imageId, generation);
  const tile = await createSvgScatterTile({ ...options, pixelRatio });
  if (generationsById.get(options.imageId) !== generation) return;
  const previous = installedById.get(options.imageId);
  if (map.hasImage(options.imageId) && previous?.width === tile.width && previous.height === tile.height && previous.pixelRatio === pixelRatio) {
    map.updateImage(options.imageId, tile);
  } else {
    if (map.hasImage(options.imageId)) map.removeImage(options.imageId);
    map.addImage(options.imageId, tile, { pixelRatio });
  }
  installedById.set(options.imageId, {
    signature,
    width: tile.width,
    height: tile.height,
    pixelRatio
  });
  map.triggerRepaint();
}

// src/maplibre/installPatternFills.ts
function fromLegacyMetadata(value) {
  if (!value || typeof value !== "object") return void 0;
  const legacy = value;
  if (legacy.type === "solid" || typeof legacy.type !== "string" || typeof legacy.tile !== "number" || typeof legacy.color !== "string" || typeof legacy.weight !== "number" || typeof legacy.angle !== "number" || typeof legacy.imageId !== "string") {
    return void 0;
  }
  return {
    imageId: legacy.imageId,
    definition: {
      kind: "geometric",
      pattern: legacy.type,
      size: legacy.tile,
      color: legacy.color,
      weight: legacy.weight,
      angle: legacy.angle
    }
  };
}
async function installPatternFills(map, style) {
  const installed = /* @__PURE__ */ new Map();
  const pending = [];
  for (const layer of style.layers) {
    const metadata = layer.metadata;
    if (!metadata) continue;
    const rawV1 = metadata[PATTERN_METADATA_KEY];
    const registration = rawV1 ? parsePatternMetadata(rawV1) : fromLegacyMetadata(metadata[LEGACY_PATTERN_METADATA_KEY]);
    if (!registration) continue;
    const signature = serializePatternDefinition(registration.definition);
    const previous = installed.get(registration.imageId);
    if (previous && previous !== signature) {
      throw new Error(`Conflicting pattern definitions use image id "${registration.imageId}"`);
    }
    if (previous) continue;
    installed.set(registration.imageId, signature);
    const p = registration.definition;
    if (p.kind === "geometric") {
      syncPatternTexture(map, {
        imageId: registration.imageId,
        pattern: p.pattern,
        size: p.size,
        color: p.color,
        weight: p.weight,
        angle: p.angle
      });
    } else {
      pending.push(installSvgPatternFill(map, { imageId: registration.imageId, ...p }));
    }
  }
  await Promise.all(pending);
}

// src/maplibre/observePatternFills.ts
function observePatternFills(map, options = {}) {
  const getStyle = options.getStyle ?? (() => map.getStyle());
  const onError = options.onError ?? ((error) => {
    console.error("maplibre-pattern-fills: failed to restore pattern images", error);
  });
  let disposed = false;
  const refresh = async () => {
    if (disposed) return;
    await installPatternFills(map, getStyle());
  };
  const onStyleLoad = () => {
    void refresh().catch(onError);
  };
  map.on("style.load", onStyleLoad);
  return {
    refresh,
    dispose() {
      if (disposed) return;
      disposed = true;
      map.off("style.load", onStyleLoad);
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LEGACY_PATTERN_METADATA_KEY,
  PATTERN_METADATA_KEY,
  buildStyleFragment,
  createSvgPatternDefinition,
  createSvgScatterTile,
  installPatternFills,
  installSvgPatternFill,
  observePatternFills,
  parsePatternDefinition,
  parsePatternMetadata,
  patternDefinitionId,
  serializePatternDefinition,
  syncPatternTexture
});
//# sourceMappingURL=maplibre.cjs.map
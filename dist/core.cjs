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

// src/entries/core.ts
var core_exports = {};
__export(core_exports, {
  createMiniContext: () => createMiniContext,
  createSvgScatterLayout: () => createSvgScatterLayout,
  hashStringToSeed: () => hashStringToSeed,
  makeTile: () => makeTile,
  mulberry32: () => mulberry32,
  scalePatternForZoom: () => scalePatternForZoom,
  scatterPointsInPolygon: () => scatterPointsInPolygon
});
module.exports = __toCommonJS(core_exports);

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

// src/engine/patternScale.ts
function finite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return value;
}
function positive(value, name) {
  finite(value, name);
  if (value <= 0) throw new RangeError(`${name} must be greater than 0`);
  return value;
}
function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
function scalePatternForZoom(options) {
  const zoom = finite(options.zoom, "zoom");
  const referenceZoom = finite(options.referenceZoom, "referenceZoom");
  const visualSize = positive(options.visualSize, "visualSize");
  const spacing = positive(options.spacing, "spacing");
  const opticalScale = positive(options.opticalScale ?? 1, "opticalScale");
  const minReadableSize = positive(
    options.minReadableSize ?? 10,
    "minReadableSize"
  );
  const maxVisualSize = positive(
    options.maxVisualSize ?? 72,
    "maxVisualSize"
  );
  if (maxVisualSize < minReadableSize) {
    throw new RangeError("maxVisualSize must be greater than or equal to minReadableSize");
  }
  const rawScale = options.mode === "map" ? 2 ** (zoom - referenceZoom) : 1;
  const rawVisualSize = visualSize * rawScale;
  const maximumScale = maxVisualSize / visualSize;
  const scale = Math.min(rawScale, maximumScale);
  const renderedVisualSize = visualSize * scale;
  const renderedSpacing = spacing * scale;
  const fadeStart = minReadableSize * 0.5;
  const opacity = options.mode === "map" ? clamp((rawVisualSize - fadeStart) / (minReadableSize - fadeStart), 0, 1) : 1;
  return {
    scale,
    rawVisualSize,
    visualSize: renderedVisualSize,
    stampSize: renderedVisualSize / opticalScale,
    spacing: renderedSpacing,
    density: 1e4 / (renderedSpacing * renderedSpacing),
    opacity,
    capped: rawScale > maximumScale
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createMiniContext,
  createSvgScatterLayout,
  hashStringToSeed,
  makeTile,
  mulberry32,
  scalePatternForZoom,
  scatterPointsInPolygon
});
//# sourceMappingURL=core.cjs.map
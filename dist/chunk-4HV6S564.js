import {
  hashStringToSeed,
  mulberry32
} from "./chunk-GBEE6YET.js";

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
  positiveFinite("tileSize", tileSize);
  positiveFinite("stampSize", stampSize);
  positiveFinite("density", density);
  nonNegativeFinite("rotationJitterDeg", rotationJitterDeg);
  nonNegativeFinite("scaleJitter", scaleJitter);
  nonNegativeFinite("positionJitter", positionJitter);
  if (scaleJitter >= 1) {
    throw new RangeError("scaleJitter must be less than 1 so every stamp has a positive scale");
  }
  const seedNum = typeof seed === "string" ? hashStringToSeed(seed) : seed;
  if (!Number.isFinite(seedNum)) throw new RangeError("seed must be a finite number or a string");
  const rand = mulberry32(seedNum);
  const targetCell = 100 / Math.sqrt(density);
  const cols = Math.max(1, Math.round(tileSize / targetCell));
  let rows = Math.max(1, Math.round(tileSize / targetCell));
  if (stagger && rows % 2 !== 0) {
    const lower = Math.max(2, rows - 1);
    const upper = rows + 1;
    const targetCount = density * (tileSize * tileSize) / 1e4;
    rows = Math.abs(cols * lower - targetCount) <= Math.abs(cols * upper - targetCount) ? lower : upper;
  }
  const cellWidth = tileSize / cols;
  const cellHeight = tileSize / rows;
  const placements = [];
  let stampIndex = 0;
  for (let row = 0; row < rows; row++) {
    const rowOffset = stagger && row % 2 === 1 ? cellWidth / 2 : 0;
    for (let col = 0; col < cols; col++, stampIndex++) {
      const jitterX = (rand() - 0.5) * cellWidth * positionJitter;
      const jitterY = (rand() - 0.5) * cellHeight * positionJitter;
      const x = modulo(col * cellWidth + cellWidth / 2 + rowOffset + jitterX, tileSize);
      const y = modulo(row * cellHeight + cellHeight / 2 + jitterY, tileSize);
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
    }
  }
  return placements;
}

export {
  createMiniContext,
  makeTile,
  createSvgScatterLayout
};
//# sourceMappingURL=chunk-4HV6S564.js.map
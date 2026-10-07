import { composeTileImages } from "../engine/composeTiles";
import type { TileImage } from "../engine/types";
import { materializePatternPlacement } from "./materializePlacement";
import {
  parsePattern,
  type GlyphFill,
  type GlyphShape,
  type LineFill,
  type Pattern,
  type PatternPrimitiveFill,
} from "./pattern";

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface CreateGeometricPatternTileOptions {
  /** Raster pixels per layout pixel. Defaults to the Pattern render setting or 1. */
  pixelRatio?: number;
  /** Optional repeat size for standalone or line-only fills. */
  tileSize?: number;
}

function positive(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite number greater than 0`);
  }
  return value;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function parseColor(value: string): Rgba {
  const hex8 = value.match(/^#([0-9a-f]{8})$/i);
  if (hex8) {
    const number = parseInt(hex8[1], 16);
    return {
      r: (number >>> 24) & 255,
      g: (number >>> 16) & 255,
      b: (number >>> 8) & 255,
      a: (number & 255) / 255,
    };
  }
  const hex6 = value.match(/^#([0-9a-f]{6})$/i);
  if (hex6) {
    const number = parseInt(hex6[1], 16);
    return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255, a: 1 };
  }
  const hex4 = value.match(/^#([0-9a-f]{4})$/i);
  if (hex4) {
    const [r, g, b, a] = hex4[1].split("").map((entry) => parseInt(entry + entry, 16));
    return { r, g, b, a: a / 255 };
  }
  const hex3 = value.match(/^#([0-9a-f]{3})$/i);
  if (hex3) {
    const [r, g, b] = hex3[1].split("").map((entry) => parseInt(entry + entry, 16));
    return { r, g, b, a: 1 };
  }
  const comma = value.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+%?)\s*)?\)$/i,
  );
  const space = value.match(
    /^rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+%?)\s*)?\)$/i,
  );
  const match = comma ?? space;
  if (!match) {
    throw new TypeError(
      `Unsupported color "${value}". Use hex, rgb(), or rgba() for deterministic rendering.`,
    );
  }
  const alpha = match[4] === undefined
    ? 1
    : match[4].endsWith("%")
      ? parseFloat(match[4]) / 100
      : Number(match[4]);
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: alpha };
}

function blendPixel(
  data: Uint8ClampedArray,
  offset: number,
  color: Rgba,
  coverage: number,
  opacity: number,
): void {
  const sourceAlpha = clamp01(color.a * coverage * opacity);
  if (sourceAlpha <= 0) return;
  const destinationAlpha = data[offset + 3] / 255;
  const resultAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
  data[offset] = (
    color.r * sourceAlpha + data[offset] * destinationAlpha * (1 - sourceAlpha)
  ) / resultAlpha;
  data[offset + 1] = (
    color.g * sourceAlpha + data[offset + 1] * destinationAlpha * (1 - sourceAlpha)
  ) / resultAlpha;
  data[offset + 2] = (
    color.b * sourceAlpha + data[offset + 2] * destinationAlpha * (1 - sourceAlpha)
  ) / resultAlpha;
  data[offset + 3] = resultAlpha * 255;
}

function pointInPolygon(x: number, y: number, points: Array<[number, number]>): boolean {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[previous];
    if (y1 > y !== y2 > y && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) {
      inside = !inside;
    }
  }
  return inside;
}

function distanceToSegment(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const amount = lengthSquared === 0
    ? 0
    : clamp01(((x - x1) * dx + (y - y1) * dy) / lengthSquared);
  return Math.hypot(x - (x1 + amount * dx), y - (y1 + amount * dy));
}

function pointInGlyph(shape: GlyphShape, x: number, y: number, size: number): boolean {
  const half = size / 2;
  if (shape === "circle") return x * x + y * y <= half * half;
  if (shape === "square") return Math.abs(x) <= half && Math.abs(y) <= half;
  if (shape === "diamond") return Math.abs(x) + Math.abs(y) <= half;
  if (shape === "plus") {
    const arm = size / 6;
    return (Math.abs(x) <= arm && Math.abs(y) <= half) ||
      (Math.abs(y) <= arm && Math.abs(x) <= half);
  }
  if (shape === "x") {
    const rotatedX = (x + y) / Math.SQRT2;
    const rotatedY = (y - x) / Math.SQRT2;
    return pointInGlyph("plus", rotatedX, rotatedY, size);
  }
  if (shape === "triangle") {
    return pointInPolygon(x, y, [[0, -half], [half, half], [-half, half]]);
  }
  const stroke = size / 6;
  return distanceToSegment(x, y, -half, -half / 2, 0, half / 2) <= stroke ||
    distanceToSegment(x, y, 0, half / 2, half, -half / 2) <= stroke;
}

function glyphTile(fill: GlyphFill, pixelRatio: number): TileImage {
  const logicalSize = fill.placement.tileSize;
  const physicalSize = Math.max(1, Math.round(logicalSize * pixelRatio));
  const renderScale = physicalSize / logicalSize;
  const data = new Uint8ClampedArray(physicalSize * physicalSize * 4);
  const color = parseColor(fill.color);
  const placements = materializePatternPlacement(fill.placement, fill.size);
  const sampleOffsets = [0.25, 0.75];

  for (const placement of placements) {
    const renderedSize = fill.size * placement.scale;
    const extent = renderedSize * Math.SQRT2 / 2;
    const minX = Math.max(0, Math.floor((placement.x - extent) * renderScale));
    const maxX = Math.min(physicalSize - 1, Math.ceil((placement.x + extent) * renderScale));
    const minY = Math.max(0, Math.floor((placement.y - extent) * renderScale));
    const maxY = Math.min(physicalSize - 1, Math.ceil((placement.y + extent) * renderScale));
    const angle = -(fill.rotation * Math.PI / 180 + placement.rotationRad);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        let covered = 0;
        for (const offsetY of sampleOffsets) {
          for (const offsetX of sampleOffsets) {
            const dx = (px + offsetX) / renderScale - placement.x;
            const dy = (py + offsetY) / renderScale - placement.y;
            const localX = (dx * cosine - dy * sine) / placement.scale;
            const localY = (dx * sine + dy * cosine) / placement.scale;
            if (pointInGlyph(fill.glyph, localX, localY, fill.size)) covered++;
          }
        }
        if (covered > 0) {
          blendPixel(data, (py * physicalSize + px) * 4, color, covered / 4, fill.opacity);
        }
      }
    }
  }
  return { width: physicalSize, height: physicalSize, data: new Uint8Array(data.buffer) };
}

function preferredLineTileSize(fill: LineFill): number {
  const radians = fill.angle * Math.PI / 180;
  const dominant = Math.max(Math.abs(Math.sin(radians)), Math.abs(Math.cos(radians)), 1e-9);
  const orientationScale = 8 / dominant;
  const normalX = Math.round(-Math.sin(radians) * orientationScale);
  const normalY = Math.round(Math.cos(radians) * orientationScale);
  const orientationPeriod = fill.spacing * Math.hypot(normalX, normalY);
  const detailPeriod = Math.max(
    fill.dash ? fill.dash.length + fill.dash.gap : 0,
    fill.oscillation?.wavelength ?? 0,
  ) * 4;
  return Math.max(16, Math.min(512, Math.ceil(Math.max(orientationPeriod, detailPeriod))));
}

function phaseVector(
  angle: number,
  tileSize: number,
  period: number,
  tangent: boolean,
): { x: number; y: number; magnitude: number } {
  const radians = angle * Math.PI / 180;
  const targetMagnitude = tileSize / period;
  let x = Math.round((tangent ? Math.cos(radians) : -Math.sin(radians)) * targetMagnitude);
  let y = Math.round((tangent ? Math.sin(radians) : Math.cos(radians)) * targetMagnitude);
  if (x === 0 && y === 0) {
    if (tangent) x = Math.abs(Math.cos(radians)) >= Math.abs(Math.sin(radians)) ? 1 : 0;
    else x = Math.abs(Math.sin(radians)) >= Math.abs(Math.cos(radians)) ? -1 : 0;
    if (x === 0) y = Math.cos(radians) >= 0 ? 1 : -1;
  }
  return { x, y, magnitude: Math.hypot(x, y) };
}

function fractional(value: number): number {
  return value - Math.floor(value);
}

function lineTile(fill: LineFill, logicalSize: number, pixelRatio: number): TileImage {
  const physicalSize = Math.max(1, Math.round(logicalSize * pixelRatio));
  const renderScale = physicalSize / logicalSize;
  const data = new Uint8ClampedArray(physicalSize * physicalSize * 4);
  const color = parseColor(fill.color);
  const normal = phaseVector(fill.angle, logicalSize, fill.spacing, false);
  const normalGradient = normal.magnitude / logicalSize;
  const dashPeriod = fill.dash ? fill.dash.length + fill.dash.gap : undefined;
  const dashVector = dashPeriod === undefined
    ? undefined
    : phaseVector(fill.angle, logicalSize, dashPeriod, true);
  const waveVector = fill.oscillation === undefined
    ? undefined
    : phaseVector(fill.angle, logicalSize, fill.oscillation.wavelength, true);
  const halfWidth = fill.strokeWidth / 2;

  for (let py = 0; py < physicalSize; py++) {
    const y = (py + 0.5) / renderScale;
    for (let px = 0; px < physicalSize; px++) {
      const x = (px + 0.5) / renderScale;
      let normalPhase = (normal.x * x + normal.y * y) / logicalSize;
      if (fill.oscillation && waveVector) {
        const wavePhase = (waveVector.x * x + waveVector.y * y) / logicalSize;
        const wave = fill.shape === "wave"
          ? Math.sin(Math.PI * 2 * wavePhase)
          : 4 * Math.abs(fractional(wavePhase) - 0.5) - 1;
        normalPhase -= wave * fill.oscillation.amplitude * normalGradient;
      }
      const distance = Math.abs(normalPhase - Math.round(normalPhase)) / normalGradient;
      let coverage = clamp01((halfWidth + 0.5 / renderScale - distance) * renderScale);
      if (coverage > 0 && fill.dash && dashVector) {
        const dashPhase = fractional((dashVector.x * x + dashVector.y * y) / logicalSize);
        const duty = fill.dash.length / dashPeriod!;
        if (dashPhase >= duty) coverage = 0;
      }
      if (coverage > 0) {
        blendPixel(data, (py * physicalSize + px) * 4, color, coverage, fill.opacity);
      }
    }
  }
  return { width: physicalSize, height: physicalSize, data: new Uint8Array(data.buffer) };
}

function compositeTileSize(
  layers: PatternPrimitiveFill[],
  requested: number | undefined,
): number {
  if (requested !== undefined) return positive(requested, "tileSize");
  const glyphSizes = layers
    .filter((layer): layer is GlyphFill => layer.family === "glyph")
    .map((layer) => layer.placement.tileSize);
  if (glyphSizes.length > 0) {
    if (glyphSizes.some((size) => size !== glyphSizes[0])) {
      throw new Error("composite glyph layers must use the same tileSize");
    }
    return glyphSizes[0];
  }
  const lines = layers.filter((layer): layer is LineFill => layer.family === "line");
  return Math.max(...lines.map(preferredLineTileSize));
}

function renderPrimitive(
  fill: PatternPrimitiveFill,
  tileSize: number,
  pixelRatio: number,
): TileImage {
  if (fill.family === "glyph") {
    if (fill.placement.tileSize !== tileSize) {
      throw new Error("glyph placement tileSize must match the composite tileSize");
    }
    return glyphTile(fill, pixelRatio);
  }
  if (fill.family === "line") return lineTile(fill, tileSize, pixelRatio);
  throw new Error(`${fill.family} fills are not geometric; use their browser renderer`);
}

/**
 * Renders canonical glyph, line, grid, and crosshatch fills with one pure-JS
 * rasterizer in browsers and Node. Pattern-level opacity remains a MapLibre
 * layer property and is intentionally not baked into the texture.
 */
export function createGeometricPatternTile(
  value: Pattern,
  options: CreateGeometricPatternTileOptions = {},
): TileImage {
  const pattern = parsePattern(value);
  const pixelRatio = positive(
    options.pixelRatio ?? (pattern.render.pixelRatio === "auto" ? 1 : pattern.render.pixelRatio),
    "pixelRatio",
  );
  const { fill } = pattern;
  if (fill.family === "solid") {
    throw new Error("solid fills use MapLibre fill-color and do not need a pattern tile");
  }
  if (fill.family === "text" || fill.family === "svg") {
    throw new Error(`${fill.family} fills require their browser-specific renderer`);
  }
  if (fill.family === "glyph") return glyphTile(fill, pixelRatio);
  if (fill.family === "line") {
    const tileSize = options.tileSize ?? preferredLineTileSize(fill);
    return lineTile(fill, positive(tileSize, "tileSize"), pixelRatio);
  }

  const unsupported = fill.layers.find((layer) => layer.family === "text" || layer.family === "svg");
  if (unsupported) {
    throw new Error(`${unsupported.family} composite layers require their browser-specific renderer`);
  }
  const tileSize = compositeTileSize(fill.layers, options.tileSize);
  return composeTileImages(fill.layers.map((layer) => ({
    image: renderPrimitive(layer, tileSize, pixelRatio),
  })));
}

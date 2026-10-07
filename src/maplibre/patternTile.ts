import { composeTileImages } from "../engine/composeTiles";
import type { TileImage } from "../engine/types";
import { materializePatternPlacement } from "../model/materializePlacement";
import {
  parsePattern,
  type Pattern,
  type PatternPrimitiveFill,
  type SvgFill,
  type TextFill,
} from "../model/pattern";
import { createGeometricPatternTile } from "../model/geometricPatternTile";
import { loadSvgImage } from "./loadSvgImage";

export interface CreatePatternTileOptions {
  /** Raster pixels per MapLibre layout pixel. Overrides Pattern.render. */
  pixelRatio?: number;
  /** Repeat size for line-only fills or compatible composite layers. */
  tileSize?: number;
}

function positive(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite number greater than 0`);
  }
  return value;
}

function resolvedPixelRatio(pattern: Pattern, override?: number): number {
  if (override !== undefined) return positive(override, "pixelRatio");
  if (pattern.render.pixelRatio !== "auto") {
    return positive(pattern.render.pixelRatio, "pattern.render.pixelRatio");
  }
  const displayRatio = typeof globalThis.devicePixelRatio === "number"
    ? globalThis.devicePixelRatio
    : 1;
  return Math.min(Math.max(displayRatio, 1), 2);
}

function browserCanvas(width: number, height: number): {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
} {
  if (typeof document === "undefined") {
    throw new Error("SVG and text pattern rasterization requires a browser canvas");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas context unavailable");
  return { canvas, context };
}

function canvasTile(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): TileImage {
  const image = context.getImageData(0, 0, width, height);
  return { width, height, data: new Uint8Array(image.data.buffer) };
}

async function svgTile(fill: SvgFill, pixelRatio: number): Promise<TileImage> {
  const logicalSize = fill.placement.tileSize;
  const physicalSize = Math.max(1, Math.round(logicalSize * pixelRatio));
  const { context } = browserCanvas(physicalSize, physicalSize);
  const image = await loadSvgImage(fill.svg);
  context.scale(physicalSize / logicalSize, physicalSize / logicalSize);
  context.globalAlpha = fill.opacity;
  const fixedRotation = fill.rotation * Math.PI / 180;
  for (const placement of materializePatternPlacement(fill.placement, fill.size)) {
    context.save();
    context.translate(placement.x, placement.y);
    context.rotate(fixedRotation + placement.rotationRad);
    context.scale(placement.scale, placement.scale);
    context.drawImage(image, -fill.size / 2, -fill.size / 2, fill.size, fill.size);
    context.restore();
  }
  return canvasTile(context, physicalSize, physicalSize);
}

function textWidth(
  context: CanvasRenderingContext2D,
  characters: string[],
  letterSpacing: number,
): number {
  const glyphs = characters.reduce(
    (total, character) => total + context.measureText(character).width,
    0,
  );
  return Math.max(1, glyphs + Math.max(0, characters.length - 1) * letterSpacing);
}

function fillSpacedText(
  context: CanvasRenderingContext2D,
  characters: string[],
  width: number,
  letterSpacing: number,
): void {
  let x = -width / 2;
  for (const character of characters) {
    const characterWidth = context.measureText(character).width;
    context.fillText(character, x, 0);
    x += characterWidth + letterSpacing;
  }
}

async function textTile(fill: TextFill, pixelRatio: number): Promise<TileImage> {
  const font = `${fill.fontStyle} ${fill.fontWeight} ${fill.fontSize}px ${fill.fontFamily}`;
  if (typeof document === "undefined") {
    throw new Error("SVG and text pattern rasterization requires a browser canvas");
  }
  if (document.fonts?.load) {
    await document.fonts.load(font, fill.text.slice(0, 32)).catch(() => undefined);
  }
  const measure = browserCanvas(1, 1).context;
  measure.font = font;
  const characters = Array.from(fill.text);
  const measuredWidth = textWidth(measure, characters, fill.letterSpacing);
  const metrics = measure.measureText(fill.text);
  const measuredHeight = Math.max(
    fill.fontSize,
    (metrics.actualBoundingBoxAscent || fill.fontSize * 0.8) +
      (metrics.actualBoundingBoxDescent || fill.fontSize * 0.2),
  );
  const radians = fill.rotation * Math.PI / 180;
  const rotatedWidth = Math.abs(measuredWidth * Math.cos(radians)) +
    Math.abs(measuredHeight * Math.sin(radians));
  const rotatedHeight = Math.abs(measuredWidth * Math.sin(radians)) +
    Math.abs(measuredHeight * Math.cos(radians));
  const cellWidth = Math.max(1, Math.ceil(rotatedWidth + fill.placement.horizontalSpacing));
  const cellHeight = Math.max(1, Math.ceil(rotatedHeight + fill.placement.verticalSpacing));
  const logicalWidth = cellWidth;
  const logicalHeight = cellHeight * (fill.placement.rowOffset === 0 ? 1 : 2);
  const width = Math.max(1, Math.round(logicalWidth * pixelRatio));
  const height = Math.max(1, Math.round(logicalHeight * pixelRatio));
  const { context } = browserCanvas(width, height);
  context.scale(width / logicalWidth, height / logicalHeight);
  context.font = font;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = fill.color;
  context.globalAlpha = fill.opacity;

  const rowCount = fill.placement.rowOffset === 0 ? 1 : 2;
  for (let row = -2; row <= rowCount + 1; row++) {
    const rowParity = ((row % 2) + 2) % 2;
    const offset = rowParity * cellWidth * fill.placement.rowOffset;
    for (let column = -2; column <= 2; column++) {
      context.save();
      context.translate(
        column * cellWidth + cellWidth / 2 + offset,
        row * cellHeight + cellHeight / 2,
      );
      context.rotate(radians);
      fillSpacedText(context, characters, measuredWidth, fill.letterSpacing);
      context.restore();
    }
  }
  return canvasTile(context, width, height);
}

function primitivePattern(pattern: Pattern, fill: PatternPrimitiveFill): Pattern {
  return { ...pattern, fill };
}

async function primitiveTile(
  pattern: Pattern,
  fill: PatternPrimitiveFill,
  pixelRatio: number,
  tileSize?: number,
): Promise<TileImage> {
  if (fill.family === "svg") return svgTile(fill, pixelRatio);
  if (fill.family === "text") return textTile(fill, pixelRatio);
  return createGeometricPatternTile(primitivePattern(pattern, fill), { pixelRatio, tileSize });
}

/**
 * Rasterizes a canonical Pattern. Geometric fills work in browsers and Node;
 * SVG and text fills use the browser canvas. Pattern-level opacity remains a
 * MapLibre paint property and is not baked into the returned image.
 */
export async function createPatternTile(
  value: Pattern,
  options: CreatePatternTileOptions = {},
): Promise<TileImage> {
  const pattern = parsePattern(value);
  if (pattern.fill.family === "solid") {
    throw new Error("solid fills use MapLibre fill-color and do not need a pattern tile");
  }
  const pixelRatio = resolvedPixelRatio(pattern, options.pixelRatio);
  if (pattern.fill.family !== "composite") {
    return primitiveTile(pattern, pattern.fill, pixelRatio, options.tileSize);
  }
  if (pattern.fill.layers.some((layer) => layer.family === "text")) {
    throw new Error("text layers cannot yet be mixed inside a composite repeat tile");
  }
  const placementSizes = pattern.fill.layers.flatMap((layer) =>
    layer.family === "glyph" || layer.family === "svg"
      ? [layer.placement.tileSize]
      : []);
  const tileSize = options.tileSize ?? placementSizes[0];
  if (tileSize !== undefined && placementSizes.some((size) => size !== tileSize)) {
    throw new Error("composite glyph and SVG layers must use the same tileSize");
  }
  const tiles = await Promise.all(pattern.fill.layers.map(async (layer) => ({
    image: await primitiveTile(pattern, layer, pixelRatio, tileSize),
  })));
  return composeTileImages(tiles);
}

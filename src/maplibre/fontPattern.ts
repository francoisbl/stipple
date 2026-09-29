import type { Map as MaplibreMap } from "maplibre-gl";
import type { TileImage } from "../engine/types";
import {
  createFontPatternDefinition,
  serializePatternDefinition,
} from "./patternDefinition";

export interface FontPatternOptions {
  imageId: string;
  /** Text repeated through the fill. A single letter or short abbreviation works best. */
  text: string;
  /** CSS font-family value. Default `sans-serif`. */
  fontFamily?: string;
  /** Font size in layout pixels. Default 18. */
  fontSize?: number;
  /** CSS font-weight value. Default `500`. */
  fontWeight?: string;
  /** Upright or italic letterforms. Default `normal`. */
  fontStyle?: "normal" | "italic";
  /** Extra spacing between characters in layout pixels. Default 0. */
  letterSpacing?: number;
  /** Horizontal gap between repeated labels in layout pixels. Default 26. */
  horizontalSpacing?: number;
  /** Vertical gap between repeated rows in layout pixels. Default 22. */
  verticalSpacing?: number;
  /** Clockwise text rotation in degrees. Default 0. */
  rotationDeg?: number;
  /** Offset alternate rows by half a cell. Default true. */
  stagger?: boolean;
  /** Text colour. Default black. */
  color?: string;
  /** Raster pixels per MapLibre layout pixel. Defaults to the display ratio, capped at 2 when installed. */
  pixelRatio?: number;
}

function resolvePixelRatio(value: number | undefined, useDisplayRatio: boolean): number {
  const displayRatio = useDisplayRatio && typeof globalThis.devicePixelRatio === "number"
    ? globalThis.devicePixelRatio
    : 1;
  const ratio = value ?? Math.min(Math.max(displayRatio, 1), 2);
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new RangeError("pixelRatio must be a finite number greater than 0");
  }
  return ratio;
}

function textWidth(
  ctx: CanvasRenderingContext2D,
  characters: string[],
  letterSpacing: number,
): number {
  const glyphs = characters.reduce((total, character) => total + ctx.measureText(character).width, 0);
  return Math.max(1, glyphs + Math.max(0, characters.length - 1) * letterSpacing);
}

function fillSpacedText(
  ctx: CanvasRenderingContext2D,
  characters: string[],
  width: number,
  letterSpacing: number,
): void {
  let x = -width / 2;
  for (const character of characters) {
    const characterWidth = ctx.measureText(character).width;
    ctx.fillText(character, x, 0);
    x += characterWidth + letterSpacing;
  }
}

/** Rasterizes a seamless, optionally staggered text pattern in the browser. */
export async function createFontPatternTile(options: FontPatternOptions): Promise<TileImage> {
  const definition = createFontPatternDefinition(options);
  const pixelRatio = resolvePixelRatio(options.pixelRatio, false);
  const {
    text,
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle,
    letterSpacing,
    horizontalSpacing,
    verticalSpacing,
    rotationDeg,
    stagger,
    color,
  } = definition;

  if (typeof document === "undefined") {
    throw new Error("Font pattern rasterization requires a browser canvas");
  }

  const font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  if (document.fonts?.load) {
    await document.fonts.load(font, text.slice(0, 32)).catch(() => undefined);
  }

  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");
  if (!measureContext) throw new Error("2D canvas context unavailable");
  measureContext.font = font;
  const characters = Array.from(text);
  const measuredWidth = textWidth(measureContext, characters, letterSpacing);
  const metrics = measureContext.measureText(text);
  const measuredHeight = Math.max(
    fontSize,
    (metrics.actualBoundingBoxAscent || fontSize * 0.8) +
      (metrics.actualBoundingBoxDescent || fontSize * 0.2),
  );
  const radians = rotationDeg * Math.PI / 180;
  const rotatedWidth = Math.abs(measuredWidth * Math.cos(radians)) +
    Math.abs(measuredHeight * Math.sin(radians));
  const rotatedHeight = Math.abs(measuredWidth * Math.sin(radians)) +
    Math.abs(measuredHeight * Math.cos(radians));
  const cellWidth = Math.max(1, Math.ceil(rotatedWidth + horizontalSpacing));
  const rowHeight = Math.max(1, Math.ceil(rotatedHeight + verticalSpacing));
  const logicalWidth = cellWidth * (stagger ? 2 : 1);
  const logicalHeight = rowHeight * (stagger ? 2 : 1);
  const physicalWidth = Math.max(1, Math.round(logicalWidth * pixelRatio));
  const physicalHeight = Math.max(1, Math.round(logicalHeight * pixelRatio));

  const canvas = document.createElement("canvas");
  canvas.width = physicalWidth;
  canvas.height = physicalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  ctx.clearRect(0, 0, physicalWidth, physicalHeight);
  ctx.scale(physicalWidth / logicalWidth, physicalHeight / logicalHeight);
  ctx.font = font;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;

  // Include neighbouring cells. Their clipped portions reappear on the
  // opposite side of the repeated tile, so rotated/italic glyphs stay seamless.
  const rowCount = stagger ? 2 : 1;
  const columnCount = stagger ? 2 : 1;
  for (let row = -2; row <= rowCount + 1; row++) {
    const offset = stagger && Math.abs(row % 2) === 1 ? cellWidth / 2 : 0;
    for (let column = -2; column <= columnCount + 1; column++) {
      const x = column * cellWidth + cellWidth / 2 + offset;
      const y = row * rowHeight + rowHeight / 2;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(radians);
      fillSpacedText(ctx, characters, measuredWidth, letterSpacing);
      ctx.restore();
    }
  }
  const imageData = ctx.getImageData(0, 0, physicalWidth, physicalHeight);
  return {
    width: physicalWidth,
    height: physicalHeight,
    data: new Uint8Array(imageData.data.buffer),
  };
}

interface InstalledFontPattern {
  signature: string;
  width: number;
  height: number;
  pixelRatio: number;
}

const installedFontPatterns = new WeakMap<MaplibreMap, Map<string, InstalledFontPattern>>();
const fontPatternGenerations = new WeakMap<MaplibreMap, Map<string, number>>();

/** Installs or updates a browser-rasterized text texture as a MapLibre fill pattern. */
export async function installFontPatternFill(map: MaplibreMap, options: FontPatternOptions): Promise<void> {
  if (typeof options.imageId !== "string" || options.imageId.trim().length === 0) {
    throw new TypeError("imageId must be a non-empty string");
  }
  const definition = createFontPatternDefinition(options);
  const pixelRatio = resolvePixelRatio(options.pixelRatio, true);
  const signature = `${serializePatternDefinition(definition)}@${pixelRatio}`;
  let installedById = installedFontPatterns.get(map);
  if (!installedById) {
    installedById = new Map();
    installedFontPatterns.set(map, installedById);
  }
  if (map.hasImage(options.imageId) && installedById.get(options.imageId)?.signature === signature) {
    return;
  }

  let generationsById = fontPatternGenerations.get(map);
  if (!generationsById) {
    generationsById = new Map();
    fontPatternGenerations.set(map, generationsById);
  }
  const generation = (generationsById.get(options.imageId) ?? 0) + 1;
  generationsById.set(options.imageId, generation);

  const tile = await createFontPatternTile({ ...options, pixelRatio });
  if (generationsById.get(options.imageId) !== generation) return;

  const previous = installedById.get(options.imageId);
  if (
    map.hasImage(options.imageId) &&
    previous?.width === tile.width &&
    previous.height === tile.height &&
    previous.pixelRatio === pixelRatio
  ) {
    map.updateImage(options.imageId, tile);
  } else {
    if (map.hasImage(options.imageId)) map.removeImage(options.imageId);
    map.addImage(options.imageId, tile, { pixelRatio });
  }
  installedById.set(options.imageId, {
    signature,
    width: tile.width,
    height: tile.height,
    pixelRatio,
  });
  map.triggerRepaint();
}

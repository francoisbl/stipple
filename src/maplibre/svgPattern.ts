import type { Map as MaplibreMap } from "maplibre-gl";
import { createSvgScatterLayout } from "../engine/svgScatterLayout";
import type { SvgDistributionMode } from "../engine/svgScatterLayout";
import type { TileImage } from "../engine/types";
import { loadSvgImage } from "./loadSvgImage";
import {
  createSvgPatternDefinition,
  serializePatternDefinition,
} from "./patternDefinition";

export interface SvgPatternOptions {
  imageId: string;
  /** Raw `<svg>...</svg>` markup, used as the repeatable stamp. */
  svg: string;
  /** Size of the generated meta-tile in layout px. Default 288. */
  tileSize?: number;
  /** Rendered size of each SVG stamp in px. Default 28. */
  stampSize?: number;
  /** Approximate stamps per 100x100px area. Default 1.4. */
  density?: number;
  /** Deterministic variation seed. The same seed always gives the same tile. */
  seed?: number | string;
  /** +/- rotation jitter per stamp, in degrees. Default 0 (regular grid). */
  rotationJitterDeg?: number;
  /** +/- scale jitter per stamp, as a fraction of stampSize. Default 0 (regular grid). */
  scaleJitter?: number;
  /** +/- position jitter per stamp, as a fraction of the grid cell. Default 0.15 gives a light irregularity, not a full organic scatter. 0 = exact grid. */
  positionJitter?: number;
  /** Offset alternate rows by half a cell (quincunx), the classic regular cartographic symbol layout (orchard/marsh map fills). Default true. */
  stagger?: boolean;
  /** Regular grid, offset rows, or seamless blue-noise placement. */
  distribution?: SvgDistributionMode;
  /** Minimum gap between symbols in natural mode, in layout px. Default 0. */
  minSpacing?: number;
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

/**
 * Rasterizes an SVG into a large seamless "meta-tile" repeated on a grid
 * (seeded jitter, so deterministic). Defaults to a regular, lightly
 * staggered cartographic grid, the classic look of official map symbology
 * used for orchard and marsh fills, rather than a fully organic scatter. Raise
 * `rotationJitterDeg`/`scaleJitter`/`positionJitter` for a more natural,
 * irregular look (grass, foliage...). Stamps near an edge are additionally
 * drawn wrapped on the opposite side so the tile still repeats seamlessly.
 *
 * Uses the browser's native SVG rasterizer (`Image` + canvas). No SVG
 * parsing of our own, per MapLibre's own `addImage` pipeline.
 */
export async function createSvgScatterTile(options: SvgPatternOptions): Promise<TileImage> {
  const definition = createSvgPatternDefinition(options);
  const pixelRatio = resolvePixelRatio(options.pixelRatio, false);
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
    minSpacing,
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
    minSpacing,
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
    data: new Uint8Array(imageData.data.buffer),
  };
}

interface InstalledSvgPattern {
  signature: string;
  width: number;
  height: number;
  pixelRatio: number;
}

const installedSvgPatterns = new WeakMap<MaplibreMap, Map<string, InstalledSvgPattern>>();
const svgPatternGenerations = new WeakMap<MaplibreMap, Map<string, number>>();

/**
 * Rasterizes an SVG scatter tile and installs it as a `fill-pattern` image.
 * Repeated equivalent calls are no-ops, same-sized changes use `updateImage`,
 * and a stale asynchronous render cannot overwrite a newer call.
 */
export async function installSvgPatternFill(map: MaplibreMap, options: SvgPatternOptions): Promise<void> {
  const definition = createSvgPatternDefinition(options);
  const pixelRatio = resolvePixelRatio(options.pixelRatio, true);
  const signature = `${serializePatternDefinition(definition)}@${pixelRatio}`;
  let installedById = installedSvgPatterns.get(map);
  if (!installedById) {
    installedById = new Map();
    installedSvgPatterns.set(map, installedById);
  }
  if (map.hasImage(options.imageId) && installedById.get(options.imageId)?.signature === signature) {
    return;
  }

  let generationsById = svgPatternGenerations.get(map);
  if (!generationsById) {
    generationsById = new Map();
    svgPatternGenerations.set(map, generationsById);
  }
  const generation = (generationsById.get(options.imageId) ?? 0) + 1;
  generationsById.set(options.imageId, generation);

  const tile = await createSvgScatterTile({ ...options, pixelRatio });
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

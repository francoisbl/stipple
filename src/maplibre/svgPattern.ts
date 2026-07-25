import type { Map as MaplibreMap } from "maplibre-gl";
import { createSvgScatterLayout } from "../engine/svgScatterLayout";
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
  /** Size of the generated meta-tile in px. Default 192. */
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
  } = definition;

  const image = await loadSvgImage(svg);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = tileSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  ctx.clearRect(0, 0, tileSize, tileSize);

  const placements = createSvgScatterLayout({
    tileSize,
    stampSize,
    density,
    seed,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger,
  });

  for (const placement of placements) {
    ctx.save();
    ctx.translate(placement.x, placement.y);
    ctx.rotate(placement.rotationRad);
    ctx.scale(placement.scale, placement.scale);
    ctx.drawImage(image, -stampSize / 2, -stampSize / 2, stampSize, stampSize);
    ctx.restore();
  }

  const imageData = ctx.getImageData(0, 0, tileSize, tileSize);
  return { width: tileSize, height: tileSize, data: new Uint8Array(imageData.data.buffer) };
}

interface InstalledSvgPattern {
  signature: string;
  width: number;
  height: number;
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
  const signature = serializePatternDefinition(definition);
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

  const tile = await createSvgScatterTile(options);
  if (generationsById.get(options.imageId) !== generation) return;

  const previous = installedById.get(options.imageId);
  if (
    map.hasImage(options.imageId) &&
    previous?.width === tile.width &&
    previous.height === tile.height
  ) {
    map.updateImage(options.imageId, tile);
  } else {
    if (map.hasImage(options.imageId)) map.removeImage(options.imageId);
    map.addImage(options.imageId, tile);
  }
  installedById.set(options.imageId, {
    signature,
    width: tile.width,
    height: tile.height,
  });
  map.triggerRepaint();
}

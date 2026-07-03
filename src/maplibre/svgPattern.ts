import type { Map as MaplibreMap } from "maplibre-gl";
import { hashStringToSeed, mulberry32 } from "../engine/seededRandom";
import type { TileImage } from "../engine/types";
import { loadSvgImage } from "./loadSvgImage";

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
  /** Deterministic variation seed — same seed always gives the same tile. */
  seed?: number | string;
  /** +/- rotation jitter per stamp, in degrees. Default 25. */
  rotationJitterDeg?: number;
  /** +/- scale jitter per stamp, as a fraction of stampSize. Default 0.25. */
  scaleJitter?: number;
}

/**
 * Rasterizes an SVG into a large seamless "meta-tile" scattered with many
 * slightly rotated/scaled repetitions (seeded, so deterministic). Spreading
 * many stamps across a tile much bigger than any single stamp pushes the
 * visible repeat period out, avoiding the "wallpaper" look that a single
 * small tiled SVG produces on organic motifs (grass, foliage...). Stamps
 * near an edge are additionally drawn wrapped on the opposite side so the
 * tile still repeats seamlessly.
 *
 * Uses the browser's native SVG rasterizer (`Image` + canvas) — no SVG
 * parsing of our own, per MapLibre's own `addImage` pipeline.
 */
export async function createSvgScatterTile(options: SvgPatternOptions): Promise<TileImage> {
  const {
    svg,
    tileSize = 192,
    stampSize = 28,
    density = 1.4,
    seed = 1,
    rotationJitterDeg = 25,
    scaleJitter = 0.25,
  } = options;

  const image = await loadSvgImage(svg);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = tileSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  ctx.clearRect(0, 0, tileSize, tileSize);

  const seedNum = typeof seed === "string" ? hashStringToSeed(seed) : seed;
  const rand = mulberry32(seedNum);
  const cell = 100 / Math.sqrt(density); // average spacing for the target density
  const cols = Math.ceil(tileSize / cell);
  const rows = Math.ceil(tileSize / cell);
  const margin = stampSize;

  const stamp = (cx: number, cy: number) => {
    const rotation = (rand() * 2 - 1) * rotationJitterDeg * (Math.PI / 180);
    const scale = 1 + (rand() * 2 - 1) * scaleJitter;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.drawImage(image, -stampSize / 2, -stampSize / 2, stampSize, stampSize);
    ctx.restore();
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const jitterX = (rand() - 0.5) * cell * 0.8;
      const jitterY = (rand() - 0.5) * cell * 0.8;
      const cx = col * cell + cell / 2 + jitterX;
      const cy = row * cell + cell / 2 + jitterY;

      stamp(cx, cy);
      // Wrap stamps near an edge (and corner) so the tile repeats seamlessly.
      const nearLeft = cx < margin;
      const nearRight = cx > tileSize - margin;
      const nearTop = cy < margin;
      const nearBottom = cy > tileSize - margin;
      if (nearLeft) stamp(cx + tileSize, cy);
      if (nearRight) stamp(cx - tileSize, cy);
      if (nearTop) stamp(cx, cy + tileSize);
      if (nearBottom) stamp(cx, cy - tileSize);
      if (nearLeft && nearTop) stamp(cx + tileSize, cy + tileSize);
      if (nearRight && nearTop) stamp(cx - tileSize, cy + tileSize);
      if (nearLeft && nearBottom) stamp(cx + tileSize, cy - tileSize);
      if (nearRight && nearBottom) stamp(cx - tileSize, cy - tileSize);
    }
  }

  const imageData = ctx.getImageData(0, 0, tileSize, tileSize);
  return { width: tileSize, height: tileSize, data: new Uint8Array(imageData.data.buffer) };
}

/** Rasterizes an SVG scatter tile and installs it as a `fill-pattern` image. */
export async function installSvgPatternFill(map: MaplibreMap, options: SvgPatternOptions): Promise<void> {
  const tile = await createSvgScatterTile(options);
  if (map.hasImage(options.imageId)) map.removeImage(options.imageId);
  map.addImage(options.imageId, tile);
  map.triggerRepaint();
}

import type { Map as MaplibreMap } from "maplibre-gl";
import { makeTile } from "../engine/makeTile";
import type { PatternType, TileSize } from "../engine/types";

interface InstalledPattern {
  signature: string;
  width: number;
  height: number;
  pixelRatio: number;
}

// Last-installed state per (map, imageId), so equivalent repeated calls are
// no-ops and changed calls can choose updateImage or addImage safely.
const installedPatterns = new WeakMap<MaplibreMap, Map<string, InstalledPattern>>();

export interface SyncPatternTextureOptions {
  imageId: string;
  pattern: PatternType;
  size: TileSize;
  color: string;
  weight: number;
  angle: number;
  /** Raster pixels per MapLibre layout pixel. Defaults to the display ratio, capped at 2. */
  pixelRatio?: number;
  /** Fixed dot count for stipple tiles that change size across zoom levels. */
  stippleCount?: number;
}

function resolvePixelRatio(value?: number): number {
  const displayRatio = typeof globalThis.devicePixelRatio === "number"
    ? globalThis.devicePixelRatio
    : 1;
  const ratio = value ?? Math.min(Math.max(displayRatio, 1), 2);
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new RangeError("pixelRatio must be a finite number greater than 0");
  }
  return ratio;
}

/**
 * (Re)generates a fill-pattern texture with {@link makeTile} and pushes it to
 * the map. Uses `updateImage` when the tile dimensions are unchanged (no flash),
 * or `removeImage` + `addImage` when the pattern type or tile size changed.
 * Safe to call on every UI change (colour picker, slider drag, etc).
 */
export function syncPatternTexture(map: MaplibreMap, options: SyncPatternTextureOptions): void {
  const { imageId, pattern, size, color, weight, angle, stippleCount } = options;
  if (pattern === "solid") return;
  const pixelRatio = resolvePixelRatio(options.pixelRatio);

  let byImage = installedPatterns.get(map);
  if (!byImage) {
    byImage = new Map();
    installedPatterns.set(map, byImage);
  }

  const signature = JSON.stringify({ pattern, size, color, weight, angle, pixelRatio, stippleCount });
  const previous = byImage.get(imageId);
  if (map.hasImage(imageId) && previous?.signature === signature) return;

  const tile = makeTile(pattern, size, color, weight, angle, { pixelRatio, stippleCount });

  if (
    map.hasImage(imageId) &&
    previous?.width === tile.width &&
    previous.height === tile.height &&
    previous.pixelRatio === pixelRatio
  ) {
    map.updateImage(imageId, tile);
  } else {
    if (map.hasImage(imageId)) map.removeImage(imageId);
    map.addImage(imageId, tile, { pixelRatio });
  }
  byImage.set(imageId, {
    signature,
    width: tile.width,
    height: tile.height,
    pixelRatio,
  });
  map.triggerRepaint();
}

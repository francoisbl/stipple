import type { Map as MaplibreMap } from "maplibre-gl";
import { makeTile } from "../engine/makeTile";
import type { PatternType, TileSize } from "../engine/types";

interface InstalledPattern {
  signature: string;
  size: number;
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
}

/**
 * (Re)generates a fill-pattern texture with {@link makeTile} and pushes it to
 * the map. Uses `updateImage` when the tile dimensions are unchanged (no flash),
 * or `removeImage` + `addImage` when the pattern type or tile size changed.
 * Safe to call on every UI change (colour picker, slider drag, etc).
 */
export function syncPatternTexture(map: MaplibreMap, options: SyncPatternTextureOptions): void {
  const { imageId, pattern, size, color, weight, angle } = options;
  if (pattern === "solid") return;

  let byImage = installedPatterns.get(map);
  if (!byImage) {
    byImage = new Map();
    installedPatterns.set(map, byImage);
  }

  const signature = JSON.stringify({ pattern, size, color, weight, angle });
  const previous = byImage.get(imageId);
  if (map.hasImage(imageId) && previous?.signature === signature) return;

  const tile = makeTile(pattern, size, color, weight, angle);

  if (map.hasImage(imageId) && previous?.size === size) {
    map.updateImage(imageId, tile);
  } else {
    if (map.hasImage(imageId)) map.removeImage(imageId);
    map.addImage(imageId, tile);
  }
  byImage.set(imageId, { signature, size });
  map.triggerRepaint();
}

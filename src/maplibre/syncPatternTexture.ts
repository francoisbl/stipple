import type { Map as MaplibreMap } from "maplibre-gl";
import { makeTile } from "../engine/makeTile";
import type { PatternType, TileSize } from "../engine/types";

// Last-installed signature per (map, imageId), so repeated calls know whether
// updateImage (flash-free) or removeImage+addImage (dimensions changed) applies.
const signatures = new WeakMap<MaplibreMap, Map<string, string>>();

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
 * the map — `updateImage` when the tile dimensions are unchanged (no flash),
 * or `removeImage` + `addImage` when the pattern type or tile size changed.
 * Safe to call on every UI change (colour picker, slider drag, etc).
 */
export function syncPatternTexture(map: MaplibreMap, options: SyncPatternTextureOptions): void {
  const { imageId, pattern, size, color, weight, angle } = options;
  if (pattern === "solid") return;

  let bySource = signatures.get(map);
  if (!bySource) {
    bySource = new Map();
    signatures.set(map, bySource);
  }

  const signature = `${pattern}@${size}`;
  const tile = makeTile(pattern, size, color, weight, angle);

  if (map.hasImage(imageId) && bySource.get(imageId) === signature) {
    map.updateImage(imageId, tile);
  } else {
    if (map.hasImage(imageId)) map.removeImage(imageId);
    map.addImage(imageId, tile);
    bySource.set(imageId, signature);
  }
  map.triggerRepaint();
}

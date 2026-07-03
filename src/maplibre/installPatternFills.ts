import type { Map as MaplibreMap } from "maplibre-gl";
import type { PatternType, TileSize } from "../engine/types";
import { syncPatternTexture } from "./syncPatternTexture";

interface EnhancedPatternMetadata {
  type: PatternType;
  tile: TileSize;
  color: string;
  weight: number;
  angle: number;
  imageId: string;
}

export interface StyleLike {
  layers: Array<{ metadata?: Record<string, unknown> }>;
}

/**
 * Scans a style (or `map.getStyle()`) for layers carrying the
 * `enhanced:pattern` metadata produced by {@link buildStyleFragment}, and
 * generates + installs the matching fill-pattern texture for each. This is
 * the production entry point: the style.json only describes *which* pattern
 * to use, this function is what actually bakes the canvas image — call it
 * once after `map.on('load', ...)` (and again if you swap styles).
 */
export function installPatternFills(map: MaplibreMap, style: StyleLike): void {
  for (const layer of style.layers) {
    const p = layer.metadata?.["enhanced:pattern"] as EnhancedPatternMetadata | undefined;
    if (!p) continue;
    syncPatternTexture(map, {
      imageId: p.imageId,
      pattern: p.type,
      size: p.tile,
      color: p.color,
      weight: p.weight,
      angle: p.angle,
    });
  }
}

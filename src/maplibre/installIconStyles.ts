import type { Map as MaplibreMap } from "maplibre-gl";
import { addSvgIcon } from "./svgIcon";

interface EnhancedIconMetadata {
  svg: string;
  size: number;
  imageId: string;
}

export interface IconStyleLike {
  layers: Array<{ metadata?: Record<string, unknown> }>;
}

/**
 * Scans a style (or `map.getStyle()`) for layers carrying the
 * `enhanced:icon` metadata produced by {@link buildIconStyleFragment}, and
 * rasterizes + installs the matching SVG icon for each. Mirrors
 * {@link installPatternFills} for the point/symbol case — call once after
 * `map.on('load', ...)` (and again if you swap styles).
 */
export async function installIconStyles(map: MaplibreMap, style: IconStyleLike): Promise<void> {
  for (const layer of style.layers) {
    const meta = layer.metadata?.["enhanced:icon"] as EnhancedIconMetadata | undefined;
    if (!meta) continue;
    await addSvgIcon(map, { id: meta.imageId, svg: meta.svg, size: meta.size });
  }
}

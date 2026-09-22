import type { Map as MaplibreMap } from "maplibre-gl";
import {
  PATTERN_METADATA_KEY,
  parsePatternMetadata,
  serializePatternDefinition,
} from "./patternDefinition";
import { installSvgPatternFill } from "./svgPattern";
import { syncPatternTexture } from "./syncPatternTexture";

export interface StyleLike {
  layers: Array<{ metadata?: Record<string, unknown> }>;
}

/**
 * Scans a style (or `map.getStyle()`) for layers carrying the
 * versioned metadata produced by {@link buildStyleFragment}, validates it,
 * and installs each distinct geometric or SVG texture. Custom metadata is
 * not interpreted by MapLibre itself.
 */
export async function installPatternFills(map: MaplibreMap, style: StyleLike): Promise<void> {
  const installed = new Map<string, string>();
  const pending: Promise<void>[] = [];

  for (const layer of style.layers) {
    const metadata = layer.metadata;
    if (!metadata) continue;
    const rawDefinition = metadata[PATTERN_METADATA_KEY];
    if (!rawDefinition) continue;
    const registration = parsePatternMetadata(rawDefinition);

    const definitions = [
      { imageId: registration.imageId, definition: registration.definition },
      ...(registration.variants ?? []),
    ];
    for (const item of definitions) {
      const signature = serializePatternDefinition(item.definition);
      const previous = installed.get(item.imageId);
      if (previous && previous !== signature) {
        throw new Error(`Conflicting pattern definitions use image id "${item.imageId}"`);
      }
      if (previous) continue;
      installed.set(item.imageId, signature);

      const p = item.definition;
      if (p.kind === "geometric") {
        syncPatternTexture(map, {
          imageId: item.imageId,
          pattern: p.pattern,
          size: p.size,
          color: p.color,
          weight: p.weight,
          angle: p.angle,
        });
      } else {
        pending.push(installSvgPatternFill(map, { imageId: item.imageId, ...p }));
      }
    }
  }
  await Promise.all(pending);
}

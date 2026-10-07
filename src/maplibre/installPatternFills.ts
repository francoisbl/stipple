import type { Map as MaplibreMap } from "maplibre-gl";
import {
  PATTERN_METADATA_KEY,
  parsePatternMetadata,
  serializePatternDefinition,
} from "./patternDefinition";
import { installSvgPatternFill } from "./svgPattern";
import { installFontPatternFill } from "./fontPattern";
import { syncPatternTexture } from "./syncPatternTexture";
import {
  CANONICAL_PATTERN_METADATA_KEY,
  parseCanonicalPatternMetadata,
} from "./patternStyle";
import { installPatternTexture } from "./installPatternTexture";

export interface StyleLike {
  layers: Array<{ metadata?: Record<string, unknown> }>;
}

/**
 * Scans a style (or `map.getStyle()`) for legacy or canonical Stipple
 * metadata, validates it, and installs each distinct texture. Custom
 * metadata is not interpreted by MapLibre itself.
 */
export async function installPatternFills(map: MaplibreMap, style: StyleLike): Promise<void> {
  const installed = new Map<string, string>();
  const pending: Promise<void>[] = [];

  for (const layer of style.layers) {
    const metadata = layer.metadata;
    if (!metadata) continue;
    const canonical = metadata[CANONICAL_PATTERN_METADATA_KEY];
    if (canonical) {
      const registration = parseCanonicalPatternMetadata(canonical);
      for (const item of registration.patterns) {
        const signature = `canonical:${JSON.stringify(item.pattern)}`;
        const previous = installed.get(item.imageId);
        if (previous && previous !== signature) {
          throw new Error(`Conflicting pattern definitions use image id "${item.imageId}"`);
        }
        if (previous) continue;
        installed.set(item.imageId, signature);
        pending.push(installPatternTexture(map, item));
      }
    }
    const rawDefinition = metadata[PATTERN_METADATA_KEY];
    if (!rawDefinition) continue;
    const registration = parsePatternMetadata(rawDefinition);

    const definitions = [
      { imageId: registration.imageId, definition: registration.definition },
      ...(registration.variants ?? []),
    ];
    for (const item of definitions) {
      const signature = `legacy:${serializePatternDefinition(item.definition)}`;
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
          pixelRatio: p.pixelRatio,
          stippleCount: p.stippleCount,
        });
      } else if (p.kind === "svg") {
        pending.push(installSvgPatternFill(map, { imageId: item.imageId, ...p }));
      } else {
        pending.push(installFontPatternFill(map, { imageId: item.imageId, ...p }));
      }
    }
  }
  await Promise.all(pending);
}

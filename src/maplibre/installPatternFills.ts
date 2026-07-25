import type { Map as MaplibreMap } from "maplibre-gl";
import type { PatternType, TileSize } from "../engine/types";
import {
  LEGACY_PATTERN_METADATA_KEY,
  PATTERN_METADATA_KEY,
  parsePatternMetadata,
  serializePatternDefinition,
  type GeometricPatternDefinition,
  type PatternMetadataV1,
} from "./patternDefinition";
import { installSvgPatternFill } from "./svgPattern";
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

function fromLegacyMetadata(value: unknown): PatternMetadataV1 | undefined {
  if (!value || typeof value !== "object") return undefined;
  const legacy = value as Partial<EnhancedPatternMetadata>;
  if (
    legacy.type === "solid" ||
    typeof legacy.type !== "string" ||
    typeof legacy.tile !== "number" ||
    typeof legacy.color !== "string" ||
    typeof legacy.weight !== "number" ||
    typeof legacy.angle !== "number" ||
    typeof legacy.imageId !== "string"
  ) {
    return undefined;
  }
  return {
    imageId: legacy.imageId,
    definition: {
      kind: "geometric",
      pattern: legacy.type,
      size: legacy.tile,
      color: legacy.color,
      weight: legacy.weight,
      angle: legacy.angle,
    } as GeometricPatternDefinition,
  };
}

/**
 * Scans a style (or `map.getStyle()`) for layers carrying the
 * versioned metadata produced by {@link buildStyleFragment}, validates it,
 * and installs each distinct geometric or SVG texture. Legacy
 * `enhanced:pattern` geometric metadata remains readable during the 0.x
 * migration. This is the production entry point: custom metadata is not
 * interpreted by MapLibre itself.
 */
export async function installPatternFills(map: MaplibreMap, style: StyleLike): Promise<void> {
  const installed = new Map<string, string>();
  const pending: Promise<void>[] = [];

  for (const layer of style.layers) {
    const metadata = layer.metadata;
    if (!metadata) continue;
    const rawV1 = metadata[PATTERN_METADATA_KEY];
    const registration = rawV1
      ? parsePatternMetadata(rawV1)
      : fromLegacyMetadata(metadata[LEGACY_PATTERN_METADATA_KEY]);
    if (!registration) continue;

    const signature = serializePatternDefinition(registration.definition);
    const previous = installed.get(registration.imageId);
    if (previous && previous !== signature) {
      throw new Error(`Conflicting pattern definitions use image id "${registration.imageId}"`);
    }
    if (previous) continue;
    installed.set(registration.imageId, signature);

    const p = registration.definition;
    if (p.kind === "geometric") {
      syncPatternTexture(map, {
        imageId: registration.imageId,
        pattern: p.pattern,
        size: p.size,
        color: p.color,
        weight: p.weight,
        angle: p.angle,
      });
    } else {
      pending.push(installSvgPatternFill(map, { imageId: registration.imageId, ...p }));
    }
  }
  await Promise.all(pending);
}

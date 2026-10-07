import type { Map as MaplibreMap } from "maplibre-gl";
import { parsePattern, serializePattern, type Pattern } from "../model/pattern";
import { createPatternTile } from "./patternTile";

export interface InstallPatternTextureOptions {
  imageId: string;
  pattern: Pattern;
  /** Overrides Pattern.render.pixelRatio. */
  pixelRatio?: number;
}

interface InstalledPattern {
  signature: string;
  width: number;
  height: number;
  pixelRatio: number;
}

const installed = new WeakMap<MaplibreMap, Map<string, InstalledPattern>>();
const generations = new WeakMap<MaplibreMap, Map<string, number>>();

function pixelRatio(pattern: Pattern, override?: number): number {
  const ratio = override ?? (pattern.render.pixelRatio === "auto"
    ? Math.min(Math.max(globalThis.devicePixelRatio ?? 1, 1), 2)
    : pattern.render.pixelRatio);
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new RangeError("pixelRatio must be a finite number greater than 0");
  }
  return ratio;
}

/** Installs or updates one texture-producing canonical Pattern on a map. */
export async function installPatternTexture(
  map: MaplibreMap,
  options: InstallPatternTextureOptions,
): Promise<void> {
  if (typeof options.imageId !== "string" || options.imageId.trim().length === 0) {
    throw new TypeError("imageId must be a non-empty string");
  }
  const pattern = parsePattern(options.pattern);
  if (pattern.fill.family === "solid") {
    throw new Error("solid fills do not install a pattern texture");
  }
  const ratio = pixelRatio(pattern, options.pixelRatio);
  const signature = `${serializePattern(pattern)}@${ratio}`;
  let byId = installed.get(map);
  if (!byId) {
    byId = new Map();
    installed.set(map, byId);
  }
  if (map.hasImage(options.imageId) && byId.get(options.imageId)?.signature === signature) return;

  let generationById = generations.get(map);
  if (!generationById) {
    generationById = new Map();
    generations.set(map, generationById);
  }
  const generation = (generationById.get(options.imageId) ?? 0) + 1;
  generationById.set(options.imageId, generation);
  const tile = await createPatternTile(pattern, { pixelRatio: ratio });
  if (generationById.get(options.imageId) !== generation) return;

  const previous = byId.get(options.imageId);
  if (
    map.hasImage(options.imageId) &&
    previous?.width === tile.width &&
    previous.height === tile.height &&
    previous.pixelRatio === ratio
  ) {
    map.updateImage(options.imageId, tile);
  } else {
    if (map.hasImage(options.imageId)) map.removeImage(options.imageId);
    map.addImage(options.imageId, tile, { pixelRatio: ratio });
  }
  byId.set(options.imageId, {
    signature,
    width: tile.width,
    height: tile.height,
    pixelRatio: ratio,
  });
  map.triggerRepaint();
}

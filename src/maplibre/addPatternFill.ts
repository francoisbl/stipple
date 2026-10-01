import type { LayerSpecification, Map as MaplibreMap } from "maplibre-gl";
import { installPatternFills } from "./installPatternFills";

export interface PatternFillLayerTemplate {
  id: string;
  type: LayerSpecification["type"];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PatternFillFragment {
  layers: PatternFillLayerTemplate[];
}

export interface AddPatternFillOptions {
  /** Id of a source that already exists in the map. */
  sourceId: string;
  /** Omit or use null for GeoJSON. Required for vector tile sources. */
  sourceLayer?: string | null;
  /** Insert every generated layer immediately before this existing layer. */
  beforeId?: string;
  /** Source-neutral layer templates exported by Stipple. */
  pattern: PatternFillFragment;
}

export interface AddedPatternFill {
  layerIds: string[];
}

function nonEmptyString(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
}

async function waitForStyle(map: MaplibreMap): Promise<void> {
  // getStyle() becomes available as soon as the base style has loaded, which
  // is the point at which addLayer is legal. isStyleLoaded() also waits for
  // sources, sprites, and images and can become false again after style.load.
  if (map.getStyle()) return;
  await new Promise<void>((resolve) => {
    map.once("style.load", () => resolve());
  });
}

/**
 * Installs a Stipple pattern export on an existing MapLibre source.
 *
 * The helper waits for the style, resolves the source placeholders, installs
 * every generated texture, then adds the exported background, fill, and
 * outline layers in order.
 */
export async function addPatternFill(
  map: MaplibreMap,
  options: AddPatternFillOptions,
): Promise<AddedPatternFill> {
  nonEmptyString(options.sourceId, "sourceId");
  if (options.sourceLayer !== undefined && options.sourceLayer !== null) {
    nonEmptyString(options.sourceLayer, "sourceLayer");
  }
  if (options.beforeId !== undefined) {
    nonEmptyString(options.beforeId, "beforeId");
  }
  if (!options.pattern || !Array.isArray(options.pattern.layers)) {
    throw new TypeError("pattern.layers must be an array");
  }
  if (options.pattern.layers.length === 0) {
    throw new RangeError("pattern.layers must contain at least one layer");
  }

  await waitForStyle(map);

  if (!map.getSource(options.sourceId)) {
    throw new Error(`MapLibre source "${options.sourceId}" was not found`);
  }
  if (options.beforeId && !map.getLayer(options.beforeId)) {
    throw new Error(`MapLibre layer "${options.beforeId}" was not found`);
  }

  const layers = options.pattern.layers.map((template, index) => {
    if (!template || typeof template !== "object") {
      throw new TypeError(`pattern.layers[${index}] must be an object`);
    }
    nonEmptyString(template.id, `pattern.layers[${index}].id`);
    nonEmptyString(template.type, `pattern.layers[${index}].type`);

    const layer: PatternFillLayerTemplate = {
      ...template,
      id: template.id.split("<source>").join(options.sourceId),
      source: options.sourceId,
    };
    if (options.sourceLayer === undefined || options.sourceLayer === null) {
      delete layer["source-layer"];
    } else {
      layer["source-layer"] = options.sourceLayer;
    }
    return layer;
  });

  const layerIds = layers.map((layer) => layer.id);
  const uniqueIds = new Set(layerIds);
  if (uniqueIds.size !== layerIds.length) {
    throw new Error("Pattern fill contains duplicate layer ids");
  }
  for (const layerId of layerIds) {
    if (map.getLayer(layerId)) {
      throw new Error(`MapLibre layer "${layerId}" already exists`);
    }
  }

  await installPatternFills(map, { layers });

  const addedLayerIds: string[] = [];
  try {
    for (const layer of layers) {
      map.addLayer(layer as unknown as LayerSpecification, options.beforeId);
      addedLayerIds.push(layer.id);
    }
  } catch (error) {
    for (const layerId of addedLayerIds.reverse()) {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    }
    throw error;
  }

  return { layerIds };
}

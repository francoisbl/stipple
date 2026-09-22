import {
  createSvgScatterLayout,
  makeTile
} from "./chunk-TFHIJLYC.js";
import {
  loadSvgImage
} from "./chunk-Z7LWPO7O.js";
import "./chunk-GBEE6YET.js";

// src/maplibre/patternDefinition.ts
var PATTERN_METADATA_KEY = "maplibre-pattern-fills:v1";
var LEGACY_PATTERN_METADATA_KEY = "enhanced:pattern";
var geometricTypes = /* @__PURE__ */ new Set([
  "stipple",
  "hachures",
  "cross",
  "grid",
  "dots"
]);
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function finiteNumber(record, key) {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${key} must be a finite number`);
  }
  return value;
}
function positiveNumber(record, key) {
  const value = finiteNumber(record, key);
  if (value <= 0) throw new RangeError(`${key} must be greater than 0`);
  return value;
}
function nonNegativeNumber(record, key) {
  const value = finiteNumber(record, key);
  if (value < 0) throw new RangeError(`${key} must be greater than or equal to 0`);
  return value;
}
function nonEmptyString(record, key) {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${key} must be a non-empty string`);
  }
  return value;
}
function parsePatternDefinition(value) {
  if (!isRecord(value)) throw new TypeError("pattern definition must be an object");
  if (value.kind === "geometric") {
    if (typeof value.pattern !== "string" || !geometricTypes.has(value.pattern)) {
      throw new TypeError("pattern must be a supported non-solid geometric pattern");
    }
    return {
      kind: "geometric",
      pattern: value.pattern,
      size: positiveNumber(value, "size"),
      color: nonEmptyString(value, "color"),
      weight: positiveNumber(value, "weight"),
      angle: finiteNumber(value, "angle")
    };
  }
  if (value.kind === "svg") {
    const scaleJitter = nonNegativeNumber(value, "scaleJitter");
    if (scaleJitter >= 1) throw new RangeError("scaleJitter must be less than 1");
    const seed = value.seed;
    if ((typeof seed !== "string" || seed.length === 0) && (typeof seed !== "number" || !Number.isFinite(seed))) {
      throw new TypeError("seed must be a finite number or a non-empty string");
    }
    if (typeof value.stagger !== "boolean") throw new TypeError("stagger must be a boolean");
    const distribution = value.distribution ?? (value.stagger ? "offset" : "regular");
    if (distribution !== "regular" && distribution !== "offset" && distribution !== "natural") {
      throw new TypeError("distribution must be regular, offset, or natural");
    }
    return {
      kind: "svg",
      svg: nonEmptyString(value, "svg"),
      tileSize: positiveNumber(value, "tileSize"),
      stampSize: positiveNumber(value, "stampSize"),
      density: positiveNumber(value, "density"),
      seed,
      rotationJitterDeg: nonNegativeNumber(value, "rotationJitterDeg"),
      scaleJitter,
      positionJitter: nonNegativeNumber(value, "positionJitter"),
      stagger: distribution === "offset",
      distribution,
      minSpacing: value.minSpacing === void 0 ? 0 : nonNegativeNumber(value, "minSpacing")
    };
  }
  throw new TypeError('pattern definition kind must be "geometric" or "svg"');
}
function parsePatternMetadata(value) {
  if (!isRecord(value)) throw new TypeError("pattern metadata must be an object");
  const metadata = {
    imageId: nonEmptyString(value, "imageId"),
    definition: parsePatternDefinition(value.definition)
  };
  if (value.variants !== void 0) {
    if (!Array.isArray(value.variants) || value.variants.length === 0) {
      throw new TypeError("variants must be a non-empty array");
    }
    metadata.variants = value.variants.map((variant, index) => {
      if (!isRecord(variant)) {
        throw new TypeError(`variants[${index}] must be an object`);
      }
      return {
        zoom: finiteNumber(variant, "zoom"),
        imageId: nonEmptyString(variant, "imageId"),
        definition: parsePatternDefinition(variant.definition)
      };
    });
    for (let index = 1; index < metadata.variants.length; index++) {
      if (metadata.variants[index].zoom <= metadata.variants[index - 1].zoom) {
        throw new RangeError("variant zoom levels must be strictly increasing");
      }
    }
  }
  return metadata;
}
function serializePatternDefinition(definition) {
  return JSON.stringify(parsePatternDefinition(definition));
}
function patternDefinitionId(definition, prefix = "mpf") {
  const serialized = serializePatternDefinition(definition);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index++) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
function createSvgPatternDefinition(options) {
  const distribution = options.distribution ?? (options.stagger === false ? "regular" : "offset");
  return parsePatternDefinition({
    kind: "svg",
    svg: options.svg,
    tileSize: options.tileSize ?? 288,
    stampSize: options.stampSize ?? 28,
    density: options.density ?? 1.4,
    seed: options.seed ?? 1,
    rotationJitterDeg: options.rotationJitterDeg ?? 0,
    scaleJitter: options.scaleJitter ?? 0,
    positionJitter: options.positionJitter ?? 0.15,
    stagger: distribution === "offset",
    distribution,
    minSpacing: options.minSpacing ?? 0
  });
}

// src/maplibre/syncPatternTexture.ts
var installedPatterns = /* @__PURE__ */ new WeakMap();
function resolvePixelRatio(value) {
  const displayRatio = typeof globalThis.devicePixelRatio === "number" ? globalThis.devicePixelRatio : 1;
  const ratio = value ?? Math.min(Math.max(displayRatio, 1), 2);
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new RangeError("pixelRatio must be a finite number greater than 0");
  }
  return ratio;
}
function syncPatternTexture(map, options) {
  const { imageId, pattern, size, color, weight, angle } = options;
  if (pattern === "solid") return;
  const pixelRatio = resolvePixelRatio(options.pixelRatio);
  let byImage = installedPatterns.get(map);
  if (!byImage) {
    byImage = /* @__PURE__ */ new Map();
    installedPatterns.set(map, byImage);
  }
  const signature = JSON.stringify({ pattern, size, color, weight, angle, pixelRatio });
  const previous = byImage.get(imageId);
  if (map.hasImage(imageId) && previous?.signature === signature) return;
  const tile = makeTile(pattern, size, color, weight, angle, { pixelRatio });
  if (map.hasImage(imageId) && previous?.width === tile.width && previous.height === tile.height && previous.pixelRatio === pixelRatio) {
    map.updateImage(imageId, tile);
  } else {
    if (map.hasImage(imageId)) map.removeImage(imageId);
    map.addImage(imageId, tile, { pixelRatio });
  }
  byImage.set(imageId, {
    signature,
    width: tile.width,
    height: tile.height,
    pixelRatio
  });
  map.triggerRepaint();
}

// src/maplibre/buildStyleFragment.ts
function buildStyleFragment(options) {
  const { source, sourceLayer, sourceUrl, bg, pattern, line } = options;
  const layers = [];
  if (bg?.enabled) {
    layers.push({
      id: `${source}__bg`,
      type: "fill",
      source,
      "source-layer": sourceLayer,
      paint: { "fill-color": bg.color, "fill-opacity": bg.opacity }
    });
  }
  if (pattern.pattern === "solid") {
    layers.push({
      id: `${source}__pat`,
      type: "fill",
      source,
      "source-layer": sourceLayer,
      paint: { "fill-color": pattern.color, "fill-opacity": pattern.opacity }
    });
  } else {
    const definition = {
      kind: "geometric",
      pattern: pattern.pattern,
      size: pattern.tile,
      color: pattern.color,
      weight: pattern.weight,
      angle: pattern.angle
    };
    const imageId = patternDefinitionId(definition);
    layers.push({
      id: `${source}__pat`,
      type: "fill",
      source,
      "source-layer": sourceLayer,
      paint: { "fill-pattern": imageId, "fill-opacity": pattern.opacity },
      metadata: {
        [PATTERN_METADATA_KEY]: { imageId, definition }
      }
    });
  }
  if (line?.enabled) {
    layers.push({
      id: `${source}__line`,
      type: "line",
      source,
      "source-layer": sourceLayer,
      paint: {
        "line-color": line.color,
        "line-width": line.width,
        ...line.dash.length ? { "line-dasharray": line.dash } : {}
      }
    });
  }
  return {
    sources: { [source]: { type: "vector", url: sourceUrl ?? `<url>/${source}` } },
    layers
  };
}

// src/maplibre/svgPattern.ts
function resolvePixelRatio2(value, useDisplayRatio) {
  const displayRatio = useDisplayRatio && typeof globalThis.devicePixelRatio === "number" ? globalThis.devicePixelRatio : 1;
  const ratio = value ?? Math.min(Math.max(displayRatio, 1), 2);
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new RangeError("pixelRatio must be a finite number greater than 0");
  }
  return ratio;
}
async function createSvgScatterTile(options) {
  const definition = createSvgPatternDefinition(options);
  const pixelRatio = resolvePixelRatio2(options.pixelRatio, false);
  const {
    svg,
    tileSize,
    stampSize,
    density,
    seed,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger,
    distribution,
    minSpacing
  } = definition;
  const image = await loadSvgImage(svg);
  const canvas = document.createElement("canvas");
  const physicalTileSize = Math.max(1, Math.round(tileSize * pixelRatio));
  const renderScale = physicalTileSize / tileSize;
  canvas.width = canvas.height = physicalTileSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  ctx.clearRect(0, 0, physicalTileSize, physicalTileSize);
  ctx.scale(renderScale, renderScale);
  const placements = createSvgScatterLayout({
    tileSize,
    stampSize,
    density,
    seed,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger,
    distribution,
    minSpacing
  });
  for (const placement of placements) {
    ctx.save();
    ctx.translate(placement.x, placement.y);
    ctx.rotate(placement.rotationRad);
    ctx.scale(placement.scale, placement.scale);
    ctx.drawImage(image, -stampSize / 2, -stampSize / 2, stampSize, stampSize);
    ctx.restore();
  }
  const imageData = ctx.getImageData(0, 0, physicalTileSize, physicalTileSize);
  return {
    width: physicalTileSize,
    height: physicalTileSize,
    data: new Uint8Array(imageData.data.buffer)
  };
}
var installedSvgPatterns = /* @__PURE__ */ new WeakMap();
var svgPatternGenerations = /* @__PURE__ */ new WeakMap();
async function installSvgPatternFill(map, options) {
  const definition = createSvgPatternDefinition(options);
  const pixelRatio = resolvePixelRatio2(options.pixelRatio, true);
  const signature = `${serializePatternDefinition(definition)}@${pixelRatio}`;
  let installedById = installedSvgPatterns.get(map);
  if (!installedById) {
    installedById = /* @__PURE__ */ new Map();
    installedSvgPatterns.set(map, installedById);
  }
  if (map.hasImage(options.imageId) && installedById.get(options.imageId)?.signature === signature) {
    return;
  }
  let generationsById = svgPatternGenerations.get(map);
  if (!generationsById) {
    generationsById = /* @__PURE__ */ new Map();
    svgPatternGenerations.set(map, generationsById);
  }
  const generation = (generationsById.get(options.imageId) ?? 0) + 1;
  generationsById.set(options.imageId, generation);
  const tile = await createSvgScatterTile({ ...options, pixelRatio });
  if (generationsById.get(options.imageId) !== generation) return;
  const previous = installedById.get(options.imageId);
  if (map.hasImage(options.imageId) && previous?.width === tile.width && previous.height === tile.height && previous.pixelRatio === pixelRatio) {
    map.updateImage(options.imageId, tile);
  } else {
    if (map.hasImage(options.imageId)) map.removeImage(options.imageId);
    map.addImage(options.imageId, tile, { pixelRatio });
  }
  installedById.set(options.imageId, {
    signature,
    width: tile.width,
    height: tile.height,
    pixelRatio
  });
  map.triggerRepaint();
}

// src/maplibre/installPatternFills.ts
function fromLegacyMetadata(value) {
  if (!value || typeof value !== "object") return void 0;
  const legacy = value;
  if (legacy.type === "solid" || typeof legacy.type !== "string" || typeof legacy.tile !== "number" || typeof legacy.color !== "string" || typeof legacy.weight !== "number" || typeof legacy.angle !== "number" || typeof legacy.imageId !== "string") {
    return void 0;
  }
  return {
    imageId: legacy.imageId,
    definition: {
      kind: "geometric",
      pattern: legacy.type,
      size: legacy.tile,
      color: legacy.color,
      weight: legacy.weight,
      angle: legacy.angle
    }
  };
}
async function installPatternFills(map, style) {
  const installed = /* @__PURE__ */ new Map();
  const pending = [];
  for (const layer of style.layers) {
    const metadata = layer.metadata;
    if (!metadata) continue;
    const rawV1 = metadata[PATTERN_METADATA_KEY];
    const registration = rawV1 ? parsePatternMetadata(rawV1) : fromLegacyMetadata(metadata[LEGACY_PATTERN_METADATA_KEY]);
    if (!registration) continue;
    const definitions = [
      { imageId: registration.imageId, definition: registration.definition },
      ...registration.variants ?? []
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
          angle: p.angle
        });
      } else {
        pending.push(installSvgPatternFill(map, { imageId: item.imageId, ...p }));
      }
    }
  }
  await Promise.all(pending);
}

// src/maplibre/observePatternFills.ts
function observePatternFills(map, options = {}) {
  const getStyle = options.getStyle ?? (() => map.getStyle());
  const onError = options.onError ?? ((error) => {
    console.error("maplibre-pattern-fills: failed to restore pattern images", error);
  });
  let disposed = false;
  const refresh = async () => {
    if (disposed) return;
    await installPatternFills(map, getStyle());
  };
  const onStyleLoad = () => {
    void refresh().catch(onError);
  };
  map.on("style.load", onStyleLoad);
  return {
    refresh,
    dispose() {
      if (disposed) return;
      disposed = true;
      map.off("style.load", onStyleLoad);
    }
  };
}
export {
  LEGACY_PATTERN_METADATA_KEY,
  PATTERN_METADATA_KEY,
  buildStyleFragment,
  createSvgPatternDefinition,
  createSvgScatterTile,
  installPatternFills,
  installSvgPatternFill,
  observePatternFills,
  parsePatternDefinition,
  parsePatternMetadata,
  patternDefinitionId,
  serializePatternDefinition,
  syncPatternTexture
};
//# sourceMappingURL=maplibre.js.map
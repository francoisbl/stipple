import {
  createSvgScatterLayout,
  makeTile
} from "./chunk-FXXBZSDE.js";
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
      stagger: value.stagger
    };
  }
  throw new TypeError('pattern definition kind must be "geometric" or "svg"');
}
function parsePatternMetadata(value) {
  if (!isRecord(value)) throw new TypeError("pattern metadata must be an object");
  return {
    imageId: nonEmptyString(value, "imageId"),
    definition: parsePatternDefinition(value.definition)
  };
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
  return parsePatternDefinition({
    kind: "svg",
    svg: options.svg,
    tileSize: options.tileSize ?? 192,
    stampSize: options.stampSize ?? 28,
    density: options.density ?? 1.4,
    seed: options.seed ?? 1,
    rotationJitterDeg: options.rotationJitterDeg ?? 0,
    scaleJitter: options.scaleJitter ?? 0,
    positionJitter: options.positionJitter ?? 0.15,
    stagger: options.stagger ?? true
  });
}

// src/maplibre/syncPatternTexture.ts
var installedPatterns = /* @__PURE__ */ new WeakMap();
function syncPatternTexture(map, options) {
  const { imageId, pattern, size, color, weight, angle } = options;
  if (pattern === "solid") return;
  let byImage = installedPatterns.get(map);
  if (!byImage) {
    byImage = /* @__PURE__ */ new Map();
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
async function createSvgScatterTile(options) {
  const definition = createSvgPatternDefinition(options);
  const {
    svg,
    tileSize,
    stampSize,
    density,
    seed,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger
  } = definition;
  const image = await loadSvgImage(svg);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = tileSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  ctx.clearRect(0, 0, tileSize, tileSize);
  const placements = createSvgScatterLayout({
    tileSize,
    stampSize,
    density,
    seed,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger
  });
  for (const placement of placements) {
    ctx.save();
    ctx.translate(placement.x, placement.y);
    ctx.rotate(placement.rotationRad);
    ctx.scale(placement.scale, placement.scale);
    ctx.drawImage(image, -stampSize / 2, -stampSize / 2, stampSize, stampSize);
    ctx.restore();
  }
  const imageData = ctx.getImageData(0, 0, tileSize, tileSize);
  return { width: tileSize, height: tileSize, data: new Uint8Array(imageData.data.buffer) };
}
var installedSvgPatterns = /* @__PURE__ */ new WeakMap();
var svgPatternGenerations = /* @__PURE__ */ new WeakMap();
async function installSvgPatternFill(map, options) {
  const definition = createSvgPatternDefinition(options);
  const signature = serializePatternDefinition(definition);
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
  const tile = await createSvgScatterTile(options);
  if (generationsById.get(options.imageId) !== generation) return;
  const previous = installedById.get(options.imageId);
  if (map.hasImage(options.imageId) && previous?.width === tile.width && previous.height === tile.height) {
    map.updateImage(options.imageId, tile);
  } else {
    if (map.hasImage(options.imageId)) map.removeImage(options.imageId);
    map.addImage(options.imageId, tile);
  }
  installedById.set(options.imageId, {
    signature,
    width: tile.width,
    height: tile.height
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
        angle: p.angle
      });
    } else {
      pending.push(installSvgPatternFill(map, { imageId: registration.imageId, ...p }));
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
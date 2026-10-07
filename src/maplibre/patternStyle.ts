import {
  parsePattern,
  serializePattern,
  type Pattern,
  type PatternFill,
  type PatternPlacement,
  type PatternPrimitiveFill,
} from "../model/pattern";
import { parsePatternSet, type PatternSet, type PatternSetKey } from "../model/patternSet";
import {
  materializePatternSequence,
  parsePatternSequence,
  type PatternSequence,
} from "../model/patternSequence";
import type { PatternFillFragment, PatternFillLayerTemplate } from "./addPatternFill";

export const CANONICAL_PATTERN_METADATA_KEY = "stipple:patterns:v1" as const;

export interface CanonicalPatternRegistration {
  imageId: string;
  pattern: Pattern;
}

export interface CanonicalPatternMetadataV1 {
  patterns: CanonicalPatternRegistration[];
}

export interface PatternStyleFragment extends PatternFillFragment {
  layers: PatternFillLayerTemplate[];
}

export interface CreatePatternStyleOptions {
  source?: string;
  sourceLayer?: string;
  /** Prefix for generated layer ids. Defaults to source. */
  layerIdPrefix?: string;
}

export interface CreatePatternCollectionStyleOptions extends CreatePatternStyleOptions {
  /** Feature property containing a PatternSet key or zero-based sequence step. */
  property: string;
}

type ImageExpression = string | unknown[];

interface PatternChoice {
  key: PatternSetKey;
  pattern: Pattern;
}

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

function hash(value: string): string {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return (result >>> 0).toString(16).padStart(8, "0");
}

/** Deterministic image id based on the complete normalized Pattern. */
export function patternImageId(value: Pattern, prefix = "stipple"): string {
  const normalizedPrefix = nonEmptyString(prefix, "prefix")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "stipple";
  return `${normalizedPrefix}_${hash(serializePattern(value))}`;
}

function scalePlacement(placement: PatternPlacement, factor: number): PatternPlacement {
  if (placement.kind === "natural") {
    return {
      ...placement,
      tileSize: placement.tileSize * factor,
      minSpacing: placement.minSpacing * factor,
      ...(placement.density === undefined
        ? {}
        : { density: placement.density / (factor * factor) }),
    };
  }
  return {
    ...placement,
    tileSize: placement.tileSize * factor,
    spacing: placement.spacing.mode === "explicit"
      ? {
          mode: "explicit",
          horizontal: placement.spacing.horizontal * factor,
          vertical: placement.spacing.vertical * factor,
        }
      : { mode: "density", value: placement.spacing.value / (factor * factor) },
  };
}

function scalePrimitive(fill: PatternPrimitiveFill, factor: number): PatternPrimitiveFill {
  if (fill.family === "glyph" || fill.family === "svg") {
    return {
      ...fill,
      size: fill.size * factor,
      placement: scalePlacement(fill.placement, factor),
    };
  }
  if (fill.family === "line") {
    return {
      ...fill,
      spacing: fill.spacing * factor,
      strokeWidth: fill.strokeWidth * factor,
      ...(fill.dash
        ? { dash: { length: fill.dash.length * factor, gap: fill.dash.gap * factor } }
        : {}),
      ...(fill.oscillation
        ? {
            oscillation: {
              amplitude: fill.oscillation.amplitude * factor,
              wavelength: fill.oscillation.wavelength * factor,
            },
          }
        : {}),
    };
  }
  return {
    ...fill,
    fontSize: fill.fontSize * factor,
    letterSpacing: fill.letterSpacing * factor,
    placement: {
      ...fill.placement,
      horizontalSpacing: fill.placement.horizontalSpacing * factor,
      verticalSpacing: fill.placement.verticalSpacing * factor,
    },
  };
}

function scaleFill(fill: PatternFill, factor: number): PatternFill {
  if (fill.family === "solid") return fill;
  if (fill.family === "composite") {
    return { ...fill, layers: fill.layers.map((layer) => scalePrimitive(layer, factor)) };
  }
  return scalePrimitive(fill, factor);
}

function patternAtZoom(pattern: Pattern, zoom: number): Pattern {
  if (pattern.scale.mode === "screen") return pattern;
  const factor = 2 ** (zoom - pattern.scale.referenceZoom);
  return parsePattern({
    ...pattern,
    id: `${pattern.id}-z${zoom}`,
    fill: scaleFill(pattern.fill, factor),
    scale: { mode: "screen" },
  });
}

function patternImages(pattern: Pattern): {
  expression: ImageExpression;
  registrations: CanonicalPatternRegistration[];
} {
  if (pattern.fill.family === "solid") return { expression: "", registrations: [] };
  if (pattern.scale.mode === "screen") {
    const imageId = patternImageId(pattern, pattern.id);
    return { expression: imageId, registrations: [{ imageId, pattern }] };
  }

  // Five finite variants keep runtime cost bounded while preserving the
  // intended ground-scale behaviour around the authored reference zoom.
  const firstZoom = Math.max(0, Math.floor(pattern.scale.referenceZoom) - 2);
  const lastZoom = Math.min(22, Math.ceil(pattern.scale.referenceZoom) + 2);
  const registrations: CanonicalPatternRegistration[] = [];
  for (let zoom = firstZoom; zoom <= lastZoom; zoom++) {
    const variant = patternAtZoom(pattern, zoom);
    registrations.push({ imageId: patternImageId(variant, pattern.id), pattern: variant });
  }
  return {
    expression: [
      "step",
      ["zoom"],
      registrations[0].imageId,
      ...registrations.slice(1).flatMap((registration, index) => [
        firstZoom + index + 1,
        registration.imageId,
      ]),
    ],
    registrations,
  };
}

function styleContext(options: CreatePatternStyleOptions): {
  source: string;
  sourceLayer: string;
  prefix: string;
} {
  const source = options.source ?? "<source>";
  const sourceLayer = options.sourceLayer ?? "<source-layer>";
  return {
    source: nonEmptyString(source, "source"),
    sourceLayer: nonEmptyString(sourceLayer, "sourceLayer"),
    prefix: nonEmptyString(options.layerIdPrefix ?? source, "layerIdPrefix"),
  };
}

function layerBase(id: string, type: "fill" | "line", source: string, sourceLayer: string) {
  return { id, type, source, "source-layer": sourceLayer };
}

function metadata(registrations: CanonicalPatternRegistration[]): Record<string, unknown> {
  const unique = new Map<string, CanonicalPatternRegistration>();
  for (const registration of registrations) {
    const previous = unique.get(registration.imageId);
    if (previous && serializePattern(previous.pattern) !== serializePattern(registration.pattern)) {
      throw new Error(`Conflicting canonical patterns use image id "${registration.imageId}"`);
    }
    unique.set(registration.imageId, registration);
  }
  return { [CANONICAL_PATTERN_METADATA_KEY]: { patterns: [...unique.values()] } };
}

/** Validates canonical texture metadata embedded in exported style layers. */
export function parseCanonicalPatternMetadata(value: unknown): CanonicalPatternMetadataV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("canonical pattern metadata must be an object");
  }
  const input = value as Record<string, unknown>;
  if (!Array.isArray(input.patterns) || input.patterns.length === 0) {
    throw new TypeError("canonical pattern metadata.patterns must be a non-empty array");
  }
  const seen = new Map<string, string>();
  const patterns = input.patterns.map((entry, index): CanonicalPatternRegistration => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new TypeError(`canonical pattern metadata.patterns[${index}] must be an object`);
    }
    const record = entry as Record<string, unknown>;
    const imageId = nonEmptyString(record.imageId, `patterns[${index}].imageId`);
    const pattern = parsePattern(record.pattern);
    if (pattern.fill.family === "solid") {
      throw new TypeError(`patterns[${index}] must contain a texture-producing Pattern`);
    }
    const signature = serializePattern(pattern);
    const previous = seen.get(imageId);
    if (previous && previous !== signature) {
      throw new Error(`Conflicting canonical patterns use image id "${imageId}"`);
    }
    seen.set(imageId, signature);
    return { imageId, pattern };
  });
  return { patterns };
}

function singlePatternLayers(
  pattern: Pattern,
  options: CreatePatternStyleOptions,
): PatternStyleFragment {
  const { source, sourceLayer, prefix } = styleContext(options);
  const layers: PatternFillLayerTemplate[] = [];
  if (pattern.background) {
    layers.push({
      ...layerBase(`${prefix}__bg`, "fill", source, sourceLayer),
      paint: {
        "fill-color": pattern.background.color,
        "fill-opacity": pattern.background.opacity,
      },
    });
  }
  if (pattern.fill.family === "solid") {
    layers.push({
      ...layerBase(`${prefix}__solid`, "fill", source, sourceLayer),
      paint: { "fill-color": pattern.fill.color, "fill-opacity": pattern.opacity },
    });
  } else {
    const images = patternImages(pattern);
    layers.push({
      ...layerBase(`${prefix}__pat`, "fill", source, sourceLayer),
      paint: { "fill-pattern": images.expression, "fill-opacity": pattern.opacity },
      metadata: metadata(images.registrations),
    });
  }
  if (pattern.outline) {
    layers.push({
      ...layerBase(`${prefix}__line`, "line", source, sourceLayer),
      paint: {
        "line-color": pattern.outline.color,
        "line-width": pattern.outline.width,
        ...(pattern.outline.dash.length
          ? { "line-dasharray": pattern.outline.dash }
          : {}),
      },
    });
  }
  return { layers };
}

/** Builds source-neutral MapLibre layers for one canonical Pattern. */
export function createPatternStyleFragment(
  value: Pattern,
  options: CreatePatternStyleOptions = {},
): PatternStyleFragment {
  return singlePatternLayers(parsePattern(value), options);
}

function matchExpression(
  property: string,
  choices: PatternChoice[],
  resolve: (pattern: Pattern) => unknown,
  fallback: unknown,
): unknown[] {
  return [
    "match",
    ["get", property],
    ...choices.flatMap(({ key, pattern }) => [key, resolve(pattern)]),
    fallback,
  ];
}

function collectionLayers(
  choices: PatternChoice[],
  options: CreatePatternCollectionStyleOptions,
): PatternStyleFragment {
  const property = nonEmptyString(options.property, "property");
  const { source, sourceLayer, prefix } = styleContext(options);
  const keyType = typeof choices[0].key;
  if (choices.some(({ key }) => typeof key !== keyType)) {
    throw new TypeError("MapLibre match labels must all use the same key type");
  }
  const layers: PatternFillLayerTemplate[] = [];
  if (choices.some(({ pattern }) => pattern.background)) {
    layers.push({
      ...layerBase(`${prefix}__bg`, "fill", source, sourceLayer),
      paint: {
        "fill-color": matchExpression(
          property,
          choices,
          (pattern) => pattern.background?.color ?? "rgba(0,0,0,0)",
          "rgba(0,0,0,0)",
        ),
        "fill-opacity": matchExpression(
          property,
          choices,
          (pattern) => pattern.background?.opacity ?? 0,
          0,
        ),
      },
    });
  }
  if (choices.some(({ pattern }) => pattern.fill.family === "solid")) {
    layers.push({
      ...layerBase(`${prefix}__solid`, "fill", source, sourceLayer),
      paint: {
        "fill-color": matchExpression(
          property,
          choices,
          (pattern) => pattern.fill.family === "solid"
            ? pattern.fill.color
            : "rgba(0,0,0,0)",
          "rgba(0,0,0,0)",
        ),
        "fill-opacity": matchExpression(
          property,
          choices,
          (pattern) => pattern.fill.family === "solid" ? pattern.opacity : 0,
          0,
        ),
      },
    });
  }

  const imageByPattern = new Map<Pattern, ImageExpression>();
  const registrations: CanonicalPatternRegistration[] = [];
  for (const { pattern } of choices) {
    const images = patternImages(pattern);
    imageByPattern.set(pattern, images.expression);
    registrations.push(...images.registrations);
  }
  if (registrations.length > 0) {
    layers.push({
      ...layerBase(`${prefix}__pat`, "fill", source, sourceLayer),
      paint: {
        "fill-pattern": matchExpression(
          property,
          choices,
          (pattern) => imageByPattern.get(pattern) ?? "",
          "",
        ),
        "fill-opacity": matchExpression(
          property,
          choices,
          (pattern) => pattern.fill.family === "solid" ? 0 : pattern.opacity,
          0,
        ),
      },
      metadata: metadata(registrations),
    });
  }
  for (const { key, pattern } of choices) {
    if (!pattern.outline) continue;
    layers.push({
      ...layerBase(`${prefix}__line_${hash(`${typeof key}:${key}`)}`, "line", source, sourceLayer),
      filter: ["==", ["get", property], key],
      paint: {
        "line-color": pattern.outline.color,
        "line-width": pattern.outline.width,
        ...(pattern.outline.dash.length
          ? { "line-dasharray": pattern.outline.dash }
          : {}),
      },
    });
  }
  return { layers };
}

/** Builds category-to-pattern MapLibre layers from a canonical PatternSet. */
export function createPatternSetStyleFragment(
  value: PatternSet,
  options: CreatePatternCollectionStyleOptions,
): PatternStyleFragment {
  const set = parsePatternSet(value);
  return collectionLayers(
    set.entries.map(({ key, pattern }) => ({ key, pattern })),
    options,
  );
}

/** Builds explicit finite step-to-pattern MapLibre layers from a PatternSequence. */
export function createPatternSequenceStyleFragment(
  value: PatternSequence,
  options: CreatePatternCollectionStyleOptions,
): PatternStyleFragment {
  const sequence = parsePatternSequence(value);
  return collectionLayers(
    materializePatternSequence(sequence).map(({ index, pattern }) => ({ key: index, pattern })),
    options,
  );
}

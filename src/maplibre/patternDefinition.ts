import type { PatternType } from "../engine/types";
import type { SvgDistributionMode } from "../engine/svgScatterLayout";

export const PATTERN_METADATA_KEY = "maplibre-pattern-fills:v1" as const;

export type GeometricPatternType = Exclude<PatternType, "solid">;

export interface GeometricPatternDefinition {
  kind: "geometric";
  pattern: GeometricPatternType;
  size: number;
  color: string;
  weight: number;
  angle: number;
  /** Raster pixels per MapLibre layout pixel. Omit for the display ratio. */
  pixelRatio?: number;
  /** Fixed dot count used by ground-scaled stipple variants. */
  stippleCount?: number;
}

export interface SvgPatternDefinition {
  kind: "svg";
  svg: string;
  tileSize: number;
  stampSize: number;
  density: number;
  seed: number | string;
  rotationJitterDeg: number;
  scaleJitter: number;
  positionJitter: number;
  stagger: boolean;
  distribution: SvgDistributionMode;
  minSpacing: number;
}

export interface FontPatternDefinition {
  kind: "font";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: "normal" | "italic";
  letterSpacing: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  rotationDeg: number;
  stagger: boolean;
  color: string;
}

export type PatternDefinition = GeometricPatternDefinition | SvgPatternDefinition | FontPatternDefinition;

export interface PatternVariant {
  zoom: number;
  imageId: string;
  definition: PatternDefinition;
}

export interface PatternMetadataV1 {
  imageId: string;
  definition: PatternDefinition;
  variants?: PatternVariant[];
}

const geometricTypes = new Set<GeometricPatternType>([
  "stipple",
  "hachures",
  "cross",
  "grid",
  "dots",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${key} must be a finite number`);
  }
  return value;
}

function positiveNumber(record: Record<string, unknown>, key: string): number {
  const value = finiteNumber(record, key);
  if (value <= 0) throw new RangeError(`${key} must be greater than 0`);
  return value;
}

function nonNegativeNumber(record: Record<string, unknown>, key: string): number {
  const value = finiteNumber(record, key);
  if (value < 0) throw new RangeError(`${key} must be greater than or equal to 0`);
  return value;
}

function nonEmptyString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${key} must be a non-empty string`);
  }
  return value;
}

/** Validates untrusted JSON metadata and returns a normalized definition. */
export function parsePatternDefinition(value: unknown): PatternDefinition {
  if (!isRecord(value)) throw new TypeError("pattern definition must be an object");

  if (value.kind === "geometric") {
    if (typeof value.pattern !== "string" || !geometricTypes.has(value.pattern as GeometricPatternType)) {
      throw new TypeError("pattern must be a supported non-solid geometric pattern");
    }
    const definition: GeometricPatternDefinition = {
      kind: "geometric",
      pattern: value.pattern as GeometricPatternType,
      size: positiveNumber(value, "size"),
      color: nonEmptyString(value, "color"),
      weight: positiveNumber(value, "weight"),
      angle: finiteNumber(value, "angle"),
    };
    if (value.pixelRatio !== undefined) {
      definition.pixelRatio = positiveNumber(value, "pixelRatio");
    }
    if (value.stippleCount !== undefined) {
      const stippleCount = positiveNumber(value, "stippleCount");
      if (!Number.isInteger(stippleCount)) {
        throw new RangeError("stippleCount must be a positive integer");
      }
      definition.stippleCount = stippleCount;
    }
    return definition;
  }

  if (value.kind === "svg") {
    const scaleJitter = nonNegativeNumber(value, "scaleJitter");
    if (scaleJitter >= 1) throw new RangeError("scaleJitter must be less than 1");
    const seed = value.seed;
    if (
      (typeof seed !== "string" || seed.length === 0) &&
      (typeof seed !== "number" || !Number.isFinite(seed))
    ) {
      throw new TypeError("seed must be a finite number or a non-empty string");
    }
    if (typeof value.stagger !== "boolean") throw new TypeError("stagger must be a boolean");
    const distribution = value.distribution ?? (value.stagger ? "offset" : "regular");
    if (
      distribution !== "regular" &&
      distribution !== "offset" &&
      distribution !== "natural"
    ) {
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
      minSpacing: value.minSpacing === undefined
        ? 0
        : nonNegativeNumber(value, "minSpacing"),
    };
  }

  if (value.kind === "font") {
    const fontStyle = value.fontStyle;
    if (fontStyle !== "normal" && fontStyle !== "italic") {
      throw new TypeError("fontStyle must be normal or italic");
    }
    if (typeof value.stagger !== "boolean") throw new TypeError("stagger must be a boolean");
    return {
      kind: "font",
      text: nonEmptyString(value, "text"),
      fontFamily: nonEmptyString(value, "fontFamily"),
      fontSize: positiveNumber(value, "fontSize"),
      fontWeight: nonEmptyString(value, "fontWeight"),
      fontStyle,
      letterSpacing: finiteNumber(value, "letterSpacing"),
      horizontalSpacing: nonNegativeNumber(value, "horizontalSpacing"),
      verticalSpacing: nonNegativeNumber(value, "verticalSpacing"),
      rotationDeg: finiteNumber(value, "rotationDeg"),
      stagger: value.stagger,
      color: nonEmptyString(value, "color"),
    };
  }

  throw new TypeError('pattern definition kind must be "geometric", "svg", or "font"');
}

/** Parses a complete v1 metadata payload from a style layer. */
export function parsePatternMetadata(value: unknown): PatternMetadataV1 {
  if (!isRecord(value)) throw new TypeError("pattern metadata must be an object");
  const metadata: PatternMetadataV1 = {
    imageId: nonEmptyString(value, "imageId"),
    definition: parsePatternDefinition(value.definition),
  };
  if (value.variants !== undefined) {
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
        definition: parsePatternDefinition(variant.definition),
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

/** Stable JSON representation used for image IDs and cache keys. */
export function serializePatternDefinition(definition: PatternDefinition): string {
  return JSON.stringify(parsePatternDefinition(definition));
}

/** Small deterministic FNV-1a identifier suitable for MapLibre image names. */
export function patternDefinitionId(definition: PatternDefinition, prefix = "mpf"): string {
  const serialized = serializePatternDefinition(definition);
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index++) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${prefix}_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function createSvgPatternDefinition(options: {
  svg: string;
  tileSize?: number;
  stampSize?: number;
  density?: number;
  seed?: number | string;
  rotationJitterDeg?: number;
  scaleJitter?: number;
  positionJitter?: number;
  stagger?: boolean;
  distribution?: SvgDistributionMode;
  minSpacing?: number;
}): SvgPatternDefinition {
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
    minSpacing: options.minSpacing ?? 0,
  }) as SvgPatternDefinition;
}

export function createFontPatternDefinition(options: {
  text: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: "normal" | "italic";
  letterSpacing?: number;
  horizontalSpacing?: number;
  verticalSpacing?: number;
  rotationDeg?: number;
  stagger?: boolean;
  color?: string;
}): FontPatternDefinition {
  return parsePatternDefinition({
    kind: "font",
    text: options.text,
    fontFamily: options.fontFamily ?? "sans-serif",
    fontSize: options.fontSize ?? 18,
    fontWeight: options.fontWeight ?? "500",
    fontStyle: options.fontStyle ?? "normal",
    letterSpacing: options.letterSpacing ?? 0,
    horizontalSpacing: options.horizontalSpacing ?? 26,
    verticalSpacing: options.verticalSpacing ?? 22,
    rotationDeg: options.rotationDeg ?? 0,
    stagger: options.stagger ?? true,
    color: options.color ?? "#000000",
  }) as FontPatternDefinition;
}

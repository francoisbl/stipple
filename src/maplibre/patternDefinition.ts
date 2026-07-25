import type { PatternType } from "../engine/types";
import type { SvgDistributionMode } from "../engine/svgScatterLayout";

export const PATTERN_METADATA_KEY = "maplibre-pattern-fills:v1" as const;
export const LEGACY_PATTERN_METADATA_KEY = "enhanced:pattern" as const;

export type GeometricPatternType = Exclude<PatternType, "solid">;

export interface GeometricPatternDefinition {
  kind: "geometric";
  pattern: GeometricPatternType;
  size: number;
  color: string;
  weight: number;
  angle: number;
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

export type PatternDefinition = GeometricPatternDefinition | SvgPatternDefinition;

export interface PatternMetadataV1 {
  imageId: string;
  definition: PatternDefinition;
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
    return {
      kind: "geometric",
      pattern: value.pattern as GeometricPatternType,
      size: positiveNumber(value, "size"),
      color: nonEmptyString(value, "color"),
      weight: positiveNumber(value, "weight"),
      angle: finiteNumber(value, "angle"),
    };
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

  throw new TypeError('pattern definition kind must be "geometric" or "svg"');
}

/** Parses a complete v1 metadata payload from a style layer. */
export function parsePatternMetadata(value: unknown): PatternMetadataV1 {
  if (!isRecord(value)) throw new TypeError("pattern metadata must be an object");
  return {
    imageId: nonEmptyString(value, "imageId"),
    definition: parsePatternDefinition(value.definition),
  };
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

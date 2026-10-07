export const PATTERN_VERSION = 1 as const;

export type PatternScale =
  | { mode: "screen" }
  | { mode: "map"; referenceZoom: number };

export interface PatternRenderOptions {
  pixelRatio: "auto" | number;
}

export interface PatternBackground {
  color: string;
  opacity: number;
}

export interface PatternOutline {
  color: string;
  width: number;
  dash: number[];
}

export interface ExplicitLatticeSpacing {
  mode: "explicit";
  horizontal: number;
  vertical: number;
}

export interface DensityLatticeSpacing {
  mode: "density";
  /** Approximate marks per 100 x 100 layout-pixel area. */
  value: number;
}

export type LatticeSpacing = ExplicitLatticeSpacing | DensityLatticeSpacing;

export interface LatticePlacement {
  kind: "lattice";
  tileSize: number;
  spacing: LatticeSpacing;
  /** Alternate-row horizontal offset as a fraction of one cell. */
  rowOffset: number;
  /** Alternate-column vertical offset as a fraction of one cell. */
  columnOffset: number;
  gridAngle: number;
  positionJitter: number;
  rotationJitter: number;
  scaleJitter: number;
  seed: number | string;
}

export interface NaturalPlacement {
  kind: "natural";
  tileSize: number;
  density?: number;
  count?: number;
  minSpacing: number;
  positionJitter: number;
  rotationJitter: number;
  scaleJitter: number;
  seed: number | string;
}

export type PatternPlacement = LatticePlacement | NaturalPlacement;

export interface SolidFill {
  family: "solid";
  color: string;
}

export type GlyphShape =
  | "circle"
  | "square"
  | "diamond"
  | "plus"
  | "x"
  | "triangle"
  | "chevron";

export interface GlyphFill {
  family: "glyph";
  glyph: GlyphShape;
  color: string;
  size: number;
  rotation: number;
  opacity: number;
  placement: PatternPlacement;
}

export type LineShape = "straight" | "dashed" | "zigzag" | "wave";

export interface LineFill {
  family: "line";
  shape: LineShape;
  color: string;
  angle: number;
  spacing: number;
  strokeWidth: number;
  opacity: number;
  dash?: { length: number; gap: number };
  oscillation?: { amplitude: number; wavelength: number };
}

export interface TextLatticePlacement {
  kind: "text-lattice";
  horizontalSpacing: number;
  verticalSpacing: number;
  rowOffset: number;
}

export interface TextFill {
  family: "text";
  text: string;
  color: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: "normal" | "italic";
  letterSpacing: number;
  rotation: number;
  opacity: number;
  placement: TextLatticePlacement;
}

export interface SvgFill {
  family: "svg";
  svg: string;
  size: number;
  rotation: number;
  opacity: number;
  placement: PatternPlacement;
}

export type PatternPrimitiveFill = GlyphFill | LineFill | TextFill | SvgFill;

/**
 * Low-level composition primitive used by renderers and programmatic APIs.
 * The initial playground deliberately exposes curated fills such as grid and
 * crosshatch rather than an arbitrary layer composer.
 */
export interface CompositeFill {
  family: "composite";
  /** Semantic role for curated composites; custom remains programmatic-only. */
  composition: "custom" | "crosshatch" | "grid";
  layers: PatternPrimitiveFill[];
}

export type PatternFill = SolidFill | PatternPrimitiveFill | CompositeFill;

/** Canonical, serializable Stipple design object. */
export interface Pattern {
  version: typeof PATTERN_VERSION;
  kind: "pattern";
  id: string;
  name?: string;
  fill: PatternFill;
  opacity: number;
  background?: PatternBackground;
  outline?: PatternOutline;
  scale: PatternScale;
  render: PatternRenderOptions;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(`${name} must be an object`);
  return value;
}

function keys(value: Record<string, unknown>, allowed: readonly string[], name: string): void {
  const allowedSet = new Set(allowed);
  const unexpected = Object.keys(value).find((key) => !allowedSet.has(key));
  if (unexpected) throw new TypeError(`${name}.${unexpected} is not supported`);
}

function finite(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  return value;
}

function positive(value: unknown, name: string): number {
  const parsed = finite(value, name);
  if (parsed <= 0) throw new RangeError(`${name} must be greater than 0`);
  return parsed;
}

function nonNegative(value: unknown, name: string): number {
  const parsed = finite(value, name);
  if (parsed < 0) throw new RangeError(`${name} must be greater than or equal to 0`);
  return parsed;
}

function opacity(value: unknown, name: string): number {
  const parsed = finite(value, name);
  if (parsed < 0 || parsed > 1) throw new RangeError(`${name} must be between 0 and 1`);
  return parsed;
}

function offset(value: unknown, name: string): number {
  const parsed = finite(value, name);
  if (parsed < 0 || parsed >= 1) throw new RangeError(`${name} must be at least 0 and less than 1`);
  return parsed;
}

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

function seed(value: unknown, name: string): number | string {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.length > 0) return value;
  throw new TypeError(`${name} must be a finite number or a non-empty string`);
}

function parseLatticeSpacing(value: unknown): LatticeSpacing {
  const input = record(value, "fill.placement.spacing");
  if (input.mode === "explicit") {
    keys(input, ["mode", "horizontal", "vertical"], "fill.placement.spacing");
    return {
      mode: "explicit",
      horizontal: positive(input.horizontal, "fill.placement.spacing.horizontal"),
      vertical: positive(input.vertical, "fill.placement.spacing.vertical"),
    };
  }
  if (input.mode === "density") {
    keys(input, ["mode", "value"], "fill.placement.spacing");
    return {
      mode: "density",
      value: positive(input.value, "fill.placement.spacing.value"),
    };
  }
  throw new TypeError('fill.placement.spacing.mode must be "explicit" or "density"');
}

function parsePlacement(value: unknown): PatternPlacement {
  const input = record(value, "fill.placement");
  if (input.kind === "lattice") {
    keys(input, [
      "kind", "tileSize", "spacing", "rowOffset", "columnOffset", "gridAngle",
      "positionJitter", "rotationJitter", "scaleJitter", "seed",
    ], "fill.placement");
    const scaleJitter = nonNegative(input.scaleJitter ?? 0, "fill.placement.scaleJitter");
    if (scaleJitter >= 1) throw new RangeError("fill.placement.scaleJitter must be less than 1");
    return {
      kind: "lattice",
      tileSize: positive(input.tileSize, "fill.placement.tileSize"),
      spacing: parseLatticeSpacing(input.spacing),
      rowOffset: offset(input.rowOffset ?? 0, "fill.placement.rowOffset"),
      columnOffset: offset(input.columnOffset ?? 0, "fill.placement.columnOffset"),
      gridAngle: finite(input.gridAngle ?? 0, "fill.placement.gridAngle"),
      positionJitter: nonNegative(input.positionJitter ?? 0, "fill.placement.positionJitter"),
      rotationJitter: nonNegative(input.rotationJitter ?? 0, "fill.placement.rotationJitter"),
      scaleJitter,
      seed: seed(input.seed ?? 1, "fill.placement.seed"),
    };
  }
  if (input.kind === "natural") {
    keys(input, [
      "kind", "tileSize", "density", "count", "minSpacing", "positionJitter",
      "rotationJitter", "scaleJitter", "seed",
    ], "fill.placement");
    if ((input.density === undefined) === (input.count === undefined)) {
      throw new TypeError("fill.placement must specify exactly one of density or count");
    }
    const scaleJitter = nonNegative(input.scaleJitter ?? 0, "fill.placement.scaleJitter");
    if (scaleJitter >= 1) throw new RangeError("fill.placement.scaleJitter must be less than 1");
    const parsed: NaturalPlacement = {
      kind: "natural",
      tileSize: positive(input.tileSize, "fill.placement.tileSize"),
      minSpacing: nonNegative(input.minSpacing ?? 0, "fill.placement.minSpacing"),
      positionJitter: nonNegative(input.positionJitter ?? 0, "fill.placement.positionJitter"),
      rotationJitter: nonNegative(input.rotationJitter ?? 0, "fill.placement.rotationJitter"),
      scaleJitter,
      seed: seed(input.seed ?? 1, "fill.placement.seed"),
    };
    if (input.density !== undefined) {
      parsed.density = positive(input.density, "fill.placement.density");
    } else {
      const count = positive(input.count, "fill.placement.count");
      if (!Number.isInteger(count)) throw new RangeError("fill.placement.count must be a positive integer");
      parsed.count = count;
    }
    return parsed;
  }
  throw new TypeError('fill.placement.kind must be "lattice" or "natural"');
}

function parseGlyphFill(input: Record<string, unknown>): GlyphFill {
  keys(input, ["family", "glyph", "color", "size", "rotation", "opacity", "placement"], "fill");
  const glyphs: GlyphShape[] = ["circle", "square", "diamond", "plus", "x", "triangle", "chevron"];
  if (typeof input.glyph !== "string" || !glyphs.includes(input.glyph as GlyphShape)) {
    throw new TypeError("fill.glyph must be a supported glyph");
  }
  return {
    family: "glyph",
    glyph: input.glyph as GlyphShape,
    color: nonEmptyString(input.color, "fill.color"),
    size: positive(input.size, "fill.size"),
    rotation: finite(input.rotation ?? 0, "fill.rotation"),
    opacity: opacity(input.opacity ?? 1, "fill.opacity"),
    placement: parsePlacement(input.placement),
  };
}

function parseLineFill(input: Record<string, unknown>): LineFill {
  keys(input, [
    "family", "shape", "color", "angle", "spacing", "strokeWidth", "opacity",
    "dash", "oscillation",
  ], "fill");
  const shapes: LineShape[] = ["straight", "dashed", "zigzag", "wave"];
  if (typeof input.shape !== "string" || !shapes.includes(input.shape as LineShape)) {
    throw new TypeError("fill.shape must be a supported line shape");
  }
  const parsed: LineFill = {
    family: "line",
    shape: input.shape as LineShape,
    color: nonEmptyString(input.color, "fill.color"),
    angle: finite(input.angle, "fill.angle"),
    spacing: positive(input.spacing, "fill.spacing"),
    strokeWidth: positive(input.strokeWidth, "fill.strokeWidth"),
    opacity: opacity(input.opacity ?? 1, "fill.opacity"),
  };
  if (input.dash !== undefined) {
    const dash = record(input.dash, "fill.dash");
    keys(dash, ["length", "gap"], "fill.dash");
    parsed.dash = {
      length: positive(dash.length, "fill.dash.length"),
      gap: positive(dash.gap, "fill.dash.gap"),
    };
  }
  if (input.oscillation !== undefined) {
    const oscillation = record(input.oscillation, "fill.oscillation");
    keys(oscillation, ["amplitude", "wavelength"], "fill.oscillation");
    parsed.oscillation = {
      amplitude: positive(oscillation.amplitude, "fill.oscillation.amplitude"),
      wavelength: positive(oscillation.wavelength, "fill.oscillation.wavelength"),
    };
  }
  if (parsed.shape === "dashed" && !parsed.dash) {
    throw new TypeError("fill.dash is required for dashed lines");
  }
  if ((parsed.shape === "zigzag" || parsed.shape === "wave") && !parsed.oscillation) {
    throw new TypeError(`fill.oscillation is required for ${parsed.shape} lines`);
  }
  return parsed;
}

function parseTextFill(input: Record<string, unknown>): TextFill {
  keys(input, [
    "family", "text", "color", "fontFamily", "fontSize", "fontWeight", "fontStyle",
    "letterSpacing", "rotation", "opacity", "placement",
  ], "fill");
  if (input.fontStyle !== "normal" && input.fontStyle !== "italic") {
    throw new TypeError("fill.fontStyle must be normal or italic");
  }
  const placement = record(input.placement, "fill.placement");
  keys(placement, ["kind", "horizontalSpacing", "verticalSpacing", "rowOffset"], "fill.placement");
  if (placement.kind !== "text-lattice") {
    throw new TypeError('fill.placement.kind must be "text-lattice" for text fills');
  }
  return {
    family: "text",
    text: nonEmptyString(input.text, "fill.text"),
    color: nonEmptyString(input.color, "fill.color"),
    fontFamily: nonEmptyString(input.fontFamily, "fill.fontFamily"),
    fontSize: positive(input.fontSize, "fill.fontSize"),
    fontWeight: nonEmptyString(input.fontWeight, "fill.fontWeight"),
    fontStyle: input.fontStyle,
    letterSpacing: finite(input.letterSpacing, "fill.letterSpacing"),
    rotation: finite(input.rotation ?? 0, "fill.rotation"),
    opacity: opacity(input.opacity ?? 1, "fill.opacity"),
    placement: {
      kind: "text-lattice",
      horizontalSpacing: nonNegative(placement.horizontalSpacing, "fill.placement.horizontalSpacing"),
      verticalSpacing: nonNegative(placement.verticalSpacing, "fill.placement.verticalSpacing"),
      rowOffset: offset(placement.rowOffset ?? 0, "fill.placement.rowOffset"),
    },
  };
}

function parseSvgFill(input: Record<string, unknown>): SvgFill {
  keys(input, ["family", "svg", "size", "rotation", "opacity", "placement"], "fill");
  return {
    family: "svg",
    svg: nonEmptyString(input.svg, "fill.svg"),
    size: positive(input.size, "fill.size"),
    rotation: finite(input.rotation ?? 0, "fill.rotation"),
    opacity: opacity(input.opacity ?? 1, "fill.opacity"),
    placement: parsePlacement(input.placement),
  };
}

function parsePrimitiveFill(value: unknown): PatternPrimitiveFill {
  const input = record(value, "fill");
  if (input.family === "glyph") return parseGlyphFill(input);
  if (input.family === "line") return parseLineFill(input);
  if (input.family === "text") return parseTextFill(input);
  if (input.family === "svg") return parseSvgFill(input);
  throw new TypeError("composite fill layers must be glyph, line, text, or svg fills");
}

function parseFill(value: unknown): PatternFill {
  const input = record(value, "fill");
  if (input.family === "solid") {
    keys(input, ["family", "color"], "fill");
    return { family: "solid", color: nonEmptyString(input.color, "fill.color") };
  }
  if (input.family === "composite") {
    keys(input, ["family", "composition", "layers"], "fill");
    if (!Array.isArray(input.layers) || input.layers.length === 0) {
      throw new TypeError("fill.layers must be a non-empty array");
    }
    const composition = input.composition ?? "custom";
    if (composition !== "custom" && composition !== "crosshatch" && composition !== "grid") {
      throw new TypeError("fill.composition must be custom, crosshatch, or grid");
    }
    return {
      family: "composite",
      composition,
      layers: input.layers.map(parsePrimitiveFill),
    };
  }
  return parsePrimitiveFill(input);
}

function parseScale(value: unknown): PatternScale {
  const input = record(value, "scale");
  if (input.mode === "screen") {
    keys(input, ["mode"], "scale");
    return { mode: "screen" };
  }
  if (input.mode === "map") {
    keys(input, ["mode", "referenceZoom"], "scale");
    return { mode: "map", referenceZoom: finite(input.referenceZoom, "scale.referenceZoom") };
  }
  throw new TypeError('scale.mode must be "screen" or "map"');
}

/** Validates untrusted input and returns a normalized canonical Pattern. */
export function parsePattern(value: unknown): Pattern {
  const input = record(value, "pattern");
  keys(input, [
    "version", "kind", "id", "name", "fill", "opacity", "background", "outline",
    "scale", "render",
  ], "pattern");
  if (input.version !== PATTERN_VERSION) {
    throw new TypeError(`pattern.version must be ${PATTERN_VERSION}`);
  }
  if (input.kind !== "pattern") throw new TypeError('pattern.kind must be "pattern"');

  const parsed: Pattern = {
    version: PATTERN_VERSION,
    kind: "pattern",
    id: nonEmptyString(input.id, "pattern.id"),
    ...(input.name === undefined ? {} : { name: nonEmptyString(input.name, "pattern.name") }),
    fill: parseFill(input.fill),
    opacity: opacity(input.opacity ?? 1, "pattern.opacity"),
    scale: input.scale === undefined ? { mode: "screen" } : parseScale(input.scale),
    render: { pixelRatio: "auto" },
  };

  if (input.background !== undefined) {
    const background = record(input.background, "pattern.background");
    keys(background, ["color", "opacity"], "pattern.background");
    parsed.background = {
      color: nonEmptyString(background.color, "pattern.background.color"),
      opacity: opacity(background.opacity, "pattern.background.opacity"),
    };
  }
  if (input.outline !== undefined) {
    const outline = record(input.outline, "pattern.outline");
    keys(outline, ["color", "width", "dash"], "pattern.outline");
    if (outline.dash !== undefined && !Array.isArray(outline.dash)) {
      throw new TypeError("pattern.outline.dash must be an array");
    }
    parsed.outline = {
      color: nonEmptyString(outline.color, "pattern.outline.color"),
      width: positive(outline.width, "pattern.outline.width"),
      dash: (outline.dash ?? []).map((entry, index) =>
        nonNegative(entry, `pattern.outline.dash[${index}]`)),
    };
  }
  if (input.render !== undefined) {
    const render = record(input.render, "pattern.render");
    keys(render, ["pixelRatio"], "pattern.render");
    parsed.render = {
      pixelRatio: render.pixelRatio === "auto"
        ? "auto"
        : positive(render.pixelRatio, "pattern.render.pixelRatio"),
    };
  }
  return parsed;
}

/** Stable JSON representation of a normalized canonical Pattern. */
export function serializePattern(pattern: Pattern): string {
  return JSON.stringify(parsePattern(pattern));
}

import {
  parsePattern,
  type Pattern,
  type PatternFill,
  type PatternPrimitiveFill,
} from "./pattern";

export const PATTERN_SEQUENCE_VERSION = 1 as const;

export type PatternSequenceParameter = "spacing" | "size" | "strokeWidth" | "opacity";

/** Mathematical progression used between the explicit endpoints. */
export type PatternSequenceProgression = "linear" | "geometric";

/**
 * Intended perceptual reading of the ordered classes. This is deliberately
 * distinct from numeric direction: lower spacing produces greater visual
 * weight, while size, stroke width, and opacity normally increase it.
 */
export type PatternSequenceVisualOrder = "low-to-high" | "high-to-low";

export interface PatternSequenceVariation {
  parameter: PatternSequenceParameter;
  start: number;
  end: number;
  /** Defaults to linear when omitted by an older saved design. */
  progression?: PatternSequenceProgression;
  /** Optional for compatibility; new graduated designs should declare it. */
  visualOrder?: PatternSequenceVisualOrder;
}

export interface PatternSequenceOverride {
  /** Zero-based derived step index. */
  step: number;
  /** Replaces the interpolated value for this step. */
  value: number;
}

/**
 * A finite ordered family. Derived items are intentionally absent: base,
 * variation, and sparse per-step overrides are the only persisted state.
 */
export interface PatternSequence {
  version: typeof PATTERN_SEQUENCE_VERSION;
  kind: "pattern-sequence";
  id: string;
  name?: string;
  base: Pattern;
  steps: number;
  variation: PatternSequenceVariation;
  overrides: PatternSequenceOverride[];
}

export interface MaterializedPatternStep {
  index: number;
  value: number;
  pattern: Pattern;
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function keys(value: Record<string, unknown>, allowed: readonly string[], name: string): void {
  const allowedSet = new Set(allowed);
  const unexpected = Object.keys(value).find((key) => !allowedSet.has(key));
  if (unexpected) throw new TypeError(`${name}.${unexpected} is not supported`);
}

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

function finite(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  return value;
}

function integer(value: unknown, name: string): number {
  const parsed = finite(value, name);
  if (!Number.isInteger(parsed)) throw new RangeError(`${name} must be an integer`);
  return parsed;
}

function clonePattern(pattern: Pattern): Pattern {
  return JSON.parse(JSON.stringify(pattern)) as Pattern;
}

function applySpacing(fill: PatternPrimitiveFill, value: number): boolean {
  if (fill.family === "line") {
    fill.spacing = value;
    return true;
  }
  if (fill.family === "text") {
    fill.placement.horizontalSpacing = value;
    fill.placement.verticalSpacing = value;
    return true;
  }
  if (fill.family === "glyph" || fill.family === "svg") {
    const placement = fill.placement;
    if (placement.kind === "natural") {
      placement.density = 10_000 / (value * value);
      delete placement.count;
    } else {
      placement.spacing = { mode: "explicit", horizontal: value, vertical: value };
    }
    return true;
  }
  return false;
}

function applySize(fill: PatternPrimitiveFill, value: number): boolean {
  if (fill.family === "glyph" || fill.family === "svg") {
    fill.size = value;
    return true;
  }
  if (fill.family === "text") {
    fill.fontSize = value;
    return true;
  }
  return false;
}

function applyStrokeWidth(fill: PatternPrimitiveFill, value: number): boolean {
  if (fill.family !== "line") return false;
  fill.strokeWidth = value;
  return true;
}

function applyToFill(
  fill: PatternFill,
  parameter: Exclude<PatternSequenceParameter, "opacity">,
  value: number,
): boolean {
  if (fill.family === "solid") return false;
  const apply = parameter === "spacing"
    ? applySpacing
    : parameter === "size"
      ? applySize
      : applyStrokeWidth;
  if (fill.family !== "composite") return apply(fill, value);
  let changed = false;
  for (const layer of fill.layers) changed = apply(layer, value) || changed;
  return changed;
}

function derivePattern(
  sequence: PatternSequence,
  index: number,
  value: number,
): Pattern {
  const pattern = clonePattern(sequence.base);
  pattern.id = `${sequence.base.id}-step-${index + 1}`;
  pattern.name = `${sequence.base.name ?? sequence.base.id} ${index + 1}`;
  if (sequence.variation.parameter === "opacity") {
    pattern.opacity = value;
  } else if (!applyToFill(pattern.fill, sequence.variation.parameter, value)) {
    throw new TypeError(
      `${sequence.variation.parameter} cannot vary for ${pattern.fill.family} fills`,
    );
  }
  return parsePattern(pattern);
}

function materializeNormalized(sequence: PatternSequence): MaterializedPatternStep[] {
  const overrideValues = new Map(sequence.overrides.map(({ step, value }) => [step, value]));
  const materialized = Array.from({ length: sequence.steps }, (_, index) => {
    const progress = sequenceProgress(index, sequence.steps, sequence.variation.progression);
    const interpolated = interpolateSequenceValue(
      sequence.variation.start,
      sequence.variation.end,
      progress,
      sequence.variation.progression,
    );
    const value = overrideValues.get(index) ?? interpolated;
    return { index, value, pattern: derivePattern(sequence, index, value) };
  });
  if (sequence.variation.visualOrder) {
    const visualWeights = materialized.map(({ value }) =>
      sequence.variation.parameter === "spacing" ? -value : value);
    const direction = sequence.variation.visualOrder === "low-to-high" ? 1 : -1;
    if (visualWeights.some((weight, index) =>
      index > 0 && (weight - visualWeights[index - 1]) * direction < 0)) {
      throw new RangeError("patternSequence overrides must preserve variation.visualOrder");
    }
  }
  return materialized;
}

/** Normalized position used by every deterministic sequence progression. */
export function sequenceProgress(
  index: number,
  steps: number,
  progression: PatternSequenceProgression = "linear",
): number {
  if (progression !== "linear" && progression !== "geometric") {
    throw new TypeError(`Unsupported sequence progression: ${progression}`);
  }
  return index / (steps - 1);
}

/** Interpolates explicit endpoints using the selected deterministic progression. */
export function interpolateSequenceValue(
  start: number,
  end: number,
  progress: number,
  progression: PatternSequenceProgression = "linear",
): number {
  if (progression === "linear") return start + (end - start) * progress;
  if (progression !== "geometric") {
    throw new TypeError(`Unsupported sequence progression: ${progression}`);
  }
  if (start <= 0 || end <= 0) {
    throw new RangeError("geometric sequence progression requires positive endpoints");
  }
  return start * (end / start) ** progress;
}

function validateVisualOrder(variation: PatternSequenceVariation): void {
  if (!variation.visualOrder || variation.start === variation.end) return;
  const numericIncrease = variation.end > variation.start;
  const weightIncrease = variation.parameter === "spacing" ? !numericIncrease : numericIncrease;
  const expectedIncrease = variation.visualOrder === "low-to-high";
  if (weightIncrease !== expectedIncrease) {
    const direction = variation.parameter === "spacing" ? "decrease" : "increase";
    throw new RangeError(
      `patternSequence.variation ${variation.visualOrder} requires ${variation.parameter} to ${direction}`,
    );
  }
}

/** Validates untrusted input and normalizes its base Pattern and overrides. */
export function parsePatternSequence(value: unknown): PatternSequence {
  const input = record(value, "patternSequence");
  keys(
    input,
    ["version", "kind", "id", "name", "base", "steps", "variation", "overrides"],
    "patternSequence",
  );
  if (input.version !== PATTERN_SEQUENCE_VERSION) {
    throw new TypeError(`patternSequence.version must be ${PATTERN_SEQUENCE_VERSION}`);
  }
  if (input.kind !== "pattern-sequence") {
    throw new TypeError('patternSequence.kind must be "pattern-sequence"');
  }
  const steps = integer(input.steps, "patternSequence.steps");
  if (steps < 2 || steps > 256) {
    throw new RangeError("patternSequence.steps must be between 2 and 256");
  }
  const variation = record(input.variation, "patternSequence.variation");
  keys(
    variation,
    ["parameter", "start", "end", "progression", "visualOrder"],
    "patternSequence.variation",
  );
  if (!["spacing", "size", "strokeWidth", "opacity"].includes(String(variation.parameter))) {
    throw new TypeError("patternSequence.variation.parameter is not supported");
  }
  if (
    variation.progression !== undefined &&
    variation.progression !== "linear" &&
    variation.progression !== "geometric"
  ) {
    throw new TypeError("patternSequence.variation.progression is not supported");
  }
  if (
    variation.visualOrder !== undefined &&
    variation.visualOrder !== "low-to-high" &&
    variation.visualOrder !== "high-to-low"
  ) {
    throw new TypeError("patternSequence.variation.visualOrder is not supported");
  }
  if (input.overrides !== undefined && !Array.isArray(input.overrides)) {
    throw new TypeError("patternSequence.overrides must be an array");
  }
  const seenSteps = new Set<number>();
  const overrides = (input.overrides ?? []).map((value, index): PatternSequenceOverride => {
    const override = record(value, `patternSequence.overrides[${index}]`);
    keys(override, ["step", "value"], `patternSequence.overrides[${index}]`);
    const step = integer(override.step, `patternSequence.overrides[${index}].step`);
    if (step < 0 || step >= steps) {
      throw new RangeError(`patternSequence.overrides[${index}].step is out of range`);
    }
    if (seenSteps.has(step)) throw new Error(`patternSequence overrides step ${step} more than once`);
    seenSteps.add(step);
    return { step, value: finite(override.value, `patternSequence.overrides[${index}].value`) };
  }).sort((first, second) => first.step - second.step);

  const sequence: PatternSequence = {
    version: PATTERN_SEQUENCE_VERSION,
    kind: "pattern-sequence",
    id: nonEmptyString(input.id, "patternSequence.id"),
    ...(input.name === undefined
      ? {}
      : { name: nonEmptyString(input.name, "patternSequence.name") }),
    base: parsePattern(input.base),
    steps,
    variation: {
      parameter: variation.parameter as PatternSequenceParameter,
      start: finite(variation.start, "patternSequence.variation.start"),
      end: finite(variation.end, "patternSequence.variation.end"),
      ...(variation.progression === undefined
        ? {}
        : { progression: variation.progression as PatternSequenceProgression }),
      ...(variation.visualOrder === undefined
        ? {}
        : { visualOrder: variation.visualOrder as PatternSequenceVisualOrder }),
    },
    overrides,
  };
  if (
    sequence.variation.progression === "geometric" &&
    (sequence.variation.start <= 0 || sequence.variation.end <= 0)
  ) {
    throw new RangeError("geometric sequence progression requires positive endpoints");
  }
  validateVisualOrder(sequence.variation);
  materializeNormalized(sequence);
  return sequence;
}

/** Derives the finite ordered items without adding them to persisted state. */
export function materializePatternSequence(value: PatternSequence): MaterializedPatternStep[] {
  return materializeNormalized(parsePatternSequence(value));
}

/** Stable JSON containing only base, variation, and sparse overrides. */
export function serializePatternSequence(value: PatternSequence): string {
  return JSON.stringify(parsePatternSequence(value));
}

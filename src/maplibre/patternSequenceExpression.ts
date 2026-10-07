import {
  materializePatternSequence,
  type PatternSequence,
} from "../model/patternSequence";
import type { Pattern } from "../model/pattern";

export type PatternSequenceMatchExpression = [
  "match",
  ["get", string],
  ...Array<number | string>,
];

export interface CreatePatternSequenceExpressionOptions {
  /** Feature property containing a zero-based sequence step. */
  property: string;
  fallback?: string;
  resolve?: (pattern: Pattern, index: number) => string;
}

/**
 * Maps explicit finite step indices to derived patterns. This intentionally
 * uses `match`, not interpolation between pattern images.
 */
export function createPatternSequenceExpression(
  sequence: PatternSequence,
  options: CreatePatternSequenceExpressionOptions,
): PatternSequenceMatchExpression {
  if (typeof options.property !== "string" || options.property.trim().length === 0) {
    throw new TypeError("property must be a non-empty string");
  }
  const resolve = options.resolve ?? ((pattern: Pattern) => pattern.id);
  const expression: Array<number | string | ["get", string]> = [
    "match",
    ["get", options.property],
  ];
  for (const step of materializePatternSequence(sequence)) {
    const output = resolve(step.pattern, step.index);
    if (typeof output !== "string" || output.length === 0) {
      throw new TypeError("resolve must return a non-empty string for every Pattern");
    }
    expression.push(step.index, output);
  }
  expression.push(options.fallback ?? "");
  return expression as PatternSequenceMatchExpression;
}

import { parsePatternSet, type PatternSet, type PatternSetKey } from "../model/patternSet";
import type { Pattern } from "../model/pattern";

export type PatternSetMatchExpression = [
  "match",
  ["get", string],
  ...Array<PatternSetKey | string>,
];

export interface CreatePatternSetExpressionOptions {
  /** Feature property containing the category key. */
  property: string;
  /** Value used when a feature key is not present in the set. */
  fallback?: string;
  /** Maps a Pattern to the value returned by the expression. Defaults to Pattern.id. */
  resolve?: (pattern: Pattern) => string;
}

/** Builds a MapLibre `match` expression from a canonical PatternSet. */
export function createPatternSetExpression(
  value: PatternSet,
  options: CreatePatternSetExpressionOptions,
): PatternSetMatchExpression {
  const patternSet = parsePatternSet(value);
  if (typeof options.property !== "string" || options.property.trim().length === 0) {
    throw new TypeError("property must be a non-empty string");
  }
  const keyType = typeof patternSet.entries[0].key;
  if (patternSet.entries.some((entry) => typeof entry.key !== keyType)) {
    throw new TypeError("MapLibre match labels must all use the same key type");
  }
  const resolve = options.resolve ?? ((pattern: Pattern) => pattern.id);
  const expression: Array<PatternSetKey | string | ["get", string]> = [
    "match",
    ["get", options.property],
  ];
  for (const entry of patternSet.entries) {
    const output = resolve(entry.pattern);
    if (typeof output !== "string" || output.length === 0) {
      throw new TypeError("resolve must return a non-empty string for every Pattern");
    }
    expression.push(entry.key, output);
  }
  expression.push(options.fallback ?? "");
  return expression as PatternSetMatchExpression;
}

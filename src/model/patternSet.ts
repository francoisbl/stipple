import { parsePattern, type Pattern } from "./pattern";

export const PATTERN_SET_VERSION = 1 as const;

export type PatternSetKey = string | number;

export interface PatternSetEntry {
  /** Category value used to select this pattern. */
  key: PatternSetKey;
  /** Optional human-readable category label. */
  label?: string;
  pattern: Pattern;
}

/** A serializable categorical collection of complete Pattern objects. */
export interface PatternSet {
  version: typeof PATTERN_SET_VERSION;
  kind: "pattern-set";
  id: string;
  name?: string;
  entries: PatternSetEntry[];
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

function parseKey(value: unknown, name: string): PatternSetKey {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new TypeError(`${name} must be a non-empty string or a finite number`);
}

function keyIdentity(value: PatternSetKey): string {
  return `${typeof value}:${value}`;
}

/** Validates untrusted input and normalizes every nested Pattern. */
export function parsePatternSet(value: unknown): PatternSet {
  const input = record(value, "patternSet");
  keys(input, ["version", "kind", "id", "name", "entries"], "patternSet");
  if (input.version !== PATTERN_SET_VERSION) {
    throw new TypeError(`patternSet.version must be ${PATTERN_SET_VERSION}`);
  }
  if (input.kind !== "pattern-set") {
    throw new TypeError('patternSet.kind must be "pattern-set"');
  }
  if (!Array.isArray(input.entries) || input.entries.length === 0) {
    throw new TypeError("patternSet.entries must be a non-empty array");
  }

  const identities = new Set<string>();
  const entries = input.entries.map((value, index): PatternSetEntry => {
    const entry = record(value, `patternSet.entries[${index}]`);
    keys(entry, ["key", "label", "pattern"], `patternSet.entries[${index}]`);
    const key = parseKey(entry.key, `patternSet.entries[${index}].key`);
    const identity = keyIdentity(key);
    if (identities.has(identity)) {
      throw new Error(`patternSet.entries contains duplicate key ${JSON.stringify(key)}`);
    }
    identities.add(identity);
    return {
      key,
      ...(entry.label === undefined
        ? {}
        : { label: nonEmptyString(entry.label, `patternSet.entries[${index}].label`) }),
      pattern: parsePattern(entry.pattern),
    };
  });

  return {
    version: PATTERN_SET_VERSION,
    kind: "pattern-set",
    id: nonEmptyString(input.id, "patternSet.id"),
    ...(input.name === undefined
      ? {}
      : { name: nonEmptyString(input.name, "patternSet.name") }),
    entries,
  };
}

/** Stable JSON representation of a normalized canonical PatternSet. */
export function serializePatternSet(patternSet: PatternSet): string {
  return JSON.stringify(parsePatternSet(patternSet));
}

/** Finds a category without coercing numeric and string keys into each other. */
export function patternForSetKey(
  value: PatternSet,
  key: PatternSetKey,
): Pattern | undefined {
  const patternSet = parsePatternSet(value);
  return patternSet.entries.find((entry) => entry.key === key)?.pattern;
}

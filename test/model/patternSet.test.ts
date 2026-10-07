import { describe, expect, it } from "vitest";
import {
  parsePatternSet,
  patternForSetKey,
  serializePatternSet,
  type Pattern,
} from "../../src/model";

function pattern(id: string): Pattern {
  return {
    version: 1,
    kind: "pattern",
    id,
    fill: { family: "solid", color: "#234c46" },
    opacity: 1,
    scale: { mode: "screen" },
    render: { pixelRatio: "auto" },
  };
}

describe("PatternSet", () => {
  it("round-trips an ordered collection of complete Patterns", () => {
    const value = parsePatternSet({
      version: 1,
      kind: "pattern-set",
      id: "land-cover",
      name: "Land cover",
      entries: [
        { key: "forest", label: "Forest", pattern: pattern("forest-pattern") },
        { key: 2, label: "Water", pattern: pattern("water-pattern") },
      ],
    });

    expect(JSON.parse(serializePatternSet(value))).toEqual(value);
    expect(patternForSetKey(value, "forest")?.id).toBe("forest-pattern");
    expect(patternForSetKey(value, 2)?.id).toBe("water-pattern");
    expect(patternForSetKey(value, "2")).toBeUndefined();
  });

  it("normalizes nested Patterns", () => {
    const value = parsePatternSet({
      version: 1,
      kind: "pattern-set",
      id: "set",
      entries: [{
        key: "one",
        pattern: {
          version: 1,
          kind: "pattern",
          id: "one",
          fill: { family: "solid", color: "#fff" },
        },
      }],
    });
    expect(value.entries[0].pattern).toMatchObject({
      opacity: 1,
      scale: { mode: "screen" },
      render: { pixelRatio: "auto" },
    });
  });

  it("rejects empty sets, invalid keys, duplicate keys, and unknown fields", () => {
    const base = { version: 1, kind: "pattern-set", id: "set" };
    expect(() => parsePatternSet({ ...base, entries: [] })).toThrow(/non-empty/);
    expect(() => parsePatternSet({ ...base, entries: [{ key: true, pattern: pattern("a") }] }))
      .toThrow(/key/);
    expect(() => parsePatternSet({
      ...base,
      entries: [
        { key: "same", pattern: pattern("a") },
        { key: "same", pattern: pattern("b") },
      ],
    })).toThrow(/duplicate key/);
    expect(() => parsePatternSet({
      ...base,
      entries: [{ key: "one", pattern: pattern("a"), extra: true }],
    })).toThrow(/extra/);
  });
});

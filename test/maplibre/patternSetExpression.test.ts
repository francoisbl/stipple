import { describe, expect, it } from "vitest";
import { createPatternSetExpression } from "../../src/maplibre";
import type { PatternSet } from "../../src/model";

const patternSet: PatternSet = {
  version: 1,
  kind: "pattern-set",
  id: "land-cover",
  entries: [
    {
      key: "forest",
      pattern: {
        version: 1,
        kind: "pattern",
        id: "forest-pattern",
        fill: { family: "solid", color: "#234c46" },
        opacity: 1,
        scale: { mode: "screen" },
        render: { pixelRatio: "auto" },
      },
    },
    {
      key: "water",
      pattern: {
        version: 1,
        kind: "pattern",
        id: "water-pattern",
        fill: { family: "solid", color: "#315f86" },
        opacity: 1,
        scale: { mode: "screen" },
        render: { pixelRatio: "auto" },
      },
    },
  ],
};

describe("createPatternSetExpression", () => {
  it("maps category keys to Pattern ids", () => {
    expect(createPatternSetExpression(patternSet, { property: "category" })).toEqual([
      "match",
      ["get", "category"],
      "forest",
      "forest-pattern",
      "water",
      "water-pattern",
      "",
    ]);
  });

  it("supports renderer-specific ids and validates outputs", () => {
    expect(createPatternSetExpression(patternSet, {
      property: "class",
      fallback: "fallback-pattern",
      resolve: (pattern) => `image:${pattern.id}`,
    })).toEqual([
      "match", ["get", "class"],
      "forest", "image:forest-pattern",
      "water", "image:water-pattern",
      "fallback-pattern",
    ]);
    expect(() => createPatternSetExpression(patternSet, { property: "" })).toThrow(/property/);
    expect(() => createPatternSetExpression(patternSet, {
      property: "class",
      resolve: () => "",
    })).toThrow(/resolve/);
    expect(() => createPatternSetExpression({
      ...patternSet,
      entries: [patternSet.entries[0], { ...patternSet.entries[1], key: 7 }],
    }, { property: "class" })).toThrow(/same key type/);
  });
});

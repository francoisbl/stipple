import { describe, expect, it } from "vitest";
import { createPatternSequenceExpression } from "../../src/maplibre";
import type { PatternSequence } from "../../src/model";

const sequence: PatternSequence = {
  version: 1,
  kind: "pattern-sequence",
  id: "opacity",
  base: {
    version: 1,
    kind: "pattern",
    id: "base",
    fill: { family: "solid", color: "#234c46" },
    opacity: 1,
    scale: { mode: "screen" },
    render: { pixelRatio: "auto" },
  },
  steps: 3,
  variation: { parameter: "opacity", start: 0.25, end: 1 },
  overrides: [],
};

describe("createPatternSequenceExpression", () => {
  it("maps finite step indices without implying interpolation", () => {
    expect(createPatternSequenceExpression(sequence, { property: "step" })).toEqual([
      "match", ["get", "step"],
      0, "base-step-1",
      1, "base-step-2",
      2, "base-step-3",
      "",
    ]);
  });

  it("supports renderer-specific ids and validates options", () => {
    expect(createPatternSequenceExpression(sequence, {
      property: "rank",
      fallback: "missing",
      resolve: (_pattern, index) => `rank-${index}`,
    }).at(-1)).toBe("missing");
    expect(() => createPatternSequenceExpression(sequence, { property: "" })).toThrow(/property/);
    expect(() => createPatternSequenceExpression(sequence, {
      property: "rank",
      resolve: () => "",
    })).toThrow(/resolve/);
  });
});

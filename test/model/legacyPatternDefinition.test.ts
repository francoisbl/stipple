import { describe, expect, it } from "vitest";
import {
  parsePatternDefinition,
  type PatternDefinition,
} from "../../src/maplibre/patternDefinition";
import {
  patternFromLegacyDefinition,
  patternToLegacyDefinition,
} from "../../src/model";

const definitions: PatternDefinition[] = [
  { kind: "geometric", pattern: "stipple", size: 33, color: "#234c46", weight: 2, angle: 45 },
  { kind: "geometric", pattern: "stipple", size: 16, color: "#234c46", weight: 1, angle: 0, stippleCount: 4, pixelRatio: 2 },
  { kind: "geometric", pattern: "hachures", size: 32, color: "#d65f45", weight: 1.5, angle: -45 },
  { kind: "geometric", pattern: "cross", size: 28, color: "#675d4d", weight: 1.25, angle: 0 },
  { kind: "geometric", pattern: "grid", size: 20, color: "#315f86", weight: 2, angle: 0 },
  { kind: "geometric", pattern: "dots", size: 24, color: "#315f86", weight: 2.4, angle: 0 },
  {
    kind: "svg",
    svg: "<svg />",
    tileSize: 288,
    stampSize: 28,
    density: 1.4,
    seed: "forest",
    rotationJitterDeg: 10,
    scaleJitter: 0.1,
    positionJitter: 0.15,
    stagger: true,
    distribution: "offset",
    minSpacing: 0,
  },
  {
    kind: "svg",
    svg: "<svg />",
    tileSize: 240,
    stampSize: 20,
    density: 2,
    seed: 3,
    rotationJitterDeg: 20,
    scaleJitter: 0.2,
    positionJitter: 0.3,
    stagger: false,
    distribution: "natural",
    minSpacing: 4,
  },
  {
    kind: "font",
    text: "V",
    fontFamily: "serif",
    fontSize: 20,
    fontWeight: "700",
    fontStyle: "italic",
    letterSpacing: 1,
    horizontalSpacing: 26,
    verticalSpacing: 22,
    rotationDeg: -20,
    stagger: true,
    color: "#315f2f",
  },
];

describe("legacy PatternDefinition adapters", () => {
  it.each(definitions)("round-trips $kind definitions", (definition) => {
    const normalized = parsePatternDefinition(definition);
    const pattern = patternFromLegacyDefinition(normalized, { id: "test-pattern" });
    expect(patternToLegacyDefinition(pattern)).toEqual(normalized);
  });

  it("preserves Pattern-level presentation supplied by the caller", () => {
    const pattern = patternFromLegacyDefinition(definitions[2], {
      id: "hatches",
      name: "Warm hatches",
      opacity: 0.75,
      background: { color: "#f3ded7", opacity: 0.4 },
      outline: { color: "#6a3024", width: 1.5, dash: [4, 2] },
      scale: { mode: "map", referenceZoom: 12 },
    });
    expect(pattern).toMatchObject({
      id: "hatches",
      name: "Warm hatches",
      opacity: 0.75,
      background: { color: "#f3ded7", opacity: 0.4 },
      outline: { color: "#6a3024", width: 1.5, dash: [4, 2] },
      scale: { mode: "map", referenceZoom: 12 },
    });
  });

  it("rejects canonical features that the legacy recipe cannot express", () => {
    const pattern = patternFromLegacyDefinition(definitions[5], { id: "square" });
    if (pattern.fill.family !== "glyph") throw new Error("expected glyph adapter");
    pattern.fill.glyph = "square";
    expect(() => patternToLegacyDefinition(pattern)).toThrow(/circle glyphs/);
  });
});

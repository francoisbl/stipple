import { describe, expect, it } from "vitest";
import type { Pattern, PatternSequence, PatternSet } from "../../src/model";
import {
  CANONICAL_PATTERN_METADATA_KEY,
  createPatternSequenceStyleFragment,
  createPatternSetStyleFragment,
  createPatternStyleFragment,
  parseCanonicalPatternMetadata,
  patternImageId,
} from "../../src/maplibre";

function pattern(id: string, color = "#2c6a5b"): Pattern {
  return {
    version: 1,
    kind: "pattern",
    id,
    fill: {
      family: "glyph",
      glyph: "diamond",
      color,
      size: 5,
      rotation: 0,
      opacity: 1,
      placement: {
        kind: "lattice",
        tileSize: 24,
        spacing: { mode: "explicit", horizontal: 12, vertical: 12 },
        rowOffset: 0.5,
        columnOffset: 0,
        gridAngle: 0,
        positionJitter: 0,
        rotationJitter: 0,
        scaleJitter: 0,
        seed: 1,
      },
    },
    opacity: 0.8,
    background: { color: "#eef4f1", opacity: 0.4 },
    outline: { color, width: 1, dash: [] },
    scale: { mode: "screen" },
    render: { pixelRatio: "auto" },
  };
}

describe("canonical Pattern style fragments", () => {
  it("exports one Pattern as source-neutral layers with canonical metadata", () => {
    const value = pattern("forest");
    const fragment = createPatternStyleFragment(value);
    expect(fragment.layers.map(({ id }) => id)).toEqual([
      "<source>__bg",
      "<source>__pat",
      "<source>__line",
    ]);
    const patternLayer = fragment.layers[1];
    expect(patternLayer.paint).toMatchObject({
      "fill-pattern": patternImageId(value, value.id),
      "fill-opacity": 0.8,
    });
    const canonical = (patternLayer.metadata as Record<string, unknown>)[
      CANONICAL_PATTERN_METADATA_KEY
    ];
    expect(parseCanonicalPatternMetadata(canonical).patterns).toHaveLength(1);
  });

  it("exports a PatternSet with a categorical match expression", () => {
    const solid: Pattern = {
      ...pattern("water"),
      fill: { family: "solid", color: "#d7e9f4" },
      background: undefined,
      outline: undefined,
    };
    const set: PatternSet = {
      version: 1,
      kind: "pattern-set",
      id: "land-cover",
      entries: [
        { key: "forest", pattern: pattern("forest") },
        { key: "water", pattern: solid },
      ],
    };
    const fragment = createPatternSetStyleFragment(set, { property: "class" });
    const patternLayer = fragment.layers.find(({ id }) => id === "<source>__pat");
    expect((patternLayer?.paint as Record<string, unknown>)["fill-pattern"]).toEqual([
      "match",
      ["get", "class"],
      "forest",
      patternImageId(set.entries[0].pattern, "forest"),
      "water",
      "",
      "",
    ]);
    expect(fragment.layers.some(({ id }) => id === "<source>__solid")).toBe(true);
  });

  it("exports materialized sequence steps without persisting derived items", () => {
    const sequence: PatternSequence = {
      version: 1,
      kind: "pattern-sequence",
      id: "density",
      base: pattern("base"),
      steps: 3,
      variation: { parameter: "size", start: 2, end: 8 },
      overrides: [{ step: 1, value: 6 }],
    };
    const fragment = createPatternSequenceStyleFragment(sequence, { property: "step" });
    const patternLayer = fragment.layers.find(({ id }) => id === "<source>__pat");
    const expression = (patternLayer?.paint as Record<string, unknown>)["fill-pattern"] as unknown[];
    expect(expression.slice(0, 2)).toEqual(["match", ["get", "step"]]);
    expect(expression.filter((item) => typeof item === "number")).toEqual([0, 1, 2]);
    expect(JSON.stringify(fragment)).not.toContain('"items"');
    const metadata = (patternLayer?.metadata as Record<string, unknown>)[
      CANONICAL_PATTERN_METADATA_KEY
    ];
    expect(parseCanonicalPatternMetadata(metadata).patterns).toHaveLength(3);
  });

  it("emits bounded zoom variants for ground-scaled patterns", () => {
    const value = { ...pattern("map-scale"), scale: { mode: "map", referenceZoom: 12 } } as Pattern;
    const fragment = createPatternStyleFragment(value);
    const layer = fragment.layers.find(({ id }) => id === "<source>__pat");
    const expression = (layer?.paint as Record<string, unknown>)["fill-pattern"] as unknown[];
    expect(expression.slice(0, 2)).toEqual([
      "step",
      ["zoom"],
    ]);
    const metadata = (layer?.metadata as Record<string, unknown>)[
      CANONICAL_PATTERN_METADATA_KEY
    ];
    expect(parseCanonicalPatternMetadata(metadata).patterns).toHaveLength(5);
  });
});

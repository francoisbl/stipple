import { describe, expect, it } from "vitest";
import {
  materializePatternSequence,
  parsePatternSequence,
  sequenceProgress,
  serializePatternSequence,
  type Pattern,
} from "../../src/model";

function linePattern(): Pattern {
  return {
    version: 1,
    kind: "pattern",
    id: "base",
    name: "Hatches",
    fill: {
      family: "line",
      shape: "straight",
      color: "#234c46",
      angle: 45,
      spacing: 10,
      strokeWidth: 1,
      opacity: 1,
    },
    opacity: 1,
    scale: { mode: "screen" },
    render: { pixelRatio: "auto" },
  };
}

describe("PatternSequence", () => {
  it("derives items from base + variation + sparse overrides only", () => {
    const sequence = parsePatternSequence({
      version: 1,
      kind: "pattern-sequence",
      id: "weight-scale",
      base: linePattern(),
      steps: 4,
      variation: { parameter: "strokeWidth", start: 1, end: 4 },
      overrides: [{ step: 2, value: 2.5 }],
    });
    const materialized = materializePatternSequence(sequence);
    expect(materialized.map((step) => step.value)).toEqual([1, 2, 2.5, 4]);
    expect(materialized.map((step) => step.pattern.id)).toEqual([
      "base-step-1", "base-step-2", "base-step-3", "base-step-4",
    ]);
    expect(materialized.map((step) =>
      step.pattern.fill.family === "line" ? step.pattern.fill.strokeWidth : 0,
    )).toEqual([1, 2, 2.5, 4]);
    expect(JSON.parse(serializePatternSequence(sequence))).not.toHaveProperty("items");
  });

  it("declares perceptual order independently from numeric direction", () => {
    const sequence = parsePatternSequence({
      version: 1,
      kind: "pattern-sequence",
      id: "density-scale",
      base: linePattern(),
      steps: 5,
      variation: {
        parameter: "spacing",
        start: 28,
        end: 4,
        progression: "linear",
        visualOrder: "low-to-high",
      },
      overrides: [],
    });
    expect(materializePatternSequence(sequence).map((step) => step.value))
      .toEqual([28, 22, 16, 10, 4]);
    expect(sequenceProgress(2, 5, "linear")).toBe(0.5);
    expect(() => parsePatternSequence({
      ...sequence,
      variation: { ...sequence.variation, start: 4, end: 28 },
    })).toThrow(/low-to-high requires spacing to decrease/);
    expect(() => parsePatternSequence({
      ...sequence,
      overrides: [{ step: 2, value: 30 }],
    })).toThrow(/overrides must preserve/);
  });

  it("supports geometric spacing for visually even density steps", () => {
    const sequence = parsePatternSequence({
      version: 1,
      kind: "pattern-sequence",
      id: "perceptual-density-scale",
      base: linePattern(),
      steps: 5,
      variation: {
        parameter: "spacing",
        start: 48,
        end: 12,
        progression: "geometric",
        visualOrder: "low-to-high",
      },
      overrides: [],
    });
    expect(materializePatternSequence(sequence).map((step) => step.value))
      .toEqual([48, 33.94112549695428, 24, 16.97056274847714, 12]);
    expect(() => parsePatternSequence({
      ...sequence,
      variation: { ...sequence.variation, end: 0 },
    })).toThrow(/positive endpoints/);
  });

  it("re-derives every item when the base changes", () => {
    const sequence = parsePatternSequence({
      version: 1,
      kind: "pattern-sequence",
      id: "spacing-scale",
      base: linePattern(),
      steps: 3,
      variation: { parameter: "spacing", start: 8, end: 16 },
      overrides: [],
    });
    sequence.base.fill = { ...sequence.base.fill, color: "#d65f45" };
    expect(materializePatternSequence(sequence).every((step) =>
      step.pattern.fill.family === "line" && step.pattern.fill.color === "#d65f45",
    )).toBe(true);
  });

  it("supports visual size and overall opacity variations", () => {
    const glyph = linePattern();
    glyph.fill = {
      family: "glyph",
      glyph: "diamond",
      color: "#234c46",
      size: 2,
      rotation: 0,
      opacity: 1,
      placement: {
        kind: "lattice",
        tileSize: 20,
        spacing: { mode: "explicit", horizontal: 10, vertical: 10 },
        rowOffset: 0,
        columnOffset: 0,
        gridAngle: 0,
        positionJitter: 0,
        rotationJitter: 0,
        scaleJitter: 0,
        seed: 1,
      },
    };
    const sized = parsePatternSequence({
      version: 1,
      kind: "pattern-sequence",
      id: "sizes",
      base: glyph,
      steps: 2,
      variation: { parameter: "size", start: 2, end: 8 },
      overrides: [],
    });
    expect(materializePatternSequence(sized).map(({ pattern }) =>
      pattern.fill.family === "glyph" ? pattern.fill.size : 0,
    )).toEqual([2, 8]);

    const faded = parsePatternSequence({
      ...sized,
      id: "opacity",
      variation: { parameter: "opacity", start: 0.2, end: 1 },
    });
    expect(materializePatternSequence(faded).map(({ pattern }) => pattern.opacity))
      .toEqual([0.2, 1]);
  });

  it("rejects persisted items, incompatible variables, and invalid overrides", () => {
    const base = {
      version: 1,
      kind: "pattern-sequence",
      id: "bad",
      base: linePattern(),
      steps: 3,
      variation: { parameter: "strokeWidth", start: 1, end: 3 },
      overrides: [],
    };
    expect(() => parsePatternSequence({ ...base, items: [] })).toThrow(/items/);
    expect(() => parsePatternSequence({
      ...base,
      variation: { parameter: "size", start: 1, end: 3 },
    })).toThrow(/cannot vary/);
    expect(() => parsePatternSequence({
      ...base,
      overrides: [{ step: 3, value: 2 }],
    })).toThrow(/out of range/);
    expect(() => parsePatternSequence({
      ...base,
      overrides: [{ step: 1, value: 2 }, { step: 1, value: 2.5 }],
    })).toThrow(/more than once/);
  });
});

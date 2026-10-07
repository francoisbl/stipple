import { describe, expect, it } from "vitest";
import {
  PATTERN_VERSION,
  parsePattern,
  serializePattern,
  type Pattern,
} from "../../src/model";

const dots: Pattern = {
  version: 1,
  kind: "pattern",
  id: "dots",
  fill: {
    family: "glyph",
    glyph: "circle",
    color: "#315f86",
    size: 3,
    rotation: 0,
    opacity: 1,
    placement: {
      kind: "lattice",
      tileSize: 24,
      spacing: { mode: "explicit", horizontal: 24, vertical: 24 },
      rowOffset: 0,
      columnOffset: 0,
      gridAngle: 0,
      positionJitter: 0,
      rotationJitter: 0,
      scaleJitter: 0,
      seed: 1,
    },
  },
  opacity: 1,
  scale: { mode: "screen" },
  render: { pixelRatio: "auto" },
};

describe("canonical Pattern", () => {
  it("uses one v1 namespace for the new design model", () => {
    expect(PATTERN_VERSION).toBe(1);
    expect(parsePattern(dots).version).toBe(1);
  });

  it("normalizes optional top-level defaults and serializes deterministically", () => {
    const minimal = { ...dots } as Record<string, unknown>;
    delete minimal.opacity;
    delete minimal.scale;
    delete minimal.render;
    const normalized = parsePattern(minimal);
    expect(normalized.opacity).toBe(1);
    expect(normalized.scale).toEqual({ mode: "screen" });
    expect(normalized.render).toEqual({ pixelRatio: "auto" });
    expect(serializePattern(normalized)).toBe(serializePattern({ ...normalized }));
  });

  it("supports composites as a low-level canonical primitive", () => {
    const composite = parsePattern({
      ...dots,
      id: "grid",
      fill: {
        family: "composite",
        layers: [
          { family: "line", shape: "straight", color: "#000", angle: 0, spacing: 16, strokeWidth: 1, opacity: 1 },
          { family: "line", shape: "straight", color: "#000", angle: 90, spacing: 16, strokeWidth: 1, opacity: 1 },
        ],
      },
    });
    expect(composite.fill.family).toBe("composite");
  });

  it("validates versioned untrusted data strictly", () => {
    expect(() => parsePattern({ ...dots, version: 2 })).toThrow(/version/);
    expect(() => parsePattern({ ...dots, opacity: 1.5 })).toThrow(/opacity/);
    expect(() => parsePattern({ ...dots, extra: true })).toThrow(/extra/);
    expect(() => parsePattern({
      ...dots,
      fill: {
        ...dots.fill,
        placement: {
          kind: "natural",
          tileSize: 32,
          density: 1,
          count: 4,
        },
      },
    })).toThrow(/exactly one/);
  });
});

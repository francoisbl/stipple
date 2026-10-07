import { describe, expect, it } from "vitest";
import { materializePatternPlacement } from "../../src/model";

describe("materializePatternPlacement", () => {
  it("derives marks from canonical lattice placement", () => {
    const placements = materializePatternPlacement({
      kind: "lattice",
      tileSize: 64,
      spacing: { mode: "explicit", horizontal: 16, vertical: 32 },
      rowOffset: 0.5,
      columnOffset: 0,
      gridAngle: 0,
      positionJitter: 0,
      rotationJitter: 0,
      scaleJitter: 0,
      seed: 1,
    }, 8);
    expect(new Set(placements.map(({ markIndex }) => markIndex)).size).toBe(8);
  });

  it("derives marks from canonical count-based natural placement", () => {
    const placements = materializePatternPlacement({
      kind: "natural",
      tileSize: 100,
      count: 4,
      minSpacing: 0,
      positionJitter: 0,
      rotationJitter: 0,
      scaleJitter: 0,
      seed: "four",
    }, 4);
    expect(new Set(placements.map(({ markIndex }) => markIndex)).size).toBe(4);
  });
});

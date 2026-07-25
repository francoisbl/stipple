import { describe, expect, it } from "vitest";
import {
  createSvgScatterLayout,
  type SvgScatterLayoutOptions,
} from "../../src/engine/svgScatterLayout";

const options: SvgScatterLayoutOptions = {
  tileSize: 96,
  stampSize: 36,
  density: 6,
  seed: "seam-regression",
  rotationJitterDeg: 35,
  scaleJitter: 0.4,
  positionJitter: 0.7,
  stagger: true,
};

describe("createSvgScatterLayout", () => {
  it("is deterministic", () => {
    expect(createSvgScatterLayout(options)).toEqual(createSvgScatterLayout(options));
    expect(createSvgScatterLayout({ ...options, seed: "other" })).not.toEqual(
      createSvgScatterLayout(options),
    );
  });

  it("preserves transforms across every wrapped copy", () => {
    const placements = createSvgScatterLayout(options);
    const groups = new Map<number, typeof placements>();
    for (const placement of placements) {
      const group = groups.get(placement.stampIndex) ?? [];
      group.push(placement);
      groups.set(placement.stampIndex, group);
    }
    expect([...groups.values()].some((group) => group.length > 1)).toBe(true);

    for (const group of groups.values()) {
      const [first] = group;
      expect(first).toBeDefined();
      expect(group.some(({ x, y }) => x >= 0 && x < options.tileSize && y >= 0 && y < options.tileSize)).toBe(true);

      for (const copy of group) {
        expect(copy.rotationRad).toBe(first.rotationRad);
        expect(copy.scale).toBe(first.scale);
        expect(((copy.x - first.x) / options.tileSize) % 1).toBeCloseTo(0, 12);
        expect(((copy.y - first.y) / options.tileSize) % 1).toBeCloseTo(0, 12);
      }
    }
  });

  it("rejects values that could create invalid or unbounded layouts", () => {
    expect(() => createSvgScatterLayout({ ...options, density: 0 })).toThrow(/density/);
    expect(() => createSvgScatterLayout({ ...options, tileSize: Number.NaN })).toThrow(/tileSize/);
    expect(() => createSvgScatterLayout({ ...options, scaleJitter: 1 })).toThrow(/scaleJitter/);
  });
});

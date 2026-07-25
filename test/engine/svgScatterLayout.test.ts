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

  it("keeps regular spacing across the tile seam", () => {
    const tileSize = 192;
    const placements = createSvgScatterLayout({
      ...options,
      tileSize,
      stampSize: 20,
      density: 2.7,
      positionJitter: 0,
      rotationJitterDeg: 0,
      scaleJitter: 0,
    }).filter(({ x, y }) => x >= 0 && x < tileSize && y >= 0 && y < tileSize);

    expect(placements).toHaveLength(12);
    const rows = new Map<number, typeof placements>();
    for (const placement of placements) {
      const row = rows.get(placement.y) ?? [];
      row.push(placement);
      rows.set(placement.y, row);
    }
    expect(rows.size).toBe(4);
    for (const row of rows.values()) {
      const xs = row.map(({ x }) => x).sort((a, b) => a - b);
      const gaps = xs.map((x, index) => {
        const next = xs[(index + 1) % xs.length];
        return (next - x + tileSize) % tileSize;
      });
      expect(gaps.every((gap) => Math.abs(gap - 64) < 1e-9)).toBe(true);
    }
  });

  it("creates a deterministic seamless natural distribution with a minimum gap", () => {
    const tileSize = 192;
    const naturalOptions: SvgScatterLayoutOptions = {
      ...options,
      tileSize,
      stampSize: 18,
      density: 3,
      scaleJitter: 0,
      distribution: "natural",
      minSpacing: 4,
    };
    const primary = createSvgScatterLayout(naturalOptions)
      .filter(({ x, y }) => x >= 0 && x < tileSize && y >= 0 && y < tileSize);
    expect(primary).toEqual(
      createSvgScatterLayout(naturalOptions)
        .filter(({ x, y }) => x >= 0 && x < tileSize && y >= 0 && y < tileSize),
    );

    for (let first = 0; first < primary.length; first++) {
      for (let second = first + 1; second < primary.length; second++) {
        const dx = Math.min(
          Math.abs(primary[first].x - primary[second].x),
          tileSize - Math.abs(primary[first].x - primary[second].x),
        );
        const dy = Math.min(
          Math.abs(primary[first].y - primary[second].y),
          tileSize - Math.abs(primary[first].y - primary[second].y),
        );
        expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(22);
      }
    }
  });
});

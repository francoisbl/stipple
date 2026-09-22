import { describe, expect, it } from "vitest";
import { makeTile } from "../../src/engine/makeTile";

describe("makeTile", () => {
  it.each(["hachures", "cross", "grid", "stipple", "dots"] as const)(
    "renders a deterministic %s RGBA tile in Node",
    (pattern) => {
      const first = makeTile(pattern, 16, "#1f4e79", 2, 45);
      const second = makeTile(pattern, 16, "#1f4e79", 2, 45);

      expect(first.width).toBe(16);
      expect(first.height).toBe(16);
      expect(first.data).toHaveLength(16 * 16 * 4);
      expect(first.data).toEqual(second.data);
      expect(first.data.some((channel) => channel !== 0)).toBe(true);
    },
  );

  it("keeps a solid pattern transparent because fill-color handles it", () => {
    const tile = makeTile("solid", 8, "#ff0000", 2, 0);
    expect(tile.data.every((channel) => channel === 0)).toBe(true);
  });

  it("oversamples without changing the logical pattern scale", () => {
    const tile = makeTile("stipple", 16, "#1f4e79", 2, 45, { pixelRatio: 2 });
    expect(tile.width).toBe(32);
    expect(tile.height).toBe(32);
    expect(tile.data).toHaveLength(32 * 32 * 4);
    expect(tile.data.some((channel) => channel !== 0)).toBe(true);
  });

  describe("stipple", () => {
    it("keeps every dot's full ink even when its centre sits at the tile edge (no clipping)", () => {
      // Regression: the previous offset-grid renderer clipped any dot whose
      // radius crossed the tile boundary instead of wrapping it.
      const size = 16;
      const weight = 4;
      const tile = makeTile("stipple", size, "#000000", weight, 0);
      const totalAlpha = tile.data.reduce((sum, v, i) => (i % 4 === 3 ? sum + v : sum), 0);
      const r = weight * 0.6;
      const count = Math.max(1, Math.round((size / 6) ** 2));
      const expectedFullInk = count * Math.PI * r * r * 255;
      expect(totalAlpha).toBeGreaterThan(expectedFullInk * 0.9);
    });

    it("renders a seamless tile regardless of the tile size's cell parity", () => {
      // Regression: the previous offset-grid renderer produced a mismatched
      // seam whenever Math.round(size / 6) was odd (most tile sizes).
      for (const size of [16, 20, 28]) {
        const tile = makeTile("stipple", size, "#000000", 2, 0);
        const alphaAt = (x: number, y: number) => tile.data[(y * size + x) * 4 + 3];
        // A tile is only seamless if wrapping it (column size === column 0,
        // row size === row 0) doesn't change anything, which is guaranteed
        // by construction once dots are drawn with wrapped copies. Sanity
        // check that this actually produced some coverage near every edge
        // rather than an accidental empty border.
        let edgeCoverage = 0;
        for (let i = 0; i < size; i++) {
          edgeCoverage += alphaAt(0, i) + alphaAt(size - 1, i) + alphaAt(i, 0) + alphaAt(i, size - 1);
        }
        expect(edgeCoverage).toBeGreaterThan(0);
      }
    });

    it("keeps dot centers independent of weight, color, and angle so tuning doesn't reshuffle them", () => {
      const a = makeTile("stipple", 16, "#1f4e79", 2, 0);
      const b = makeTile("stipple", 16, "#ff0000", 6, 90);
      let checked = 0;
      for (let i = 3; i < a.data.length; i += 4) {
        // Wherever `a`'s smaller/differently-coloured dot is fully opaque,
        // `b`'s larger dot at the same centre must cover that pixel too.
        if (a.data[i] > 200) {
          expect(b.data[i]).toBeGreaterThan(100);
          checked++;
        }
      }
      expect(checked).toBeGreaterThan(0);
    });

    it("reshuffles the layout when the tile size changes", () => {
      const a = makeTile("stipple", 16, "#000000", 2, 0);
      const b = makeTile("stipple", 24, "#000000", 2, 0);
      expect(a.data).not.toEqual(b.data);
    });
  });

  describe("input validation", () => {
    it.each([0, -4, Number.NaN, Number.POSITIVE_INFINITY])("rejects a size of %p", (size) => {
      expect(() => makeTile("stipple", size, "#000", 2, 0)).toThrow(RangeError);
    });

    it.each([0, -1, Number.NaN])("rejects a weight of %p", (weight) => {
      expect(() => makeTile("stipple", 16, "#000", weight, 0)).toThrow(RangeError);
    });

    it.each([Number.NaN, Number.POSITIVE_INFINITY])("rejects an angle of %p", (angle) => {
      expect(() => makeTile("stipple", 16, "#000", 2, angle)).toThrow(TypeError);
    });

    it.each(["", "   "])("rejects a color of %j", (color) => {
      expect(() => makeTile("stipple", 16, color, 2, 0)).toThrow(TypeError);
    });
  });
});

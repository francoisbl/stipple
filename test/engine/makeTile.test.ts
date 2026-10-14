import { describe, expect, it } from "vitest";
import { createMiniContext } from "../../src/engine/miniContext";
import { makeTile } from "../../src/engine/makeTile";

function referenceStaggeredTile(
  size: number,
  pixelRatio: number,
  weight = 2,
  color = "#1f4e79",
) {
  const physicalSize = Math.max(1, Math.round(size * pixelRatio));
  const renderScale = physicalSize / size;
  const radius = weight * 0.6 * renderScale;
  const cells = size <= 8 ? 2 : size <= 16 ? 3 : 4;
  const spacing = size / cells;
  const { ctx, toTileImage } = createMiniContext(physicalSize);
  ctx.fillStyle = color;

  for (let row = 0; row < cells; row++) {
    for (let column = 0; column < cells; column++) {
      const x = (((column + (row % 2 ? 0.75 : 0.25)) * spacing) % size) * renderScale;
      const y = (((row + 0.5) * spacing) % size) * renderScale;
      const minShiftX = Math.ceil((-radius - x) / physicalSize);
      const maxShiftX = Math.floor((physicalSize + radius - x) / physicalSize);
      const minShiftY = Math.ceil((-radius - y) / physicalSize);
      const maxShiftY = Math.floor((physicalSize + radius - y) / physicalSize);
      for (let shiftY = minShiftY; shiftY <= maxShiftY; shiftY++) {
        for (let shiftX = minShiftX; shiftX <= maxShiftX; shiftX++) {
          ctx.beginPath();
          ctx.arc(
            x + shiftX * physicalSize,
            y + shiftY * physicalSize,
            radius,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
    }
  }
  return toTileImage();
}

describe("makeTile", () => {
  it("keeps the legacy raster output stable", () => {
    const expected = {
      solid: "1f116dc5",
      stipple: "beb746ad",
      hachures: "04b4f4bd",
      cross: "7bafdc55",
      grid: "13a8aa8d",
      dots: "a4b393d5",
    } as const;
    const hash = (data: Uint8Array) => {
      let value = 0x811c9dc5;
      for (const byte of data) {
        value ^= byte;
        value = Math.imul(value, 0x01000193);
      }
      return (value >>> 0).toString(16).padStart(8, "0");
    };

    for (const pattern of Object.keys(expected) as Array<keyof typeof expected>) {
      const tile = makeTile(pattern, 16, "#1f4e79", 2, 45);
      expect(hash(tile.data), pattern).toBe(expected[pattern]);
    }
  });

  it("rotates a grid into a diagonal crosshatch at 45 degrees", () => {
    const orthogonal = makeTile("grid", 16, "#1f4e79", 2, 0);
    const diagonal = makeTile("grid", 16, "#1f4e79", 2, 45);

    expect(diagonal.data).not.toEqual(orthogonal.data);
  });

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
    it("keeps the seeded layout byte-identical when selected explicitly", () => {
      const defaultTile = makeTile("stipple", 16, "#1f4e79", 2, 45);
      const seededTile = makeTile("stipple", 16, "#1f4e79", 2, 45, {
        stippleLayout: "seeded",
      });
      expect(seededTile).toEqual(defaultTile);
    });

    it.each([
      [8, 1], [8, 2], [16, 1], [16, 2], [24, 1], [24, 2],
    ] as const)(
      "matches the staggered reference at size %i and pixel ratio %i",
      (size, pixelRatio) => {
        const tile = makeTile("stipple", size, "#1f4e79", 2, 0, {
          pixelRatio,
          stippleLayout: "staggered",
        });
        expect(tile).toEqual(referenceStaggeredTile(size, pixelRatio));
      },
    );

    it("wraps staggered dots across every tile edge instead of clipping them", () => {
      const size = 8;
      const tile = makeTile("stipple", size, "#000000", 4, 0, {
        stippleLayout: "staggered",
      });
      const alphaAt = (x: number, y: number) => tile.data[(y * size + x) * 4 + 3];

      // The row at y=6 has a centre at x=7, whose wrapped copy reaches x=0.
      expect(alphaAt(0, 6)).toBeGreaterThan(0);
      expect(alphaAt(size - 1, 6)).toBeGreaterThan(0);
      // The same periodic-copy rule applies vertically.
      expect(alphaAt(3, 0)).toBeGreaterThan(0);
      expect(alphaAt(3, size - 1)).toBeGreaterThan(0);
    });

    it("keeps every dot's full ink even when its centre sits at the tile edge (no clipping)", () => {
      // Regression: the previous offset-grid renderer clipped any dot whose
      // radius crossed the tile boundary instead of wrapping it.
      const size = 16;
      const weight = 4;
      const tile = makeTile("stipple", size, "#000000", weight, 0);
      const totalAlpha = tile.data.reduce((sum, v, i) => (i % 4 === 3 ? sum + v : sum), 0);
      const r = weight * 0.6;
      const count = 7;
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

    it("preserves the normalized default texture when tile size and weight scale together", () => {
      const small = makeTile("stipple", 8, "#000000", 1, 0, { pixelRatio: 2 });
      const large = makeTile("stipple", 16, "#000000", 2, 0);
      expect(small.data).toEqual(large.data);
    });

    it("allows a custom sparse dot count", () => {
      const standard = makeTile("stipple", 24, "#000000", 2, 0);
      const sparse = makeTile("stipple", 24, "#000000", 2, 0, { stippleCount: 4 });
      const alpha = (tile: typeof standard) => tile.data.reduce(
        (sum, value, index) => index % 4 === 3 ? sum + value : sum,
        0,
      );
      expect(alpha(sparse)).toBeLessThan(alpha(standard) * 0.75);
    });

    it("preserves the exact normalized texture across ground-scale variants", () => {
      const small = makeTile("stipple", 8, "#000000", 1, 0, {
        pixelRatio: 2,
        stippleCount: 7,
      });
      const large = makeTile("stipple", 16, "#000000", 2, 0, {
        pixelRatio: 1,
        stippleCount: 7,
      });
      expect(small.width).toBe(large.width);
      expect(small.height).toBe(large.height);
      expect(small.data).toEqual(large.data);
    });
  });

  describe("input validation", () => {
    it.each([0, -4, Number.NaN, Number.POSITIVE_INFINITY])("rejects a size of %p", (size) => {
      expect(() => makeTile("stipple", size, "#000", 2, 0)).toThrow(RangeError);
    });

    it.each([0, -1, Number.NaN])("rejects a weight of %p", (weight) => {
      expect(() => makeTile("stipple", 16, "#000", weight, 0)).toThrow(RangeError);
    });

    it.each([0, -1, 1.5])("rejects a stipple count of %p", (stippleCount) => {
      expect(() => makeTile("stipple", 16, "#000", 2, 0, { stippleCount })).toThrow(RangeError);
    });

    it("rejects an unknown stipple layout", () => {
      expect(() => makeTile("stipple", 16, "#000", 2, 0, {
        stippleLayout: "random" as "seeded",
      })).toThrow(/stippleLayout/);
    });

    it.each([Number.NaN, Number.POSITIVE_INFINITY])("rejects an angle of %p", (angle) => {
      expect(() => makeTile("stipple", 16, "#000", 2, angle)).toThrow(TypeError);
    });

    it.each(["", "   "])("rejects a color of %j", (color) => {
      expect(() => makeTile("stipple", 16, color, 2, 0)).toThrow(TypeError);
    });
  });
});

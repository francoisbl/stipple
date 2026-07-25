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
});

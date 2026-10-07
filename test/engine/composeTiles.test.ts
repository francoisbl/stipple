import { describe, expect, it } from "vitest";
import { composeTileImages } from "../../src/engine/composeTiles";
import type { TileImage } from "../../src/engine/types";

function pixel(r: number, g: number, b: number, a: number): TileImage {
  return { width: 1, height: 1, data: new Uint8Array([r, g, b, a]) };
}

describe("composeTileImages", () => {
  it("alpha-composites immutable tile layers from bottom to top", () => {
    const red = pixel(255, 0, 0, 128);
    const blue = pixel(0, 0, 255, 128);
    const result = composeTileImages([{ image: red }, { image: blue }]);
    expect([...result.data]).toEqual([85, 0, 170, 192]);
    expect([...red.data]).toEqual([255, 0, 0, 128]);
    expect([...blue.data]).toEqual([0, 0, 255, 128]);
  });

  it("supports per-layer opacity", () => {
    const result = composeTileImages([
      { image: pixel(255, 0, 0, 255) },
      { image: pixel(0, 0, 255, 255), opacity: 0.5 },
    ]);
    expect([...result.data]).toEqual([128, 0, 128, 255]);
  });

  it("rejects empty, mismatched, and malformed compositions", () => {
    expect(() => composeTileImages([])).toThrow(/at least one/);
    expect(() => composeTileImages([
      { image: pixel(0, 0, 0, 255) },
      { image: { width: 2, height: 1, data: new Uint8Array(8) } },
    ])).toThrow(/equal dimensions/);
    expect(() => composeTileImages([
      { image: pixel(0, 0, 0, 255), opacity: 2 },
    ])).toThrow(/opacity/);
  });
});

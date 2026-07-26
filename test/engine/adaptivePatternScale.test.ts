import { describe, expect, it } from "vitest";
import { adaptivePatternScale } from "../../src/engine/adaptivePatternScale";

describe("adaptivePatternScale", () => {
  it("keeps the requested pattern at a readable map scale", () => {
    expect(adaptivePatternScale({
      polygonSize: 300,
      stampSize: 20,
      density: 2,
      minSpacing: 4,
    })).toEqual({
      scale: 1,
      stampSize: 20,
      density: 2,
      minSpacing: 4,
      opacity: 1,
    });
  });

  it("reduces symbols and compensates their density in a small polygon", () => {
    const result = adaptivePatternScale({
      polygonSize: 50,
      stampSize: 20,
      density: 2,
      minSpacing: 4,
    });
    expect(result.scale).toBe(0.5);
    expect(result.stampSize).toBe(10);
    expect(result.density).toBe(8);
    expect(result.minSpacing).toBe(2);
    expect(result.opacity).toBe(1);
  });

  it("fades symbols when the polygon is too small to identify them", () => {
    const faint = adaptivePatternScale({
      polygonSize: 18,
      stampSize: 20,
      density: 2,
    });
    const hidden = adaptivePatternScale({
      polygonSize: 8,
      stampSize: 20,
      density: 2,
    });
    expect(faint.stampSize).toBe(6);
    expect(faint.opacity).toBeGreaterThan(0);
    expect(faint.opacity).toBeLessThan(1);
    expect(hidden.opacity).toBe(0);
  });

  it("rejects invalid pattern values", () => {
    expect(() => adaptivePatternScale({
      polygonSize: 100,
      stampSize: 0,
      density: 2,
    })).toThrow(/stampSize/);
    expect(() => adaptivePatternScale({
      polygonSize: 100,
      stampSize: 20,
      density: Number.NaN,
    })).toThrow(/density/);
  });
});

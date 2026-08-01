import { describe, expect, it } from "vitest";
import { screenPatternPhase } from "../../src/engine/screenPatternPhase";

describe("screenPatternPhase", () => {
  it("wraps cleanly at integer zoom levels", () => {
    expect(screenPatternPhase(12)).toEqual({ index: 0, pixelRatioScale: 1 });
    expect(screenPatternPhase(12.999, 8).index).toBe(8);
    expect(screenPatternPhase(13, 8).index).toBe(0);
  });

  it("keeps the residual size error below five percent", () => {
    for (let fraction = 0; fraction < 1; fraction += 0.001) {
      const phase = screenPatternPhase(12 + fraction, 8);
      const residual = 2 ** fraction / phase.pixelRatioScale;
      expect(residual).toBeGreaterThan(0.95);
      expect(residual).toBeLessThan(1.05);
    }
  });

  it("rejects invalid values", () => {
    expect(() => screenPatternPhase(Number.NaN)).toThrow(TypeError);
    expect(() => screenPatternPhase(12, 0)).toThrow(RangeError);
    expect(() => screenPatternPhase(12, 2.5)).toThrow(RangeError);
  });
});

import { describe, expect, it } from "vitest";
import { scalePatternForZoom } from "../../src/engine/patternScale";

const base = {
  referenceZoom: 12,
  visualSize: 24,
  spacing: 72,
  opticalScale: 0.75,
  minReadableSize: 12,
};

describe("scalePatternForZoom", () => {
  it("keeps screen values independent of zoom", () => {
    const low = scalePatternForZoom({ ...base, mode: "screen", zoom: 4 });
    const high = scalePatternForZoom({ ...base, mode: "screen", zoom: 18 });
    expect(low).toEqual(high);
    expect(low.visualSize).toBe(24);
    expect(low.stampSize).toBe(32);
    expect(low.spacing).toBe(72);
    expect(low.opacity).toBe(1);
  });

  it("halves map size and spacing for each zoom level out", () => {
    const reference = scalePatternForZoom({ ...base, mode: "map", zoom: 12 });
    const zoomedOut = scalePatternForZoom({ ...base, mode: "map", zoom: 11 });
    expect(reference.visualSize).toBe(24);
    expect(zoomedOut.visualSize).toBe(12);
    expect(zoomedOut.spacing).toBe(36);
    expect(zoomedOut.density).toBeCloseTo(reference.density * 4);
  });

  it("preserves the user's size choice at every zoom", () => {
    const small = scalePatternForZoom({ ...base, mode: "map", zoom: 11 });
    const large = scalePatternForZoom({
      ...base,
      mode: "map",
      zoom: 11,
      visualSize: 48,
    });
    expect(small.visualSize).toBe(12);
    expect(large.visualSize).toBe(24);
  });

  it("uses optical scale to normalize the visible motif size", () => {
    const compact = scalePatternForZoom({
      ...base,
      mode: "screen",
      zoom: 12,
      opticalScale: 0.5,
    });
    const full = scalePatternForZoom({
      ...base,
      mode: "screen",
      zoom: 12,
      opticalScale: 1,
    });
    expect(compact.stampSize).toBe(48);
    expect(full.stampSize).toBe(24);
    expect(compact.visualSize).toBe(full.visualSize);
  });

  it("keeps map motifs readable and caps excessive growth", () => {
    const minimum = scalePatternForZoom({ ...base, mode: "map", zoom: 10 });
    const capped = scalePatternForZoom({ ...base, mode: "map", zoom: 16 });
    expect(minimum.visualSize).toBe(12);
    expect(minimum.spacing).toBe(36);
    expect(minimum.opacity).toBe(1);
    expect(minimum.floored).toBe(true);
    expect(capped.visualSize).toBe(72);
    expect(capped.capped).toBe(true);
  });

  it("tightens spacing only after a motif reaches its readable floor", () => {
    const reference = scalePatternForZoom({
      ...base,
      mode: "map",
      zoom: 12,
      maxSpacingAtReadableFloorRatio: 2,
    });
    const minimum = scalePatternForZoom({
      ...base,
      mode: "map",
      zoom: 10,
      maxSpacingAtReadableFloorRatio: 2,
    });
    expect(reference.spacing).toBe(72);
    expect(minimum.visualSize).toBe(12);
    expect(minimum.spacing).toBe(24);
    expect(minimum.density).toBeCloseTo(10_000 / (24 * 24));
  });

  it("never enlarges a user size that is below the readability guide", () => {
    const minimum = scalePatternForZoom({
      ...base,
      mode: "map",
      zoom: 4,
      visualSize: 9,
    });
    expect(minimum.visualSize).toBe(9);
    expect(minimum.spacing).toBe(72);
    expect(minimum.floored).toBe(true);
  });

  it("rejects invalid scale values", () => {
    expect(() => scalePatternForZoom({
      ...base,
      mode: "map",
      zoom: 12,
      spacing: 0,
    })).toThrow(/spacing/);
    expect(() => scalePatternForZoom({
      ...base,
      mode: "map",
      zoom: 12,
      opticalScale: Number.NaN,
    })).toThrow(/opticalScale/);
    expect(() => scalePatternForZoom({
      ...base,
      mode: "map",
      zoom: 12,
      maxSpacingAtReadableFloorRatio: 0,
    })).toThrow(/maxSpacingAtReadableFloorRatio/);
  });
});

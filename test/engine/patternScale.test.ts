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

  it("fades unreadable map motifs and caps excessive growth", () => {
    const faint = scalePatternForZoom({ ...base, mode: "map", zoom: 10.5 });
    const hidden = scalePatternForZoom({ ...base, mode: "map", zoom: 10 });
    const capped = scalePatternForZoom({ ...base, mode: "map", zoom: 16 });
    expect(faint.opacity).toBeGreaterThan(0);
    expect(faint.opacity).toBeLessThan(1);
    expect(hidden.opacity).toBe(0);
    expect(capped.visualSize).toBe(72);
    expect(capped.capped).toBe(true);
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
  });
});

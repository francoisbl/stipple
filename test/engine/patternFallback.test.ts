import { describe, expect, it } from "vitest";
import {
  fallbackOpacity,
  resolvePatternVisibility,
} from "../../src/engine/patternFallback";

describe("resolvePatternVisibility", () => {
  it("keeps a screen motif visible when several repeats fit", () => {
    const result = resolvePatternVisibility({
      mode: "screen",
      motifOpacity: 1,
      featureArea: 120_000,
      featureMinimumSpan: 300,
      visualSize: 24,
      spacing: 72,
    });
    expect(result.motif).toBe(1);
    expect(result.fallback).toBe(0);
  });

  it("uses the fallback when a screen feature cannot hold one repeat", () => {
    const result = resolvePatternVisibility({
      mode: "screen",
      motifOpacity: 1,
      featureArea: 2_500,
      featureMinimumSpan: 42,
      visualSize: 24,
      spacing: 72,
    });
    expect(result.estimatedMotifs).toBeLessThan(1);
    expect(result.motif).toBeLessThan(0.2);
    expect(result.fallback).toBeGreaterThan(0.8);
  });

  it("uses motif legibility in ground-scale mode", () => {
    expect(resolvePatternVisibility({
      mode: "map",
      motifOpacity: 0.3,
      visualSize: 8,
      spacing: 24,
    })).toEqual({
      motif: 0.3,
      fallback: 0.7,
      estimatedMotifs: null,
    });
  });
});

describe("fallbackOpacity", () => {
  it("keeps automatic fallback restrained and hide transparent", () => {
    expect(fallbackOpacity("automatic", 1)).toBe(0.28);
    expect(fallbackOpacity("hide", 1)).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import {
  PATTERN_METADATA_KEY,
  createSvgPatternDefinition,
  parsePatternDefinition,
  parsePatternMetadata,
  patternDefinitionId,
  serializePatternDefinition,
  type GeometricPatternDefinition,
} from "../../src/maplibre/patternDefinition";

const geometric: GeometricPatternDefinition = {
  kind: "geometric",
  pattern: "hachures",
  size: 16,
  color: "#1f4e79",
  weight: 2,
  angle: 45,
};

describe("pattern definitions", () => {
  it("serializes and hashes equivalent definitions deterministically", () => {
    expect(serializePatternDefinition(geometric)).toBe(serializePatternDefinition({ ...geometric }));
    expect(patternDefinitionId(geometric)).toBe(patternDefinitionId({ ...geometric }));
    expect(patternDefinitionId({ ...geometric, weight: 3 })).not.toBe(patternDefinitionId(geometric));
  });

  it("normalizes SVG defaults", () => {
    expect(createSvgPatternDefinition({ svg: "<svg />" })).toEqual({
      kind: "svg",
      svg: "<svg />",
      tileSize: 288,
      stampSize: 28,
      density: 1.4,
      seed: 1,
      rotationJitterDeg: 0,
      scaleJitter: 0,
      positionJitter: 0.15,
      stagger: true,
    });
  });

  it("rejects malformed untrusted definitions and metadata", () => {
    expect(() => parsePatternDefinition({ ...geometric, size: 0 })).toThrow(/size/);
    expect(() => parsePatternDefinition({ ...geometric, pattern: "unknown" })).toThrow(/pattern/);
    expect(() => parsePatternMetadata({ imageId: "", definition: geometric })).toThrow(/imageId/);
  });

  it("exports the versioned metadata key", () => {
    expect(PATTERN_METADATA_KEY).toBe("maplibre-pattern-fills:v1");
  });
});

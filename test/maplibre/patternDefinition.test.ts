import { describe, expect, it } from "vitest";
import {
  PATTERN_METADATA_KEY,
  createFontPatternDefinition,
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
      distribution: "offset",
      minSpacing: 0,
    });
  });

  it("derives the distribution mode from the stagger option", () => {
    const definition = createSvgPatternDefinition({
      svg: "<svg />",
      stagger: false,
    });
    expect(definition.distribution).toBe("regular");
    expect(definition.stagger).toBe(false);
  });

  it("normalizes font pattern defaults", () => {
    expect(createFontPatternDefinition({ text: "A" })).toEqual({
      kind: "font",
      text: "A",
      fontFamily: "sans-serif",
      fontSize: 18,
      fontWeight: "500",
      fontStyle: "normal",
      letterSpacing: 0,
      horizontalSpacing: 26,
      verticalSpacing: 22,
      rotationDeg: 0,
      stagger: true,
      color: "#000000",
    });
  });

  it("rejects malformed untrusted definitions and metadata", () => {
    expect(() => parsePatternDefinition({ ...geometric, size: 0 })).toThrow(/size/);
    expect(() => parsePatternDefinition({ ...geometric, pattern: "unknown" })).toThrow(/pattern/);
    expect(() => createFontPatternDefinition({ text: "" })).toThrow(/text/);
    expect(() => parsePatternMetadata({ imageId: "", definition: geometric })).toThrow(/imageId/);
    expect(() => parsePatternMetadata({
      imageId: "base",
      definition: geometric,
      variants: [
        { zoom: 12, imageId: "z12", definition: geometric },
        { zoom: 11, imageId: "z11", definition: geometric },
      ],
    })).toThrow(/increasing/);
  });

  it("parses ordered zoom variants", () => {
    expect(parsePatternMetadata({
      imageId: "base",
      definition: geometric,
      variants: [
        { zoom: 10, imageId: "z10", definition: geometric },
        { zoom: 11, imageId: "z11", definition: { ...geometric, size: 20 } },
      ],
    }).variants).toHaveLength(2);
  });

  it("preserves an optional geometric texture pixel ratio", () => {
    expect(parsePatternDefinition({ ...geometric, pixelRatio: 1 })).toEqual({
      ...geometric,
      pixelRatio: 1,
    });
    expect(() => parsePatternDefinition({ ...geometric, pixelRatio: 0 })).toThrow(/pixelRatio/);
  });

  it("preserves a fixed stipple count for ground-scaled variants", () => {
    expect(parsePatternDefinition({ ...geometric, pattern: "stipple", stippleCount: 7 })).toEqual({
      ...geometric,
      pattern: "stipple",
      stippleCount: 7,
    });
    expect(() => parsePatternDefinition({ ...geometric, stippleCount: 1.5 })).toThrow(/stippleCount/);
  });

  it("exports the versioned metadata key", () => {
    expect(PATTERN_METADATA_KEY).toBe("maplibre-pattern-fills:v1");
  });
});

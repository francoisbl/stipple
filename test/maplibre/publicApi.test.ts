import { describe, expect, it } from "vitest";
import * as maplibreApi from "../../src/maplibre";
import * as publicApi from "../../src";

describe("MapLibre public API", () => {
  it("exports pattern helpers without generic line or point styling", () => {
    expect(maplibreApi).toHaveProperty("buildStyleFragment");
    expect(maplibreApi).toHaveProperty("addPatternFill");
    expect(maplibreApi).toHaveProperty("installPatternFills");
    expect(maplibreApi).toHaveProperty("installSvgPatternFill");
    expect(maplibreApi).toHaveProperty("installFontPatternFill");
    expect(maplibreApi).toHaveProperty("createFontPatternTile");

    expect(maplibreApi).not.toHaveProperty("buildLineStyleFragment");
    expect(maplibreApi).not.toHaveProperty("buildIconStyleFragment");
    expect(maplibreApi).not.toHaveProperty("installIconStyles");
    expect(maplibreApi).not.toHaveProperty("addSvgIcon");
  });

  it("exports the canonical Pattern model separately from legacy runtime definitions", () => {
    expect(publicApi.PATTERN_VERSION).toBe(1);
    expect(publicApi).toHaveProperty("parsePattern");
    expect(publicApi).toHaveProperty("serializePattern");
    expect(publicApi).toHaveProperty("patternFromLegacyDefinition");
    expect(publicApi).toHaveProperty("patternToLegacyDefinition");
    expect(publicApi).toHaveProperty("createPlacementLayout");
    expect(publicApi).toHaveProperty("materializePatternPlacement");
    expect(publicApi).toHaveProperty("composeTileImages");
    expect(publicApi).toHaveProperty("createGeometricPatternTile");
    expect(publicApi.PATTERN_SET_VERSION).toBe(1);
    expect(publicApi).toHaveProperty("parsePatternSet");
    expect(publicApi).toHaveProperty("serializePatternSet");
    expect(publicApi).toHaveProperty("createPatternSetExpression");
    expect(publicApi.PATTERN_SEQUENCE_VERSION).toBe(1);
    expect(publicApi).toHaveProperty("parsePatternSequence");
    expect(publicApi).toHaveProperty("serializePatternSequence");
    expect(publicApi).toHaveProperty("materializePatternSequence");
    expect(publicApi).toHaveProperty("interpolateSequenceValue");
    expect(publicApi).toHaveProperty("createPatternSequenceExpression");
    expect(publicApi).toHaveProperty("createPatternTile");
    expect(publicApi).toHaveProperty("installPatternTexture");
    expect(publicApi).toHaveProperty("createPatternStyleFragment");
    expect(publicApi).toHaveProperty("createPatternSetStyleFragment");
    expect(publicApi).toHaveProperty("createPatternSequenceStyleFragment");
    expect(publicApi).toHaveProperty("parseCanonicalPatternMetadata");
    expect(maplibreApi).not.toHaveProperty("parsePattern");
  });
});

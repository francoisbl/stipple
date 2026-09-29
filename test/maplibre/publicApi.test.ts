import { describe, expect, it } from "vitest";
import * as maplibreApi from "../../src/maplibre";

describe("MapLibre public API", () => {
  it("exports pattern helpers without generic line or point styling", () => {
    expect(maplibreApi).toHaveProperty("buildStyleFragment");
    expect(maplibreApi).toHaveProperty("installPatternFills");
    expect(maplibreApi).toHaveProperty("installSvgPatternFill");
    expect(maplibreApi).toHaveProperty("installFontPatternFill");
    expect(maplibreApi).toHaveProperty("createFontPatternTile");

    expect(maplibreApi).not.toHaveProperty("buildLineStyleFragment");
    expect(maplibreApi).not.toHaveProperty("buildIconStyleFragment");
    expect(maplibreApi).not.toHaveProperty("installIconStyles");
    expect(maplibreApi).not.toHaveProperty("addSvgIcon");
  });
});

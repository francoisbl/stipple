import { describe, expect, it } from "vitest";
import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";

describe("zoom variant style", () => {
  it("uses a valid MapLibre expression for persistent pattern variants", () => {
    const errors = validateStyleMin({
      version: 8,
      sources: {
        polygons: {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        },
      },
      layers: [{
        id: "pattern",
        type: "fill",
        source: "polygons",
        paint: {
          "fill-pattern": [
            "step",
            ["zoom"],
            "pattern-z10",
            11,
            "pattern-z11",
            12,
            "pattern-z12",
          ],
          "fill-opacity": 1,
        },
      }],
    });
    expect(errors).toEqual([]);
  });
});

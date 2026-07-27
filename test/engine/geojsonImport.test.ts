import { describe, expect, it } from "vitest";
import { importGeoJsonPolygons } from "../../src/engine/geojsonImport";

const square = [
  [4, 50],
  [4.1, 50],
  [4.1, 50.1],
  [4, 50],
];

describe("importGeoJsonPolygons", () => {
  it("extracts polygons and preserves properties", () => {
    const imported = importGeoJsonPolygons({
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        id: "zone-a",
        properties: { name: "Zone A" },
        geometry: { type: "Polygon", coordinates: [square] },
      }],
    });
    expect(imported.features).toHaveLength(1);
    expect(imported.features[0].id).toBe("zone-a");
    expect(imported.features[0].properties).toEqual({ name: "Zone A" });
  });

  it("splits multipolygons into editable polygon parts", () => {
    const imported = importGeoJsonPolygons({
      type: "Feature",
      properties: { label: "District" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [[square], [[
          [5, 51],
          [5.1, 51],
          [5.1, 51.1],
          [5, 51],
        ]]],
      },
    });
    expect(imported.features).toHaveLength(2);
    expect(imported.features[1].properties.label).toBe("District");
  });

  it("closes valid open rings", () => {
    const imported = importGeoJsonPolygons({
      type: "Polygon",
      coordinates: [[
        [4, 50],
        [4.1, 50],
        [4.1, 50.1],
      ]],
    });
    const ring = imported.features[0].geometry.coordinates[0];
    expect(ring[ring.length - 1]).toEqual(ring[0]);
  });

  it("counts non-polygon features without rejecting valid polygons", () => {
    const imported = importGeoJsonPolygons({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [4, 50] },
        },
        {
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [square] },
        },
      ],
    });
    expect(imported.features).toHaveLength(1);
    expect(imported.ignoredFeatures).toBe(1);
  });

  it("rejects invalid coordinates and excessive feature counts", () => {
    expect(() => importGeoJsonPolygons({
      type: "Polygon",
      coordinates: [[
        [400, 50],
        [4.1, 50],
        [4.1, 50.1],
      ]],
    })).toThrow(/WGS84/);

    expect(() => importGeoJsonPolygons({
      type: "MultiPolygon",
      coordinates: [[square], [square]],
    }, 1)).toThrow(/more than 1/);
  });
});

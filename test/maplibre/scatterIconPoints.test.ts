import { describe, expect, it } from "vitest";
import type { Map as MaplibreMap } from "maplibre-gl";
import {
  scatterIconPoints,
  type PolygonGeometry,
} from "../../src/maplibre/scatterIconPoints";

const identityMap = {
  project: ([lng, lat]: [number, number]) => ({ x: lng, y: lat }),
  unproject: ([x, y]: [number, number]) => ({ lng: x, lat: y }),
} as unknown as MaplibreMap;

describe("scatterIconPoints", () => {
  it("scatters every component of a disjoint MultiPolygon", () => {
    const polygon: PolygonGeometry = {
      type: "MultiPolygon",
      coordinates: [
        [[
          [0, 0],
          [300, 0],
          [300, 300],
          [0, 300],
          [0, 0],
        ]],
        [[
          [1000, 0],
          [1300, 0],
          [1300, 300],
          [1000, 300],
          [1000, 0],
        ]],
      ],
    };

    const result = scatterIconPoints({
      map: identityMap,
      polygon,
      iconRadiusPx: 10,
      density: 4,
      positionJitter: 0,
      stagger: false,
    });

    expect(result.features.some(({ geometry }) => geometry.coordinates[0] < 500)).toBe(true);
    expect(result.features.some(({ geometry }) => geometry.coordinates[0] > 900)).toBe(true);
  });
});

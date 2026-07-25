import { describe, expect, it } from "vitest";
import { scatterPointsInPolygon, type Ring } from "../../src/engine/scatterPoints";

const exterior: Ring = [
  [0, 0],
  [300, 0],
  [300, 300],
  [0, 300],
  [0, 0],
];

describe("scatterPointsInPolygon", () => {
  it("is deterministic and keeps points clear of a hole", () => {
    const hole: Ring = [
      [100, 100],
      [200, 100],
      [200, 200],
      [100, 200],
      [100, 100],
    ];
    const options = {
      radius: 10,
      density: 4,
      seed: "polygon",
      positionJitter: 0,
      stagger: false,
    };

    const points = scatterPointsInPolygon([exterior, hole], options);
    expect(points).toEqual(scatterPointsInPolygon([exterior, hole], options));
    expect(points.length).toBeGreaterThan(0);
    expect(points.every(({ x, y }) => x <= 90 || x >= 210 || y <= 90 || y >= 210)).toBe(true);
  });

  it("validates options that would otherwise cause invalid loops", () => {
    expect(() => scatterPointsInPolygon([exterior], { radius: 10, density: 0 })).toThrow(/density/);
    expect(() => scatterPointsInPolygon([exterior], { radius: 10, samples: 2 })).toThrow(/samples/);
    expect(() => scatterPointsInPolygon([exterior], { radius: 10, scaleJitter: 1 })).toThrow(/scaleJitter/);
  });
});

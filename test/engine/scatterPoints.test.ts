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
    expect(() => scatterPointsInPolygon([exterior], { radius: 10, scaleJitter: 1 })).toThrow(/scaleJitter/);
  });

  it("centres a regular layout inside the polygon bounds", () => {
    const points = scatterPointsInPolygon([exterior], {
      radius: 10,
      density: 4,
      positionJitter: 0,
      stagger: false,
    });
    expect(points).toHaveLength(36);
    expect(points.reduce((sum, point) => sum + point.x, 0) / points.length).toBe(150);
    expect(points.reduce((sum, point) => sum + point.y, 0) / points.length).toBe(150);
  });

  it("creates a deterministic natural layout with minimum spacing", () => {
    const options = {
      radius: 8,
      density: 10,
      distribution: "natural" as const,
      minSpacing: 6,
      seed: "natural-polygon",
    };
    const points = scatterPointsInPolygon([exterior], options);

    expect(points).toEqual(scatterPointsInPolygon([exterior], options));
    expect(points.length).toBeGreaterThan(5);
    expect(Math.min(...points.map(({ x }) => x))).toBeLessThan(40);
    expect(Math.max(...points.map(({ x }) => x))).toBeGreaterThan(260);
    expect(Math.min(...points.map(({ y }) => y))).toBeLessThan(40);
    expect(Math.max(...points.map(({ y }) => y))).toBeGreaterThan(260);
    for (let first = 0; first < points.length; first++) {
      for (let second = first + 1; second < points.length; second++) {
        expect(Math.hypot(
          points[first].x - points[second].x,
          points[first].y - points[second].y,
        )).toBeGreaterThanOrEqual(22);
      }
    }
  });

  it.each(["regular", "offset", "natural"] as const)(
    "limits %s generation to clipped bounds",
    (distribution) => {
      const largeExterior: Ring = [
        [-10_000, -10_000],
        [10_000, -10_000],
        [10_000, 10_000],
        [-10_000, 10_000],
        [-10_000, -10_000],
      ];
      const clipBounds = { minX: -50, minY: -40, maxX: 550, maxY: 440 };
      const points = scatterPointsInPolygon([largeExterior], {
        radius: 8,
        density: 4,
        seed: "clipped",
        distribution,
        positionJitter: distribution === "offset" ? 0.15 : 0,
        clipBounds,
      });

      expect(points.length).toBeGreaterThan(0);
      expect(points.length).toBeLessThan(250);
      expect(points.every(({ x, y }) =>
        x >= clipBounds.minX && x <= clipBounds.maxX &&
        y >= clipBounds.minY && y <= clipBounds.maxY,
      )).toBe(true);
    },
  );
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Map as MaplibreMap } from "maplibre-gl";

const { addSvgIconMock, scatterIconPointsMock } = vi.hoisted(() => ({
  addSvgIconMock: vi.fn(),
  scatterIconPointsMock: vi.fn(),
}));

vi.mock("../../src/maplibre/svgIcon", () => ({
  addSvgIcon: addSvgIconMock,
}));
vi.mock("../../src/maplibre/scatterIconPoints", () => ({
  scatterIconPoints: scatterIconPointsMock,
}));

import { installSvgIconScatter } from "../../src/maplibre/svgIconScatter";

function collection(coordinates: Array<[number, number]>) {
  return {
    type: "FeatureCollection" as const,
    features: coordinates.map(([lng, lat], id) => ({
      type: "Feature" as const,
      id,
      geometry: { type: "Point" as const, coordinates: [lng, lat] as [number, number] },
      properties: { rotation: id, scale: 1 },
    })),
  };
}

function createMapMock() {
  const layers = new Set<string>();
  const source = {
    setData: vi.fn(),
    updateData: vi.fn().mockResolvedValue(undefined),
  };
  let sourceInstalled = false;
  const map = {
    getZoom: vi.fn(() => 12),
    getSource: vi.fn(() => sourceInstalled ? source : undefined),
    addSource: vi.fn(() => { sourceInstalled = true; }),
    getLayer: vi.fn((id: string) => layers.has(id) ? { id } : undefined),
    addLayer: vi.fn((layer: { id: string }) => { layers.add(layer.id); }),
    setLayoutProperty: vi.fn(),
    setPaintProperty: vi.fn(),
  } as unknown as MaplibreMap;
  return { map, source };
}

const options = {
  sourceId: "scatter",
  layerId: "scatter-layer",
  iconId: "scatter-icon",
  polygon: {
    type: "Polygon" as const,
    coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
  },
  svg: "<svg />",
  scaleMode: "screen" as const,
};

beforeEach(() => {
  addSvgIconMock.mockReset();
  addSvgIconMock.mockResolvedValue({ id: "scatter-icon", width: 64, height: 64 });
  scatterIconPointsMock.mockReset();
});

describe("installSvgIconScatter", () => {
  it("updates an existing point source incrementally", async () => {
    const { map, source } = createMapMock();
    scatterIconPointsMock
      .mockReturnValueOnce(collection([[0, 0], [1, 1]]))
      .mockReturnValueOnce(collection([[0.5, 0.5], [1.5, 1.5], [2, 2]]));

    await installSvgIconScatter(map, options);
    await installSvgIconScatter(map, options);

    expect(map.addSource).toHaveBeenCalledWith("scatter", expect.objectContaining({
      maxzoom: 14,
    }));
    expect(source.updateData).toHaveBeenCalledWith({
      add: [expect.objectContaining({ id: 2 })],
      update: [
        expect.objectContaining({ id: 0, newGeometry: expect.any(Object) }),
        expect.objectContaining({ id: 1, newGeometry: expect.any(Object) }),
      ],
    });
    expect(source.setData).not.toHaveBeenCalled();
  });

  it("does not reset the fixed icon-size layout after zoom refreshes", async () => {
    const { map } = createMapMock();
    scatterIconPointsMock.mockReturnValue(collection([[0, 0]]));

    await installSvgIconScatter(map, options);
    await installSvgIconScatter(map, options);

    expect(map.setLayoutProperty).not.toHaveBeenCalled();
    expect(map.setPaintProperty).not.toHaveBeenCalled();
  });
});

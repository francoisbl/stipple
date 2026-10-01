import { describe, expect, it, vi } from "vitest";
import type { Map as MaplibreMap } from "maplibre-gl";
import {
  addPatternFill,
  type PatternFillFragment,
} from "../../src/maplibre/addPatternFill";
import {
  PATTERN_METADATA_KEY,
  type GeometricPatternDefinition,
} from "../../src/maplibre/patternDefinition";

const definition: GeometricPatternDefinition = {
  kind: "geometric",
  pattern: "stipple",
  size: 33,
  color: "#2c6a5b",
  weight: 2,
  angle: 45,
};

function pattern(): PatternFillFragment {
  return {
    layers: [
      {
        id: "<source>__pat",
        type: "fill",
        source: "<source>",
        "source-layer": "<source-layer>",
        paint: { "fill-pattern": "pattern-image", "fill-opacity": 1 },
        metadata: {
          [PATTERN_METADATA_KEY]: { imageId: "pattern-image", definition },
        },
      },
      {
        id: "<source>__line",
        type: "line",
        source: "<source>",
        "source-layer": "<source-layer>",
        paint: { "line-color": "#2c6a5b", "line-width": 1.5 },
      },
    ],
  };
}

function createMapMock(options: {
  styleAvailable?: boolean;
  sourceExists?: boolean;
  existingLayerIds?: string[];
  failLayerId?: string;
} = {}) {
  const layers = new Map<string, unknown>(
    (options.existingLayerIds ?? []).map((id) => [id, { id }]),
  );
  const images = new Set<string>();
  let styleLoad: (() => void) | undefined;

  const addLayer = vi.fn((layer: { id: string }, _beforeId?: string) => {
    if (layer.id === options.failLayerId) throw new Error("addLayer failed");
    layers.set(layer.id, layer);
  });
  const removeLayer = vi.fn((id: string) => layers.delete(id));
  const addImage = vi.fn((id: string) => images.add(id));
  const map = {
    getStyle: vi.fn(() => (options.styleAvailable ?? true ? { version: 8 } : undefined)),
    once: vi.fn((_event: string, listener: () => void) => {
      styleLoad = listener;
    }),
    getSource: vi.fn(() => (options.sourceExists ?? true ? {} : undefined)),
    getLayer: vi.fn((id: string) => layers.get(id)),
    addLayer,
    removeLayer,
    hasImage: vi.fn((id: string) => images.has(id)),
    addImage,
    updateImage: vi.fn(),
    removeImage: vi.fn((id: string) => images.delete(id)),
    triggerRepaint: vi.fn(),
  } as unknown as MaplibreMap;

  return {
    addImage,
    addLayer,
    layers,
    map,
    removeLayer,
    triggerStyleLoad: () => styleLoad?.(),
  };
}

describe("addPatternFill", () => {
  it("installs textures and adds source-resolved GeoJSON layers in order", async () => {
    const { addImage, addLayer, map } = createMapMock();
    const exported = pattern();

    const result = await addPatternFill(map, {
      sourceId: "my-polygons",
      sourceLayer: null,
      pattern: exported,
    });

    expect(result.layerIds).toEqual(["my-polygons__pat", "my-polygons__line"]);
    expect(addImage).toHaveBeenCalledTimes(1);
    expect(addLayer).toHaveBeenCalledTimes(2);
    expect(addLayer.mock.calls[0][0]).toMatchObject({
      id: "my-polygons__pat",
      source: "my-polygons",
    });
    expect(addLayer.mock.calls[0][0]).not.toHaveProperty("source-layer");
    expect(addImage.mock.invocationCallOrder[0]).toBeLessThan(
      addLayer.mock.invocationCallOrder[0],
    );
    expect(exported.layers[0]).toMatchObject({
      id: "<source>__pat",
      source: "<source>",
      "source-layer": "<source-layer>",
    });
  });

  it("applies a vector source-layer and insertion point", async () => {
    const { addLayer, map } = createMapMock({ existingLayerIds: ["labels"] });

    await addPatternFill(map, {
      sourceId: "parcels",
      sourceLayer: "cadastre",
      beforeId: "labels",
      pattern: pattern(),
    });

    expect(addLayer).toHaveBeenCalledTimes(2);
    for (const [layer, beforeId] of addLayer.mock.calls) {
      expect(layer).toMatchObject({ source: "parcels", "source-layer": "cadastre" });
      expect(beforeId).toBe("labels");
    }
  });

  it("waits for style.load before resolving the source", async () => {
    const { addLayer, map, triggerStyleLoad } = createMapMock({ styleAvailable: false });
    const pending = addPatternFill(map, {
      sourceId: "my-polygons",
      pattern: pattern(),
    });

    expect(map.once).toHaveBeenCalledWith("style.load", expect.any(Function));
    expect(addLayer).not.toHaveBeenCalled();
    triggerStyleLoad();
    await pending;
    expect(addLayer).toHaveBeenCalledTimes(2);
  });

  it("fails clearly when the source or insertion layer is missing", async () => {
    const missingSource = createMapMock({ sourceExists: false });
    await expect(addPatternFill(missingSource.map, {
      sourceId: "missing",
      pattern: pattern(),
    })).rejects.toThrow('MapLibre source "missing" was not found');

    const missingBefore = createMapMock();
    await expect(addPatternFill(missingBefore.map, {
      sourceId: "my-polygons",
      beforeId: "missing-labels",
      pattern: pattern(),
    })).rejects.toThrow('MapLibre layer "missing-labels" was not found');
  });

  it("rejects existing layer ids before installing the pattern", async () => {
    const { addImage, addLayer, map } = createMapMock({
      existingLayerIds: ["my-polygons__line"],
    });

    await expect(addPatternFill(map, {
      sourceId: "my-polygons",
      pattern: pattern(),
    })).rejects.toThrow('MapLibre layer "my-polygons__line" already exists');
    expect(addImage).not.toHaveBeenCalled();
    expect(addLayer).not.toHaveBeenCalled();
  });

  it("rolls back layers already added when a later addLayer call fails", async () => {
    const { layers, map, removeLayer } = createMapMock({
      failLayerId: "my-polygons__line",
    });

    await expect(addPatternFill(map, {
      sourceId: "my-polygons",
      pattern: pattern(),
    })).rejects.toThrow("addLayer failed");
    expect(removeLayer).toHaveBeenCalledWith("my-polygons__pat");
    expect(layers.has("my-polygons__pat")).toBe(false);
  });
});

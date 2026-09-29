import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Map as MaplibreMap } from "maplibre-gl";
import { createFontPatternTile, installFontPatternFill } from "../../src/maplibre/fontPattern";

function createMapMock() {
  const images = new Set<string>();
  return {
    map: {
      hasImage: vi.fn((id: string) => images.has(id)),
      addImage: vi.fn((id: string) => images.add(id)),
      updateImage: vi.fn(),
      removeImage: vi.fn((id: string) => images.delete(id)),
      triggerRepaint: vi.fn(),
    } as unknown as MaplibreMap,
  };
}

const fontLoad = vi.fn();

beforeEach(() => {
  fontLoad.mockReset();
  fontLoad.mockResolvedValue([]);
  const context = {
    font: "",
    fillStyle: "",
    textAlign: "left",
    textBaseline: "middle",
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    scale: vi.fn(),
    save: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    measureText: vi.fn((text: string) => ({
      width: text.length * 10,
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2,
    })),
    getImageData: vi.fn((_x: number, _y: number, width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
    })),
  };
  vi.stubGlobal("document", {
    fonts: { load: fontLoad },
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => context,
    }),
  });
});

describe("font patterns", () => {
  it("renders a high-density seamless staggered tile", async () => {
    const tile = await createFontPatternTile({
      imageId: "font",
      text: "A",
      pixelRatio: 2,
    });
    expect(tile.width).toBe(144);
    expect(tile.height).toBe(160);
    expect(tile.data).toHaveLength(144 * 160 * 4);
  });

  it("is a no-op for an already installed equivalent definition", async () => {
    const { map } = createMapMock();
    const options = { imageId: "font", text: "AB", fontSize: 20 };

    await installFontPatternFill(map, options);
    await installFontPatternFill(map, options);

    expect(fontLoad).toHaveBeenCalledTimes(1);
    expect(map.addImage).toHaveBeenCalledTimes(1);
    expect(map.updateImage).not.toHaveBeenCalled();
  });
});

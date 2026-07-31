import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Map as MaplibreMap } from "maplibre-gl";

const { loadSvgImageMock } = vi.hoisted(() => ({
  loadSvgImageMock: vi.fn(),
}));

vi.mock("../../src/maplibre/loadSvgImage", () => ({
  loadSvgImage: loadSvgImageMock,
}));

import { addSvgIcon } from "../../src/maplibre/svgIcon";

function createMapMock() {
  const images = new Set<string>();
  return {
    hasImage: vi.fn((id: string) => images.has(id)),
    addImage: vi.fn((id: string) => images.add(id)),
    updateImage: vi.fn(),
    removeImage: vi.fn((id: string) => images.delete(id)),
  } as unknown as MaplibreMap;
}

beforeEach(() => {
  loadSvgImageMock.mockReset();
  loadSvgImageMock.mockResolvedValue({});
  const context = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn((_x: number, _y: number, width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
    })),
  };
  vi.stubGlobal("document", {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => context,
    }),
  });
});

describe("addSvgIcon", () => {
  it("reuses an unchanged icon", async () => {
    const map = createMapMock();
    const options = { id: "motif", svg: "<svg />", size: 24 };

    await addSvgIcon(map, options);
    await addSvgIcon(map, options);

    expect(loadSvgImageMock).toHaveBeenCalledTimes(1);
    expect(map.addImage).toHaveBeenCalledTimes(1);
    expect(map.updateImage).not.toHaveBeenCalled();
    expect(map.removeImage).not.toHaveBeenCalled();
  });

  it("updates an icon without removing it when its dimensions are unchanged", async () => {
    const map = createMapMock();

    await addSvgIcon(map, { id: "motif", svg: "<svg id='a' />", size: 24 });
    await addSvgIcon(map, { id: "motif", svg: "<svg id='b' />", size: 24 });

    expect(map.addImage).toHaveBeenCalledTimes(1);
    expect(map.updateImage).toHaveBeenCalledTimes(1);
    expect(map.removeImage).not.toHaveBeenCalled();
  });
});

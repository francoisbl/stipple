import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Map as MaplibreMap } from "maplibre-gl";

const { loadSvgImageMock } = vi.hoisted(() => ({
  loadSvgImageMock: vi.fn(),
}));

vi.mock("../../src/maplibre/loadSvgImage", () => ({
  loadSvgImage: loadSvgImageMock,
}));

import { installSvgPatternFill } from "../../src/maplibre/svgPattern";

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  loadSvgImageMock.mockReset();
  loadSvgImageMock.mockResolvedValue({});
  const context = {
    clearRect: vi.fn(),
    save: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
    restore: vi.fn(),
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

describe("installSvgPatternFill", () => {
  it("is a no-op for an already installed equivalent definition", async () => {
    const { map } = createMapMock();
    const options = { imageId: "svg", svg: "<svg />", tileSize: 32 };

    await installSvgPatternFill(map, options);
    await installSvgPatternFill(map, options);

    expect(loadSvgImageMock).toHaveBeenCalledTimes(1);
    expect(map.addImage).toHaveBeenCalledTimes(1);
    expect(map.updateImage).not.toHaveBeenCalled();
  });

  it("updates a changed definition when dimensions stay equal", async () => {
    const { map } = createMapMock();
    await installSvgPatternFill(map, { imageId: "svg", svg: "<svg id='a' />", tileSize: 32 });
    await installSvgPatternFill(map, { imageId: "svg", svg: "<svg id='b' />", tileSize: 32 });

    expect(map.addImage).toHaveBeenCalledTimes(1);
    expect(map.updateImage).toHaveBeenCalledTimes(1);
    expect(map.removeImage).not.toHaveBeenCalled();
  });

  it("does not let an older asynchronous render overwrite a newer one", async () => {
    const { map } = createMapMock();
    const firstImage = deferred<object>();
    const secondImage = deferred<object>();
    loadSvgImageMock
      .mockReturnValueOnce(firstImage.promise)
      .mockReturnValueOnce(secondImage.promise);

    const first = installSvgPatternFill(map, {
      imageId: "svg",
      svg: "<svg id='old' />",
      tileSize: 32,
    });
    const second = installSvgPatternFill(map, {
      imageId: "svg",
      svg: "<svg id='new' />",
      tileSize: 32,
    });

    secondImage.resolve({});
    await second;
    firstImage.resolve({});
    await first;

    expect(map.addImage).toHaveBeenCalledTimes(1);
    expect(map.updateImage).not.toHaveBeenCalled();
  });
});

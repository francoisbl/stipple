import { afterEach, describe, expect, it, vi } from "vitest";
import { tileToDataUrl } from "../../src/engine/tileToDataUrl";

describe("tileToDataUrl", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("writes the tile to a browser canvas and returns its data URL", () => {
    const putImageData = vi.fn();
    const toDataURL = vi.fn((type?: string) => `data:${type ?? "image/png"};base64,test`);
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ putImageData })),
      toDataURL,
    };
    class MockImageData {
      constructor(
        public data: Uint8ClampedArray,
        public width: number,
        public height: number,
      ) {}
    }
    vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });
    vi.stubGlobal("ImageData", MockImageData);

    const tile = {
      width: 1,
      height: 1,
      data: new Uint8Array([31, 78, 121, 255]),
    };
    expect(tileToDataUrl(tile, "image/webp")).toBe("data:image/webp;base64,test");
    expect(canvas.width).toBe(1);
    expect(canvas.height).toBe(1);
    expect(putImageData).toHaveBeenCalledWith(
      expect.objectContaining({ width: 1, height: 1 }),
      0,
      0,
    );
    expect(toDataURL).toHaveBeenCalledWith("image/webp");

    expect(tileToDataUrl(tile)).toBe("data:image/png;base64,test");
    expect(toDataURL).toHaveBeenLastCalledWith();
  });

  it("fails clearly outside a browser canvas environment", () => {
    vi.stubGlobal("document", undefined);
    vi.stubGlobal("ImageData", undefined);
    expect(() => tileToDataUrl({
      width: 1,
      height: 1,
      data: new Uint8Array(4),
    })).toThrow("tileToDataUrl needs a browser canvas");
  });
});

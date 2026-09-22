import { describe, expect, it } from "vitest";
import { createMiniContext } from "../../src/engine/miniContext";

function fillPixel(color: string): [number, number, number, number] {
  const { ctx, toTileImage } = createMiniContext(2);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(1, 1, 2, 0, Math.PI * 2);
  ctx.fill();
  const data = toTileImage().data;
  return [data[0], data[1], data[2], data[3]];
}

describe("createMiniContext color parsing", () => {
  it.each([
    ["#1f4e79", [31, 78, 121, 255]],
    ["#fff", [255, 255, 255, 255]],
    ["#ffffff80", [255, 255, 255, 128]],
    ["rgb(10, 20, 30)", [10, 20, 30, 255]],
    ["rgba(10, 20, 30, 0.5)", [10, 20, 30, 128]],
    ["rgb(10 20 30 / 50%)", [10, 20, 30, 128]],
  ] as const)("parses %s", (color, [r, g, b, a]) => {
    const pixel = fillPixel(color);
    expect(pixel[0]).toBe(r);
    expect(pixel[1]).toBe(g);
    expect(pixel[2]).toBe(b);
    expect(pixel[3]).toBeCloseTo(a, -1);
  });

  it.each(["red", "hsl(120,50%,50%)", "not-a-color", ""])(
    "throws for %j instead of silently rendering it as black",
    (color) => {
      expect(() => fillPixel(color)).toThrow(/unsupported color/i);
    },
  );
});

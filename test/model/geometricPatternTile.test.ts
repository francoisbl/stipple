import { describe, expect, it } from "vitest";
import {
  createGeometricPatternTile,
  parsePattern,
  type GlyphShape,
  type Pattern,
  type PatternFill,
} from "../../src/model";

function pattern(fill: PatternFill, id = "test"): Pattern {
  return parsePattern({
    version: 1,
    kind: "pattern",
    id,
    fill,
    opacity: 1,
    scale: { mode: "screen" },
    render: { pixelRatio: "auto" },
  });
}

function glyphFill(glyph: GlyphShape): PatternFill {
  return {
    family: "glyph",
    glyph,
    color: "#1f4e79",
    size: 8,
    rotation: 0,
    opacity: 1,
    placement: {
      kind: "lattice",
      tileSize: 24,
      spacing: { mode: "explicit", horizontal: 12, vertical: 12 },
      rowOffset: 0.5,
      columnOffset: 0,
      gridAngle: 0,
      positionJitter: 0,
      rotationJitter: 0,
      scaleJitter: 0,
      seed: 1,
    },
  };
}

function lineFill(shape: "straight" | "dashed" | "zigzag" | "wave"): PatternFill {
  return {
    family: "line",
    shape,
    color: "#8d3f2d",
    angle: 32,
    spacing: 12,
    strokeWidth: 1.5,
    opacity: 0.9,
    ...(shape === "dashed" ? { dash: { length: 6, gap: 4 } } : {}),
    ...(shape === "zigzag" || shape === "wave"
      ? { oscillation: { amplitude: 3, wavelength: 18 } }
      : {}),
  };
}

function alpha(tile: ReturnType<typeof createGeometricPatternTile>): number {
  return tile.data.reduce(
    (total, value, index) => index % 4 === 3 ? total + value : total,
    0,
  );
}

function hash(data: Uint8Array): string {
  let value = 0x811c9dc5;
  for (const byte of data) {
    value ^= byte;
    value = Math.imul(value, 0x01000193);
  }
  return (value >>> 0).toString(16).padStart(8, "0");
}

describe("createGeometricPatternTile", () => {
  it("keeps the canonical glyph and line raster output stable", () => {
    const expected = {
      circle: "a9518ac5",
      square: "799c55c5",
      diamond: "1713fdc5",
      plus: "0837ccc5",
      x: "5647fe05",
      triangle: "dba273c5",
      chevron: "cb626ca5",
      straight: "a9dbd805",
      dashed: "b1263bc5",
      zigzag: "3bd8ea15",
      wave: "22c9fced",
    } as const;

    for (const glyph of [
      "circle", "square", "diamond", "plus", "x", "triangle", "chevron",
    ] as const) {
      const tile = createGeometricPatternTile(pattern(glyphFill(glyph), glyph), { pixelRatio: 2 });
      expect(hash(tile.data), glyph).toBe(expected[glyph]);
    }
    for (const shape of ["straight", "dashed", "zigzag", "wave"] as const) {
      const tile = createGeometricPatternTile(pattern(lineFill(shape), shape), { tileSize: 96 });
      expect(hash(tile.data), shape).toBe(expected[shape]);
    }
  });

  it.each([
    "circle", "square", "diamond", "plus", "x", "triangle", "chevron",
  ] as const)("renders deterministic %s glyphs", (glyph) => {
    const design = pattern(glyphFill(glyph), glyph);
    const first = createGeometricPatternTile(design, { pixelRatio: 2 });
    const second = createGeometricPatternTile(design, { pixelRatio: 2 });
    expect(first).toEqual(second);
    expect(first.width).toBe(48);
    expect(first.height).toBe(48);
    expect(alpha(first)).toBeGreaterThan(0);
  });

  it.each(["straight", "dashed", "zigzag", "wave"] as const)(
    "renders deterministic seamless %s line families",
    (shape) => {
      const design = pattern(lineFill(shape), shape);
      const first = createGeometricPatternTile(design, { tileSize: 96 });
      const second = createGeometricPatternTile(design, { tileSize: 96 });
      expect(first).toEqual(second);
      expect(first.width).toBe(96);
      expect(first.height).toBe(96);
      expect(alpha(first)).toBeGreaterThan(0);
      expect(alpha(first)).toBeLessThan(96 * 96 * 255);
    },
  );

  it("wraps glyphs crossing a tile edge", () => {
    const fill = glyphFill("circle");
    if (fill.family !== "glyph" || fill.placement.kind !== "lattice") {
      throw new Error("expected lattice glyph fixture");
    }
    fill.placement.tileSize = 16;
    fill.placement.spacing = { mode: "explicit", horizontal: 16, vertical: 8 };
    const tile = createGeometricPatternTile(pattern(fill));
    const columnAlpha = (x: number) => {
      let total = 0;
      for (let y = 0; y < tile.height; y++) total += tile.data[(y * tile.width + x) * 4 + 3];
      return total;
    };
    expect(columnAlpha(0)).toBeGreaterThan(0);
    expect(columnAlpha(tile.width - 1)).toBe(columnAlpha(0));
  });

  it("renders grid and crosshatch as line composites", () => {
    const grid = pattern({
      family: "composite",
      composition: "grid",
      layers: [
        { ...lineFill("straight"), family: "line", angle: 0 },
        { ...lineFill("straight"), family: "line", angle: 90 },
      ],
    });
    const crosshatch = pattern({
      family: "composite",
      composition: "crosshatch",
      layers: [
        { ...lineFill("straight"), family: "line", angle: 45 },
        { ...lineFill("straight"), family: "line", angle: -45 },
      ],
    });
    const gridTile = createGeometricPatternTile(grid, { tileSize: 96 });
    const crossTile = createGeometricPatternTile(crosshatch, { tileSize: 96 });
    expect(alpha(gridTile)).toBeGreaterThan(0);
    expect(alpha(crossTile)).toBeGreaterThan(0);
    expect(gridTile.data).not.toEqual(crossTile.data);
  });

  it("uses identical pure rendering regardless of a browser-like document global", () => {
    const design = pattern(glyphFill("diamond"));
    const nodeTile = createGeometricPatternTile(design);
    const globals = globalThis as typeof globalThis & { document?: unknown };
    const previous = globals.document;
    Object.defineProperty(globals, "document", {
      configurable: true,
      value: new Proxy({}, {
        get() {
          throw new Error("canonical geometric rendering must not access the DOM");
        },
      }),
    });
    try {
      expect(createGeometricPatternTile(design)).toEqual(nodeTile);
    } finally {
      if (previous === undefined) delete globals.document;
      else Object.defineProperty(globals, "document", { configurable: true, value: previous });
    }
  });

  it("validates unsupported fills, colours, dimensions, and composites", () => {
    expect(() => createGeometricPatternTile(pattern({ family: "solid", color: "#fff" })))
      .toThrow(/fill-color/);
    expect(() => createGeometricPatternTile(pattern({
      ...glyphFill("circle"),
      color: "named-colour",
    } as PatternFill))).toThrow(/Unsupported color/);
    expect(() => createGeometricPatternTile(pattern(lineFill("straight")), { pixelRatio: 0 }))
      .toThrow(/pixelRatio/);

    const first = glyphFill("circle");
    const second = glyphFill("square");
    if (second.family !== "glyph") throw new Error("expected glyph fixture");
    second.placement.tileSize = 32;
    expect(() => createGeometricPatternTile(pattern({
      family: "composite",
      composition: "custom",
      layers: [first, second],
    }))).toThrow(/same tileSize/);
  });
});

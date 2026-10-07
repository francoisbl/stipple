import {
  parsePatternDefinition,
  patternDefinitionId,
  type FontPatternDefinition,
  type GeometricPatternDefinition,
  type PatternDefinition,
  type SvgPatternDefinition,
} from "../maplibre/patternDefinition";
import {
  parsePattern,
  type CompositeFill,
  type GlyphFill,
  type LineFill,
  type Pattern,
  type PatternBackground,
  type PatternOutline,
  type PatternScale,
  type PatternPrimitiveFill,
  type SvgFill,
  type TextFill,
} from "./pattern";

const DEFAULT_STIPPLE_COUNT = 7;

export interface PatternFromLegacyDefinitionOptions {
  id?: string;
  name?: string;
  opacity?: number;
  background?: PatternBackground;
  outline?: PatternOutline;
  scale?: PatternScale;
}

function lineFromGeometric(
  definition: GeometricPatternDefinition,
  angle: number,
  spacing: number,
): LineFill {
  return {
    family: "line",
    shape: "straight",
    color: definition.color,
    angle,
    spacing,
    strokeWidth: definition.weight,
    opacity: 1,
  };
}

function geometricFill(definition: GeometricPatternDefinition): Pattern["fill"] {
  if (definition.pattern === "hachures") {
    return lineFromGeometric(definition, definition.angle, definition.size / 2);
  }
  if (definition.pattern === "cross") {
    return {
      family: "composite",
      composition: "crosshatch",
      layers: [
        lineFromGeometric(definition, definition.angle, definition.size / 2),
        lineFromGeometric(
          definition,
          ((definition.angle + 90 + 45) % 180) - 45,
          definition.size / 2,
        ),
      ],
    };
  }
  if (definition.pattern === "grid") {
    return {
      family: "composite",
      composition: "grid",
      layers: [
        lineFromGeometric(definition, 0, definition.size),
        lineFromGeometric(definition, 90, definition.size),
      ],
    };
  }
  if (definition.pattern === "dots") {
    return {
      family: "glyph",
      glyph: "circle",
      color: definition.color,
      size: definition.weight,
      // Rotation is visually inert for a circle, but retaining it makes the
      // adapter lossless for legacy definitions that happened to carry one.
      rotation: definition.angle,
      opacity: 1,
      placement: {
        kind: "lattice",
        tileSize: definition.size,
        spacing: { mode: "explicit", horizontal: definition.size, vertical: definition.size },
        rowOffset: 0,
        columnOffset: 0,
        gridAngle: 0,
        positionJitter: 0,
        rotationJitter: 0,
        scaleJitter: 0,
        seed: 1,
      },
    };
  }
  const count = definition.stippleCount ?? DEFAULT_STIPPLE_COUNT;
  return {
    family: "glyph",
    glyph: "circle",
    color: definition.color,
    size: definition.weight * 1.2,
    rotation: definition.angle,
    opacity: 1,
    placement: {
      kind: "natural",
      tileSize: definition.size,
      count,
      minSpacing: 0,
      positionJitter: 0,
      rotationJitter: 0,
      scaleJitter: 0,
      seed: `stipple:fixed:${count}`,
    },
  };
}

function svgFill(definition: SvgPatternDefinition): SvgFill {
  const common = {
    tileSize: definition.tileSize,
    minSpacing: definition.minSpacing,
    positionJitter: definition.positionJitter,
    rotationJitter: definition.rotationJitterDeg,
    scaleJitter: definition.scaleJitter,
    seed: definition.seed,
  };
  return {
    family: "svg",
    svg: definition.svg,
    size: definition.stampSize,
    rotation: 0,
    opacity: 1,
    placement: definition.distribution === "natural"
      ? { kind: "natural", density: definition.density, ...common }
      : {
          kind: "lattice",
          tileSize: definition.tileSize,
          spacing: { mode: "density", value: definition.density },
          rowOffset: definition.distribution === "offset" ? 0.5 : 0,
          columnOffset: 0,
          gridAngle: 0,
          positionJitter: definition.positionJitter,
          rotationJitter: definition.rotationJitterDeg,
          scaleJitter: definition.scaleJitter,
          seed: definition.seed,
        },
  };
}

function textFill(definition: FontPatternDefinition): TextFill {
  return {
    family: "text",
    text: definition.text,
    color: definition.color,
    fontFamily: definition.fontFamily,
    fontSize: definition.fontSize,
    fontWeight: definition.fontWeight,
    fontStyle: definition.fontStyle,
    letterSpacing: definition.letterSpacing,
    rotation: definition.rotationDeg,
    opacity: 1,
    placement: {
      kind: "text-lattice",
      horizontalSpacing: definition.horizontalSpacing,
      verticalSpacing: definition.verticalSpacing,
      rowOffset: definition.stagger ? 0.5 : 0,
    },
  };
}

/** Converts a legacy runtime texture recipe into a canonical Pattern. */
export function patternFromLegacyDefinition(
  value: PatternDefinition,
  options: PatternFromLegacyDefinitionOptions = {},
): Pattern {
  const definition = parsePatternDefinition(value);
  const fill = definition.kind === "geometric"
    ? geometricFill(definition)
    : definition.kind === "svg"
      ? svgFill(definition)
      : textFill(definition);
  return parsePattern({
    version: 1,
    kind: "pattern",
    id: options.id ?? patternDefinitionId(definition, "pattern"),
    ...(options.name === undefined ? {} : { name: options.name }),
    fill,
    opacity: options.opacity ?? 1,
    ...(options.background === undefined ? {} : { background: options.background }),
    ...(options.outline === undefined ? {} : { outline: options.outline }),
    scale: options.scale ?? { mode: "screen" },
    render: {
      pixelRatio: definition.kind === "geometric" && definition.pixelRatio !== undefined
        ? definition.pixelRatio
        : "auto",
    },
  });
}

function assertPrimitiveOpacity(fill: PatternPrimitiveFill): void {
  if (fill.opacity !== 1) {
    throw new Error("legacy PatternDefinition cannot represent per-primitive opacity");
  }
}

function geometricBase(pattern: Pattern, color: string): Pick<GeometricPatternDefinition, "color" | "pixelRatio"> {
  return {
    color,
    ...(pattern.render.pixelRatio === "auto" ? {} : { pixelRatio: pattern.render.pixelRatio }),
  };
}

function lineDefinition(pattern: Pattern, fill: LineFill): GeometricPatternDefinition {
  assertPrimitiveOpacity(fill);
  if (fill.shape !== "straight" || fill.dash || fill.oscillation) {
    throw new Error("legacy PatternDefinition can only represent straight line fills");
  }
  return {
    kind: "geometric",
    pattern: "hachures",
    size: fill.spacing * 2,
    ...geometricBase(pattern, fill.color),
    weight: fill.strokeWidth,
    angle: fill.angle,
  };
}

function sameLineStyle(first: LineFill, second: LineFill): boolean {
  return first.shape === "straight" && second.shape === "straight" &&
    first.color === second.color && first.spacing === second.spacing &&
    first.strokeWidth === second.strokeWidth && first.opacity === second.opacity &&
    first.dash === undefined && second.dash === undefined &&
    first.oscillation === undefined && second.oscillation === undefined;
}

function compositeDefinition(pattern: Pattern, fill: CompositeFill): GeometricPatternDefinition {
  if (fill.layers.length !== 2 || fill.layers.some((layer) => layer.family !== "line")) {
    throw new Error("legacy PatternDefinition can only represent grid or crosshatch composites");
  }
  const [first, second] = fill.layers as [LineFill, LineFill];
  assertPrimitiveOpacity(first);
  assertPrimitiveOpacity(second);
  if (!sameLineStyle(first, second)) {
    throw new Error("legacy grid and crosshatch layers must share one line style");
  }
  const angles = [first.angle, second.angle].sort((a, b) => a - b);
  if (fill.composition === "grid" && angles[0] === 0 && angles[1] === 90) {
    return {
      kind: "geometric",
      pattern: "grid",
      size: first.spacing,
      ...geometricBase(pattern, first.color),
      weight: first.strokeWidth,
      angle: 0,
    };
  }
  const expectedSecond = ((first.angle + 90 + 45) % 180) - 45;
  if (fill.composition !== "crosshatch" || second.angle !== expectedSecond) {
    throw new Error("composite is not a legacy crosshatch");
  }
  return {
    kind: "geometric",
    pattern: "cross",
    size: first.spacing * 2,
    ...geometricBase(pattern, first.color),
    weight: first.strokeWidth,
    angle: first.angle,
  };
}

function glyphDefinition(pattern: Pattern, fill: GlyphFill): GeometricPatternDefinition {
  assertPrimitiveOpacity(fill);
  if (fill.glyph !== "circle") {
    throw new Error("legacy PatternDefinition can only represent circle glyphs");
  }
  if (fill.placement.kind === "lattice") {
    const placement = fill.placement;
    if (
      placement.spacing.mode !== "explicit" ||
      placement.spacing.horizontal !== placement.tileSize ||
      placement.spacing.vertical !== placement.tileSize ||
      placement.rowOffset !== 0 || placement.columnOffset !== 0 ||
      placement.gridAngle !== 0 || placement.positionJitter !== 0 ||
      placement.rotationJitter !== 0 || placement.scaleJitter !== 0
    ) {
      throw new Error("circle lattice is not representable as legacy dots");
    }
    return {
      kind: "geometric",
      pattern: "dots",
      size: placement.tileSize,
      ...geometricBase(pattern, fill.color),
      weight: fill.size,
      angle: fill.rotation,
    };
  }
  const count = fill.placement.count;
  if (
    count === undefined || fill.placement.density !== undefined ||
    fill.placement.minSpacing !== 0 || fill.placement.positionJitter !== 0 ||
    fill.placement.rotationJitter !== 0 || fill.placement.scaleJitter !== 0 ||
    fill.placement.seed !== `stipple:fixed:${count}`
  ) {
    throw new Error("natural circle placement is not representable as legacy stipple");
  }
  return {
    kind: "geometric",
    pattern: "stipple",
    size: fill.placement.tileSize,
    ...geometricBase(pattern, fill.color),
    weight: fill.size / 1.2,
    angle: fill.rotation,
    ...(count === DEFAULT_STIPPLE_COUNT ? {} : { stippleCount: count }),
  };
}

function svgDefinition(fill: SvgFill): SvgPatternDefinition {
  assertPrimitiveOpacity(fill);
  if (fill.rotation !== 0) {
    throw new Error("legacy SVG PatternDefinition cannot represent fixed rotation");
  }
  const placement = fill.placement;
  if (placement.kind === "natural") {
    if (placement.density === undefined || placement.count !== undefined) {
      throw new Error("legacy SVG PatternDefinition requires density-based placement");
    }
    return {
      kind: "svg",
      svg: fill.svg,
      tileSize: placement.tileSize,
      stampSize: fill.size,
      density: placement.density,
      seed: placement.seed,
      rotationJitterDeg: placement.rotationJitter,
      scaleJitter: placement.scaleJitter,
      positionJitter: placement.positionJitter,
      stagger: false,
      distribution: "natural",
      minSpacing: placement.minSpacing,
    };
  }
  if (
    placement.spacing.mode !== "density" || placement.columnOffset !== 0 ||
    placement.gridAngle !== 0 || ![0, 0.5].includes(placement.rowOffset)
  ) {
    throw new Error("SVG lattice is not representable by legacy density placement");
  }
  return {
    kind: "svg",
    svg: fill.svg,
    tileSize: placement.tileSize,
    stampSize: fill.size,
    density: placement.spacing.value,
    seed: placement.seed,
    rotationJitterDeg: placement.rotationJitter,
    scaleJitter: placement.scaleJitter,
    positionJitter: placement.positionJitter,
    stagger: placement.rowOffset === 0.5,
    distribution: placement.rowOffset === 0.5 ? "offset" : "regular",
    minSpacing: 0,
  };
}

function fontDefinition(fill: TextFill): FontPatternDefinition {
  assertPrimitiveOpacity(fill);
  if (![0, 0.5].includes(fill.placement.rowOffset)) {
    throw new Error("text row offset is not representable by legacy stagger");
  }
  return {
    kind: "font",
    text: fill.text,
    fontFamily: fill.fontFamily,
    fontSize: fill.fontSize,
    fontWeight: fill.fontWeight,
    fontStyle: fill.fontStyle,
    letterSpacing: fill.letterSpacing,
    horizontalSpacing: fill.placement.horizontalSpacing,
    verticalSpacing: fill.placement.verticalSpacing,
    rotationDeg: fill.rotation,
    stagger: fill.placement.rowOffset === 0.5,
    color: fill.color,
  };
}

/**
 * Converts canonical fills supported by the legacy runtime recipe format.
 * New glyphs, advanced lines, and arbitrary composites fail explicitly.
 */
export function patternToLegacyDefinition(value: Pattern): PatternDefinition {
  const pattern = parsePattern(value);
  const { fill } = pattern;
  if (fill.family === "solid") {
    throw new Error("solid fills do not have a legacy PatternDefinition texture recipe");
  }
  const definition = fill.family === "glyph"
    ? glyphDefinition(pattern, fill)
    : fill.family === "line"
      ? lineDefinition(pattern, fill)
      : fill.family === "composite"
        ? compositeDefinition(pattern, fill)
        : fill.family === "svg"
          ? svgDefinition(fill)
          : fontDefinition(fill);
  return parsePatternDefinition(definition);
}

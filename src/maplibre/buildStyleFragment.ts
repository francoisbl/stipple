import type { BackgroundFillConfig, OutlineConfig, PatternFillConfig } from "./types";

export interface BuildStyleFragmentOptions {
  /** Vector source id, e.g. `"urbanisme.plan_de_secteur"`. */
  source: string;
  /** Source-layer name (the table/layer inside the vector source). */
  sourceLayer: string;
  /** Vector tile URL. Defaults to a `<url>/<source>` placeholder to fill in. */
  sourceUrl?: string;
  bg?: BackgroundFillConfig;
  pattern: PatternFillConfig;
  line?: OutlineConfig;
}

/**
 * Builds the sources+layers fragment for the three-layer stack
 * (tinted background / pattern fill / outline). The pattern's visual
 * parameters are NOT baked into the paint properties — they're carried in
 * `layer.metadata["enhanced:pattern"]` so {@link installPatternFills} can
 * regenerate the exact same texture at runtime via `makeTile`.
 */
export function buildStyleFragment(options: BuildStyleFragmentOptions) {
  const { source, sourceLayer, sourceUrl, bg, pattern, line } = options;
  const layers: Record<string, unknown>[] = [];

  if (bg?.enabled) {
    layers.push({
      id: `${source}__bg`,
      type: "fill",
      source,
      "source-layer": sourceLayer,
      paint: { "fill-color": bg.color, "fill-opacity": bg.opacity },
    });
  }

  if (pattern.pattern === "solid") {
    layers.push({
      id: `${source}__pat`,
      type: "fill",
      source,
      "source-layer": sourceLayer,
      paint: { "fill-color": pattern.color, "fill-opacity": pattern.opacity },
    });
  } else {
    const imageId = `${source}__pat_img`;
    layers.push({
      id: `${source}__pat`,
      type: "fill",
      source,
      "source-layer": sourceLayer,
      paint: { "fill-pattern": imageId, "fill-opacity": pattern.opacity },
      metadata: {
        "enhanced:pattern": {
          type: pattern.pattern,
          tile: pattern.tile,
          color: pattern.color,
          weight: pattern.weight,
          angle: pattern.angle,
          imageId,
        },
      },
    });
  }

  if (line?.enabled) {
    layers.push({
      id: `${source}__line`,
      type: "line",
      source,
      "source-layer": sourceLayer,
      paint: {
        "line-color": line.color,
        "line-width": line.width,
        ...(line.dash.length ? { "line-dasharray": line.dash } : {}),
      },
    });
  }

  return {
    sources: { [source]: { type: "vector", url: sourceUrl ?? `<url>/${source}` } },
    layers,
  };
}

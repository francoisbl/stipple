import type { OutlineConfig } from "./types";

export interface BuildLineStyleFragmentOptions {
  /** Vector source id, e.g. `"urbanisme.voiries"`. */
  source: string;
  /** Source-layer name (the table/layer inside the vector source). */
  sourceLayer: string;
  /** Vector tile URL. Defaults to a `<url>/<source>` placeholder to fill in. */
  sourceUrl?: string;
  line: OutlineConfig;
}

/**
 * Builds the sources+layers fragment for a single line-style layer.
 * `line-dasharray` is a native declarative expression. Unlike fill
 * patterns there's nothing baked into a canvas image, so no metadata or
 * runtime installer is needed for this one.
 */
export function buildLineStyleFragment(options: BuildLineStyleFragmentOptions) {
  const { source, sourceLayer, sourceUrl, line } = options;
  const layers: Record<string, unknown>[] = [];

  if (line.enabled) {
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

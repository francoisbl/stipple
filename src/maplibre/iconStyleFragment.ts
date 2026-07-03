export interface IconStyleConfig {
  /** Raw `<svg>...</svg>` markup. */
  svg: string;
  /** Rendered icon size in px. */
  size: number;
  /** Image id the layer's `icon-image` references — also passed to `addSvgIcon`. */
  imageId: string;
}

export interface BuildIconStyleFragmentOptions {
  /** Vector source id, e.g. `"urbanisme.arbres"`. */
  source: string;
  /** Source-layer name (the table/layer inside the vector source). */
  sourceLayer: string;
  /** Vector tile URL. Defaults to a `<url>/<source>` placeholder to fill in. */
  sourceUrl?: string;
  icon: IconStyleConfig;
  /** Static icon rotation in degrees, if any. */
  rotationDeg?: number;
}

/**
 * Builds the sources+layers fragment for a single SVG point-icon layer.
 * The icon isn't baked into the paint properties — it's carried in
 * `layer.metadata["enhanced:icon"]` so {@link installIconStyles} can
 * rasterize the same icon at runtime via `addSvgIcon`.
 */
export function buildIconStyleFragment(options: BuildIconStyleFragmentOptions) {
  const { source, sourceLayer, sourceUrl, icon, rotationDeg } = options;

  const layers: Record<string, unknown>[] = [
    {
      id: `${source}__icon`,
      type: "symbol",
      source,
      "source-layer": sourceLayer,
      layout: {
        "icon-image": icon.imageId,
        "icon-allow-overlap": true,
        ...(rotationDeg ? { "icon-rotate": rotationDeg } : {}),
      },
      metadata: {
        "enhanced:icon": { svg: icon.svg, size: icon.size, imageId: icon.imageId },
      },
    },
  ];

  return {
    sources: { [source]: { type: "vector", url: sourceUrl ?? `<url>/${source}` } },
    layers,
  };
}

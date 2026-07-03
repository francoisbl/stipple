import type { GeoJSONSource, Map as MaplibreMap } from "maplibre-gl";
import { addSvgIcon } from "./svgIcon";
import type { PolygonGeometry } from "./scatterIconPoints";
import { scatterIconPoints } from "./scatterIconPoints";

export interface InstallSvgIconScatterOptions {
  /** GeoJSON source id to (re)create with the computed scatter points. */
  sourceId: string;
  /** Symbol layer id. */
  layerId: string;
  /** Image id passed to `addSvgIcon` (reused across calls if already installed). */
  iconId: string;
  polygon: PolygonGeometry;
  svg: string;
  /** Rendered icon size in px. Default 32 — also used as the no-cut clearance radius (size / 2). */
  size?: number;
  density?: number;
  seed?: number | string;
  rotationJitterDeg?: number;
  /** +/- scale jitter per icon (fraction of `size`). Default 0. Driven by the symbol layer's native `icon-size`, not by re-rasterizing. */
  scaleJitter?: number;
}

/**
 * The no-cut alternative to {@link installSvgPatternFill}: instead of a
 * repeating texture (which always clips hard at the polygon edge),
 * places whole SVG icons only where they fit entirely inside the polygon.
 *
 * Points are computed in screen pixels at call time, then frozen as
 * lng/lat — so density (icon count per screen area) drifts out of sync
 * with the current zoom unless you recompute after each pan/zoom, e.g.
 * `map.on('moveend', () => installSvgIconScatter(map, options))`.
 */
export async function installSvgIconScatter(map: MaplibreMap, options: InstallSvgIconScatterOptions): Promise<void> {
  const { sourceId, layerId, iconId, polygon, svg, size = 32, density, seed, rotationJitterDeg, scaleJitter } = options;

  // Always (re)rasterize: `size` may have changed since the icon id was last
  // installed, and addSvgIcon's own removeImage+addImage is cheap.
  await addSvgIcon(map, { id: iconId, svg, size });

  const points = scatterIconPoints({ map, polygon, iconRadiusPx: size / 2, density, seed, rotationJitterDeg, scaleJitter });

  const existingSource = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (existingSource) {
    existingSource.setData(points as GeoJSON.GeoJSON);
  } else {
    map.addSource(sourceId, { type: "geojson", data: points as GeoJSON.GeoJSON });
  }

  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: "symbol",
      source: sourceId,
      layout: {
        "icon-image": iconId,
        "icon-rotate": ["get", "rotation"],
        "icon-size": ["get", "scale"],
        "icon-allow-overlap": true,
      },
    });
  }
}

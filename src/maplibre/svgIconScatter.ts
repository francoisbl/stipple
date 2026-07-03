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
}

/**
 * The no-cut alternative to {@link installSvgPatternFill}: instead of a
 * repeating texture (which always clips hard at the polygon edge),
 * places whole SVG icons only where they fit entirely inside the polygon.
 * Bound to the current view — call again after pan/zoom to keep the layout
 * current, same as any screen-space scatter.
 */
export async function installSvgIconScatter(map: MaplibreMap, options: InstallSvgIconScatterOptions): Promise<void> {
  const { sourceId, layerId, iconId, polygon, svg, size = 32, density, seed, rotationJitterDeg } = options;

  if (!map.hasImage(iconId)) {
    await addSvgIcon(map, { id: iconId, svg, size });
  }

  const points = scatterIconPoints({ map, polygon, iconRadiusPx: size / 2, density, seed, rotationJitterDeg });

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
      layout: { "icon-image": iconId, "icon-rotate": ["get", "rotation"], "icon-allow-overlap": true },
    });
  }
}

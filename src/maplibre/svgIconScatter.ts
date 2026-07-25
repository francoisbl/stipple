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
  /** Rendered square icon size in px. Default 32; its circumscribed radius is used for clearance. */
  size?: number;
  density?: number;
  seed?: number | string;
  /** Clearance-circle samples. Default 12; higher is stricter but slower. */
  samples?: number;
  rotationJitterDeg?: number;
  /** +/- scale jitter per icon (fraction of `size`). Default 0. Driven by the symbol layer's native `icon-size`, not by re-rasterizing. */
  scaleJitter?: number;
  /** +/- position jitter within each grid cell, as a fraction of the cell. Default 0.15. 0 = exact grid. */
  positionJitter?: number;
  /** Offset alternate rows by half a cell (quincunx), the classic regular cartographic symbol layout. Default true. */
  stagger?: boolean;
}

/**
 * @experimental
 *
 * The no-cut alternative to {@link installSvgPatternFill}: instead of a
 * repeating texture (which always clips hard at the polygon edge),
 * places SVG icons where a sampled circular-clearance test says they fit
 * inside the polygon. This is an approximation, not an exact geometry
 * guarantee; very narrow or highly concave boundaries can fall between the
 * configured samples.
 *
 * Points are computed in screen pixels at call time, then frozen as
 * lng/lat, so density (icon count per screen area) drifts out of sync
 * with the current zoom unless you recompute after each pan/zoom, e.g.
 * `map.on('moveend', () => installSvgIconScatter(map, options))`.
 */
export async function installSvgIconScatter(map: MaplibreMap, options: InstallSvgIconScatterOptions): Promise<void> {
  const {
    sourceId,
    layerId,
    iconId,
    polygon,
    svg,
    size = 32,
    density,
    seed,
    samples,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger,
  } = options;

  // Always (re)rasterize: `size` may have changed since the icon id was last
  // installed, and addSvgIcon's own removeImage+addImage is cheap.
  await addSvgIcon(map, { id: iconId, svg, size });

  // The circumscribed radius covers every corner of the square icon canvas,
  // including when icon-rotate is used. scatterIconPoints applies each
  // point's scale variation to this radius during its sampled erosion test.
  const points = scatterIconPoints({
    map,
    polygon,
    iconRadiusPx: size / Math.SQRT2,
    density,
    seed,
    samples,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger,
  });

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

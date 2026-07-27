import type {
  GeoJSONSource,
  Map as MaplibreMap,
  SymbolLayerSpecification,
} from "maplibre-gl";
import { addSvgIcon } from "./svgIcon";
import type { PolygonGeometry } from "./scatterIconPoints";
import { scatterIconPoints } from "./scatterIconPoints";
import type { SvgDistributionMode } from "../engine/svgScatterLayout";

export type IconScaleMode = "screen" | "map";

export interface InstallSvgIconScatterOptions {
  /** GeoJSON source id to (re)create with the computed scatter points. */
  sourceId: string;
  /** Symbol layer id. */
  layerId: string;
  /** MapLibre image id used for the rasterized SVG. */
  iconId: string;
  polygon: PolygonGeometry;
  svg: string;
  /** Rendered square icon size in px. Default 32; its circumscribed radius is used for clearance. */
  size?: number;
  density?: number;
  seed?: number | string;
  rotationJitterDeg?: number;
  /** +/- scale jitter per icon (fraction of `size`). Default 0. Driven by the symbol layer's native `icon-size`, not by re-rasterizing. */
  scaleJitter?: number;
  /** +/- position jitter within each grid cell, as a fraction of the cell. Default 0.15. 0 = exact grid. */
  positionJitter?: number;
  /** Offset alternate rows by half a cell (quincunx), the classic regular cartographic symbol layout. Default true. */
  stagger?: boolean;
  /** Regular grid, offset rows, or natural non-overlapping scatter. */
  distribution?: SvgDistributionMode;
  /** Extra minimum gap in screen pixels for natural distribution. */
  minSpacing?: number;
  /** Symbol opacity. Default 1. */
  opacity?: number;
  /** Keep a fixed screen size, or scale with the map from the installation zoom. Default screen. */
  scaleMode?: IconScaleMode;
  /** Keep the complete icon inside the polygon. Default true. */
  edgeClearance?: boolean;
}

/**
 * @experimental
 *
 * The no-cut alternative to {@link installSvgPatternFill}: instead of a
 * repeating texture (which always clips hard at the polygon edge),
 * places SVG icons where exact point-to-segment distances prove that their
 * circular safety envelope fits inside the polygon. The envelope is
 * conservative because it covers the complete rotated square icon canvas.
 *
 * Points are computed in screen pixels at call time, then frozen as
 * lng/lat, so density (icon count per screen area) drifts out of sync
 * with the current zoom unless you recompute after each pan/zoom, e.g.
 * `map.on('zoomend', () => installSvgIconScatter(map, options))`.
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
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger,
    distribution,
    minSpacing,
    opacity = 1,
    scaleMode = "screen",
    edgeClearance = true,
  } = options;
  if (scaleMode !== "screen" && scaleMode !== "map") {
    throw new TypeError("scaleMode must be screen or map");
  }

  // Always rasterize because `size` may have changed since the image id was
  // last installed.
  await addSvgIcon(map, { id: iconId, svg, size });

  // The circumscribed radius covers every corner of the square icon canvas,
  // including when icon-rotate is used. scatterIconPoints applies each
  // point's scale variation to this radius during its exact clearance test.
  const points = scatterIconPoints({
    map,
    polygon,
    iconRadiusPx: edgeClearance ? size / Math.SQRT2 : 0,
    density,
    seed,
    rotationJitterDeg,
    scaleJitter,
    positionJitter,
    stagger,
    distribution,
    minSpacing,
  });

  const existingSource = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (existingSource) {
    existingSource.setData(points as GeoJSON.GeoJSON);
  } else {
    map.addSource(sourceId, { type: "geojson", data: points as GeoJSON.GeoJSON });
  }

  const iconSize = (scaleMode === "map"
    ? [
        "interpolate",
        ["exponential", 2],
        ["zoom"],
        map.getZoom() - 8,
        ["*", ["get", "scale"], 1 / 256],
        map.getZoom(),
        ["get", "scale"],
        map.getZoom() + 8,
        ["*", ["get", "scale"], 256],
      ]
    : ["get", "scale"]) as NonNullable<SymbolLayerSpecification["layout"]>["icon-size"];

  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: "symbol",
      source: sourceId,
      layout: {
        "icon-image": iconId,
        "icon-rotate": ["get", "rotation"],
        "icon-size": iconSize,
        "icon-allow-overlap": true,
      },
      paint: {
        "icon-opacity": opacity,
      },
    });
  } else {
    map.setLayoutProperty(layerId, "icon-size", iconSize);
    map.setPaintProperty(layerId, "icon-opacity", opacity);
  }
}

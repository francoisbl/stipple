import type {
  GeoJSONFeatureDiff,
  GeoJSONSource,
  GeoJSONSourceDiff,
  Map as MaplibreMap,
  SymbolLayerSpecification,
} from "maplibre-gl";
import { addSvgIcon } from "./svgIcon";
import type { PolygonGeometry } from "./scatterIconPoints";
import { scatterIconPoints } from "./scatterIconPoints";
import type { SvgDistributionMode } from "../engine/svgScatterLayout";
import type { PointFeature, PointFeatureCollection } from "./scatterIconPoints";

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
  /** Extra off-screen area retained for fixed-pixel symbols. Computed from icon size and spacing by default. */
  viewportPaddingPx?: number;
}

const installedScatterFeatures = new WeakMap<
  MaplibreMap,
  Map<string, PointFeature[]>
>();
const installedScatterLayerStates = new WeakMap<
  MaplibreMap,
  Map<string, { mode: string; iconId: string; opacity: number }>
>();

function featureDiff(previous: PointFeature, next: PointFeature): GeoJSONFeatureDiff | undefined {
  const [previousLng, previousLat] = previous.geometry.coordinates;
  const [nextLng, nextLat] = next.geometry.coordinates;
  const geometryChanged = previousLng !== nextLng || previousLat !== nextLat;
  const propertiesChanged = previous.properties.rotation !== next.properties.rotation ||
    previous.properties.scale !== next.properties.scale;
  if (!geometryChanged && !propertiesChanged) return undefined;

  return {
    id: next.id,
    ...(geometryChanged ? { newGeometry: next.geometry } : {}),
    ...(propertiesChanged ? {
      addOrUpdateProperties: [
        { key: "rotation", value: next.properties.rotation },
        { key: "scale", value: next.properties.scale },
      ],
    } : {}),
  };
}

function scatterSourceDiff(
  previous: PointFeature[],
  next: PointFeature[],
): GeoJSONSourceDiff {
  const sharedCount = Math.min(previous.length, next.length);
  const update: GeoJSONFeatureDiff[] = [];
  for (let index = 0; index < sharedCount; index++) {
    const diff = featureDiff(previous[index], next[index]);
    if (diff) update.push(diff);
  }

  return {
    ...(previous.length > next.length
      ? { remove: previous.slice(next.length).map(({ id }) => id) }
      : {}),
    ...(next.length > previous.length
      ? { add: next.slice(previous.length) as GeoJSON.Feature[] }
      : {}),
    ...(update.length ? { update } : {}),
  };
}

async function updateScatterSource(
  map: MaplibreMap,
  sourceId: string,
  points: PointFeatureCollection,
): Promise<void> {
  let featuresBySource = installedScatterFeatures.get(map);
  if (!featuresBySource) {
    featuresBySource = new Map();
    installedScatterFeatures.set(map, featuresBySource);
  }

  const previous = featuresBySource.get(sourceId);
  featuresBySource.set(sourceId, points.features);
  const existingSource = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (!existingSource) {
    map.addSource(sourceId, {
      type: "geojson",
      data: points as GeoJSON.GeoJSON,
      // Point geometry does not need high-zoom vector-tile subdivision.
      // Overscaling above z14 preserves positions while reducing rebuild work.
      maxzoom: 14,
    });
    return;
  }

  if (previous && typeof existingSource.updateData === "function") {
    const diff = scatterSourceDiff(previous, points.features);
    if (!diff.add && !diff.remove && !diff.update) return;
    try {
      await existingSource.updateData(diff);
      return;
    } catch {
      // MapLibre versions without an updateable source fall back to replacing
      // the collection. The next refresh can still use the cached features.
    }
  }
  existingSource.setData(points as GeoJSON.GeoJSON);
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
 * with the current zoom unless you recompute after each completed movement,
 * e.g. `map.on('moveend', () => installSvgIconScatter(map, options))`.
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
    viewportPaddingPx,
  } = options;
  if (scaleMode !== "screen" && scaleMode !== "map") {
    throw new TypeError("scaleMode must be screen or map");
  }

  // addSvgIcon reuses an identical installed image.
  await addSvgIcon(map, { id: iconId, svg, size });

  const approximateSpacing = density && density > 0
    ? 100 / Math.sqrt(density)
    : 100;
  const screenPadding = viewportPaddingPx ?? Math.max(
    192,
    size * (1 + (scaleJitter ?? 0)) * 2,
    approximateSpacing * 2,
  );

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
    viewportPaddingPx: scaleMode === "screen" ? screenPadding : undefined,
  });

  await updateScatterSource(map, sourceId, points);

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

  let layerStates = installedScatterLayerStates.get(map);
  if (!layerStates) {
    layerStates = new Map();
    installedScatterLayerStates.set(map, layerStates);
  }
  const layerModeSignature = scaleMode === "screen"
    ? "screen"
    : `map:${map.getZoom()}`;

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
        "icon-ignore-placement": true,
        "symbol-z-order": "source",
      },
      paint: {
        "icon-opacity": opacity,
      },
    });
    layerStates.set(layerId, {
      mode: layerModeSignature,
      iconId,
      opacity,
    });
  } else {
    const previousLayer = layerStates.get(layerId);
    if (previousLayer?.mode !== layerModeSignature) {
      map.setLayoutProperty(layerId, "icon-size", iconSize);
    }
    if (previousLayer?.iconId !== iconId) {
      map.setLayoutProperty(layerId, "icon-image", iconId);
    }
    if (previousLayer?.opacity !== opacity) {
      map.setPaintProperty(layerId, "icon-opacity", opacity);
    }
    layerStates.set(layerId, {
      mode: layerModeSignature,
      iconId,
      opacity,
    });
  }
}

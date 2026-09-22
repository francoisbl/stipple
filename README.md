# Stipple

A focused library and visual playground for designing, generating, and
installing fill patterns in
[MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/).

**[Playground source](./demo/index.html)**

## What it does

MapLibre's `fill-pattern` needs an image installed via `map.addImage`. This
package generates that image for you:

- **Geometric fills:** solid, stipple, hachures, crosshatch, grid, dots.
  Angle, weight, colour and tile size (the density control; any pixel size
  works, seamless either way) are all configurable.
- **SVG scatter fills:** turn any SVG into a tileable fill by repeating it
  into a large seamless meta-tile. Choose a regular grid, offset rows, or a
  seamless natural distribution with minimum spacing. Everything is seeded,
  so the same seed always reproduces the same texture. The demo ships 26
  recolourable samples on a consistent 64 by 64 canvas, organized into
  vegetation, trees, agriculture, water, terrain, land use, and shapes. Swap
  in your own SVG the same way, or paste/upload one directly in the demo.
- **Experimental whole-symbol scatter:** a repeating `fill-pattern` texture always clips
  hard at the polygon boundary, so a stamp near the edge shows only its
  overlapping part. `installSvgIconScatter` is the alternative: it places
  SVG icons where exact boundary distances prove that their circular safety
  envelope fits inside the polygon. Screen-sized symbols can be recomputed on
  `map.on('zoomend', ...)`; map-sized symbols keep their positions and scale
  with the map. This API may change before `1.0`.
- Flash-free live updates: colour/weight/angle changes call `updateImage`
  when the tile dimensions haven't changed, and fall back to
  `removeImage`/`addImage` only when they have.
- **Polygon style fragments:** `buildStyleFragment` creates the pattern layer
  with an optional background and outline so the fill can be previewed and
  exported in context.

Patterns run through MapLibre's public image and `fill-pattern` APIs. The
package does not fork or patch MapLibre.

## Install

```sh
npm install stipple-maplibre maplibre-gl
```

`maplibre-gl` is a peer dependency (`>=4 <7`). CI checks MapLibre GL JS 4, 5,
and 6 independently.

## Minimal example

```js
import maplibregl from "maplibre-gl";
import { buildStyleFragment, installPatternFills } from "stipple-maplibre";

// 1. Describe the pattern once. This only carries *which* pattern to use;
//    the angle/density/weight are not baked into MapLibre paint properties;
//    they live in versioned layer metadata so they can be regenerated later.
const fragment = buildStyleFragment({
  source: "zoning",
  sourceLayer: "zoning",
  bg: { enabled: true, color: "#9ec5e8", opacity: 0.35 },
  pattern: { pattern: "hachures", tile: 16, color: "#1f4e79", opacity: 1, weight: 2, angle: 45 },
  line: { enabled: true, color: "#1f4e79", width: 1.5, dash: [] },
});

const map = new maplibregl.Map({
  container: "map",
  style: {
    version: 8,
    sources: { ...fragment.sources, zoning: { type: "vector", url: "<your-tile-url>" } },
    layers: [...fragment.layers],
  },
});

// 2. After the style loads, bake the actual texture and install it.
map.on("load", async () => {
  await installPatternFills(map, map.getStyle());
});
```

The generated fragment is a **runtime-extended MapLibre style**, not a
standalone style. MapLibre, Maputnik, and MapLibre Native do not interpret the
`maplibre-pattern-fills:v1` metadata themselves; this package must install the
referenced images after the style loads. Legacy `enhanced:pattern` geometric
metadata remains readable during the `0.x` migration. The v1 payload is
documented by
[`schema/pattern-metadata-v1.schema.json`](./schema/pattern-metadata-v1.schema.json).

SVG markup embedded in metadata becomes part of the style document. Treat
styles containing user-provided SVG as untrusted input and apply the same
content and CSP policy as the rest of your application.

SVG decoding uses a temporary `blob:` image URL. A restrictive Content
Security Policy must therefore allow `blob:` in `img-src`. The package targets
modern evergreen browsers and Node.js 18 or newer; SVG rasterization itself is
browser-only, while the geometric engine also runs in Node.

Textures installed in MapLibre follow the display pixel ratio, capped at 2,
without changing their layout size. `syncPatternTexture` and
`installSvgPatternFill` also accept an explicit `pixelRatio` when an
application needs to control the raster cost.

The pure `scalePatternForZoom` helper keeps pattern scale independent from
feature dimensions. Screen mode holds visual size and spacing in pixels. Map
mode treats them as reference values at a chosen zoom, then doubles both for
every zoom level in. Optical scale normalizes SVG artwork with different
amounts of internal whitespace, while per-motif legibility limits provide a
controlled fade at small scales.

Map-scaled style exports contain ordered image variants in the existing v1
metadata. `installPatternFills` installs every required image, and the layer
selects the appropriate one with a zoom expression. A static JSON and PNG
bundle can use the same structure without a runtime dependency.

For applications that replace styles repeatedly, create one observer and
dispose it with the map or owning component:

```js
import { observePatternFills } from "stipple-maplibre/maplibre";

const patterns = observePatternFills(map);
map.on("load", () => patterns.refresh());

// Later:
patterns.dispose();
```

### SVG scatter fill

```js
import { installSvgPatternFill } from "stipple-maplibre";

await installSvgPatternFill(map, {
  imageId: "grass_pattern",
  svg: grassSvgMarkup, // raw `<svg>...</svg>` string
  seed: "parcel-42",   // deterministic: same seed, same layout
  distribution: "natural",
  minSpacing: 4,
});

map.addLayer({
  id: "grass-fill", type: "fill", source: "landcover",
  paint: { "fill-pattern": "grass_pattern" },
});
```

## Demo / playground

[`demo/index.html`](./demo/index.html) is a single, buildless HTML file with a
control panel for composing polygon fill patterns. Open or drop GeoJSON,
GeoPackage, GeoParquet, zipped or loose Shapefile data, FlatGeobuf, KML, GPX,
GML, DXF and other common vector formats. Files are read locally in the browser
and projected to WGS84 when the source format provides its CRS. Polygon and
MultiPolygon geometries are supported, with each polygon part available for
individual styling. Non-polygon features are ignored. The background and
outline controls provide visual context and are included in style fragment
exports. Bring your own SVG by pasting markup or uploading a `.svg` file. The
playground loads the library from `dist/index.global.js`, so run
`npm run build` once, then open the file directly:

Imports are limited to 200 MB per dataset and the first 48 polygon parts. The
specialised readers are loaded only when their format is opened.

```sh
npm install
npm run build
open demo/index.html
```

For Cloudflare Pages, use `npm run build:site` as the build command and
`_site` as the output directory.

## Package layout

- `src/engine`: the pure pattern rasterizer (`makeTile`), scatter-point
  geometry (`scatterPointsInPolygon`), and zoom-based pattern scaling
  (`scalePatternForZoom`). No DOM or MapLibre dependency: uses the real
  Canvas 2D API in the browser and a small pure-JS software rasterizer in Node,
  so it runs identically in both.
- `src/maplibre`: the MapLibre integration: `syncPatternTexture`,
  `buildStyleFragment`, `installPatternFills`, `observePatternFills`, and
  `installSvgPatternFill`.
- `demo/`: the playground UI described above.

## Entry points

- `stipple-maplibre`: backwards-compatible complete `0.x` surface.
- `stipple-maplibre/core`: pure raster and layout engine.
- `stipple-maplibre/maplibre`: stable MapLibre integration.
- `stipple-maplibre/experimental`: whole-stamp scattering for
  reducing clipping at polygon boundaries.

## Migrating legacy pattern metadata

`installPatternFills` still reads the former `enhanced:pattern` shape, so
existing styles keep working during `0.x`. Newly generated fragments use:

```json
{
  "metadata": {
    "maplibre-pattern-fills:v1": {
      "imageId": "mpf_12345678",
      "definition": {
        "kind": "geometric",
        "pattern": "hachures",
        "size": 16,
        "color": "#1f4e79",
        "weight": 2,
        "angle": 45
      }
    }
  }
}
```

Regenerate a fragment with `buildStyleFragment` to migrate automatically.
Unknown metadata versions are ignored; malformed v1 metadata throws an
actionable validation error.

## Status

`v0.1.0`: functional, not yet published to npm. See the project's issue
tracker / release notes for what's left before a `1.0`.

The planned correctness, API, distribution, and stabilization work is tracked
in [ROADMAP.md](./ROADMAP.md).

Repository maintenance and release guidance:
[CONTRIBUTING.md](./CONTRIBUTING.md),
[CHANGELOG.md](./CHANGELOG.md),
[SECURITY.md](./SECURITY.md), and
[RELEASING.md](./RELEASING.md).

## License

MIT. See [LICENSE](./LICENSE).

# maplibre-pattern-fills

Textured fill patterns, tiled SVG scatter patterns, and SVG point icons for
[MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/). Patterns are
generated at runtime without pre-baked sprite sheets.

**[Playground source](./demo/index.html)**

## What it does

MapLibre's `fill-pattern` needs an image installed via `map.addImage`. This
package generates that image for you:

- **Geometric fills:** solid, stipple, hachures, crosshatch, grid, dots.
  Angle, weight, colour and tile size (the density control; any pixel size
  works, seamless either way) are all configurable.
- **SVG scatter fills:** turn any SVG into a tileable fill by repeating it
  into a large seamless meta-tile. Defaults to a regular, lightly staggered
  grid (`stagger`), the classic cartographic symbol layout used for
  official map fills such as orchards and marshes. Raise
  `rotationJitterDeg`/`scaleJitter`/`positionJitter` for a more
  natural, organic look instead (grass, foliage...). Everything is seeded,
  so the same seed always reproduces the same texture. The demo ships 14
  sample fills across four categories (vegetation, trees, water, shapes) as
  a starting point. Swap in your own SVG the same way, or paste/upload one
  directly in the demo.
- **SVG point icons:** rasterize an SVG once via `addImage` and use it as
  `icon-image` on a `symbol` layer, with the icon's rendered scale controlled
  by MapLibre's native `icon-size` (no re-rasterization needed).
- **Experimental no-cut icon scatter:** a repeating `fill-pattern` texture always clips
  hard at the polygon boundary, so a stamp near the edge shows only its
  overlapping part. `installSvgIconScatter` is the alternative: it places
  SVG icons where a cheap sampled "erosion" test determines that their square
  canvas fits inside the polygon. This is an approximation rather than an
  exact geometry guarantee, especially for narrow or highly concave shapes.
  Points are computed in screen pixels and frozen as lng/lat, so recompute on
  `map.on('moveend', ...)` to keep density consistent as the user zooms
  (the demo does this). This API may change before `1.0`.
- Flash-free live updates: colour/weight/angle changes call `updateImage`
  when the tile dimensions haven't changed, and fall back to
  `removeImage`/`addImage` only when they have.
- **One style builder per geometry type:** `buildStyleFragment` (polygon:
  background/pattern/outline), `buildLineStyleFragment` (line), and
  `buildIconStyleFragment` + `installIconStyles` (point, metadata-driven like
  the pattern fills). Each produces exactly the layer(s) for that geometry
  type, so a style.json export is never an ambiguous mix.

Everything runs through MapLibre's public API (`addImage`, `updateImage`,
`fill-pattern`, `line-dasharray`, `symbol`). It does not fork or patch
MapLibre.

## Install

```sh
npm install maplibre-pattern-fills maplibre-gl
```

`maplibre-gl` is a peer dependency (`>=4 <7`). CI checks MapLibre GL JS 4, 5,
and 6 independently.

## Minimal example

```js
import maplibregl from "maplibre-gl";
import { buildStyleFragment, installPatternFills } from "maplibre-pattern-fills";

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

For applications that replace styles repeatedly, create one observer and
dispose it with the map or owning component:

```js
import { observePatternFills } from "maplibre-pattern-fills/maplibre";

const patterns = observePatternFills(map);
map.on("load", () => patterns.refresh());

// Later:
patterns.dispose();
```

### SVG scatter fill

```js
import { installSvgPatternFill } from "maplibre-pattern-fills";

await installSvgPatternFill(map, {
  imageId: "grass_pattern",
  svg: grassSvgMarkup, // raw `<svg>...</svg>` string
  seed: "parcel-42",   // deterministic: same seed, same layout
});

map.addLayer({
  id: "grass-fill", type: "fill", source: "landcover",
  paint: { "fill-pattern": "grass_pattern" },
});
```

### SVG point icon

```js
import { addSvgIcon } from "maplibre-pattern-fills";

const { id } = await addSvgIcon(map, { id: "tree-icon", svg: treeSvgMarkup, size: 28 });

map.addLayer({
  id: "trees", type: "symbol", source: "trees",
  layout: { "icon-image": id, "icon-size": 1 },
});
```

### Line style (exportable, no runtime install needed)

```js
import { buildLineStyleFragment } from "maplibre-pattern-fills";

const fragment = buildLineStyleFragment({
  source: "roads", sourceLayer: "roads",
  line: { enabled: true, color: "#7c3d1c", width: 2, dash: [2, 4] },
});
// line-dasharray is a native declarative expression. The fragment's
// layer is ready to use as-is, nothing to regenerate at runtime.
```

### Point icon style (exportable + regenerable, like the pattern fills)

```js
import { buildIconStyleFragment, installIconStyles } from "maplibre-pattern-fills";

const fragment = buildIconStyleFragment({
  source: "trees", sourceLayer: "trees",
  icon: { svg: treeSvgMarkup, size: 28, imageId: "tree_icon_img" },
});
// ...paste fragment.sources/layers into your style, then:
map.on("load", () => installIconStyles(map, map.getStyle()));
```

## Demo / playground

[`demo/index.html`](./demo/index.html) is a single, buildless HTML file with a
full control panel for composing polygon fills, line styles, and point
icons live on test features. Pick a geometry type at the top (Polygon /
Line / Point); the panel and the style.json / integration-snippet export
always match that one type exactly, so it's never ambiguous what you're
shipping. Bring your own SVG by pasting markup or uploading a `.svg` file
wherever a sample picker has a "Custom SVG…" option. It loads the library
from the built `dist/index.global.js`, so run `npm run build` once, then
open the file directly (no server needed):

```sh
npm install
npm run build
open demo/index.html
```

For Cloudflare Pages, use `npm run build:site` as the build command and
`_site` as the output directory.

## Package layout

- `src/engine`: the pure pattern rasterizer (`makeTile`) and the scatter-point
  geometry (`scatterPointsInPolygon`). No DOM or MapLibre dependency: uses the
  real Canvas 2D API in the browser and a small pure-JS software rasterizer in
  Node, so it runs identically in both.
- `src/maplibre`: the MapLibre integration: `syncPatternTexture`,
  `buildStyleFragment`, `buildLineStyleFragment`, `buildIconStyleFragment`,
  `installPatternFills`, `installIconStyles`, `installSvgPatternFill`,
  `installSvgIconScatter`, `addSvgIcon`, `scatterIconPoints`.
- `demo/`: the playground UI described above.

## Entry points

- `maplibre-pattern-fills`: backwards-compatible complete `0.x` surface.
- `maplibre-pattern-fills/core`: pure raster and layout engine.
- `maplibre-pattern-fills/maplibre`: stable MapLibre integration.
- `maplibre-pattern-fills/experimental`: sampled whole-icon scattering.

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

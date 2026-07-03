# maplibre-pattern-fills

Textured fill patterns, tiled SVG scatter patterns, and SVG point icons for
[MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) — generated at
runtime from a small canvas engine, no pre-baked sprite sheets required.

**[Live demo / playground →](./demo/index.html)**

## What it does

MapLibre's `fill-pattern` needs an image installed via `map.addImage`. This
package generates that image for you:

- **Geometric fills** — solid, stipple, hachures, crosshatch, grid, dots.
  Angle, weight, colour and tile size (the density control — any pixel size
  works, seamless either way) are all configurable.
- **SVG scatter fills** — turn any SVG into an organic, tileable fill (grass,
  foliage, water, shapes...) by scattering many rotation/scale-jittered copies
  of it into a large seamless meta-tile. The jitter is seeded, so the same
  seed always reproduces the same texture. The demo ships 14 sample fills
  across four categories (vegetation, trees, water, shapes) as a starting
  point — swap in your own SVG the same way.
- **SVG point icons** — rasterize an SVG once via `addImage` and use it as
  `icon-image` on a `symbol` layer, with the icon's rendered scale controlled
  by MapLibre's native `icon-size` (no re-rasterization needed).
- Flash-free live updates: colour/weight/angle changes call `updateImage`
  when the tile dimensions haven't changed, and fall back to
  `removeImage`/`addImage` only when they have.

Everything runs through MapLibre's public API (`addImage`, `updateImage`,
`fill-pattern`, `line-dasharray`, `symbol`) — nothing forks or patches
MapLibre itself.

## Install

```sh
npm install maplibre-pattern-fills maplibre-gl
```

`maplibre-gl` is a peer dependency (`>=3.0.0`).

## Minimal example

```js
import maplibregl from "maplibre-gl";
import { buildStyleFragment, installPatternFills } from "maplibre-pattern-fills";

// 1. Describe the pattern once. This only carries *which* pattern to use —
//    the angle/density/weight are not baked into the style.json, they live
//    in layer.metadata["enhanced:pattern"] so they can be regenerated later.
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
map.on("load", () => installPatternFills(map, map.getStyle()));
```

### SVG scatter fill

```js
import { installSvgPatternFill } from "maplibre-pattern-fills";

await installSvgPatternFill(map, {
  imageId: "grass_pattern",
  svg: grassSvgMarkup, // raw `<svg>...</svg>` string
  seed: "parcel-42",   // deterministic — same seed, same layout
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

## Demo / playground

[`demo/index.html`](./demo/index.html) is a single, buildless HTML file — a
full control panel for composing patterns live on test polygons, with
style.json / integration-snippet / preset export. It loads the library from
the built `dist/index.global.js`, so run `npm run build` once, then open the
file directly (no server needed):

```sh
npm install
npm run build
open demo/index.html
```

## Package layout

- `src/engine` — the pure pattern rasterizer (`makeTile`). No DOM or MapLibre
  dependency: uses the real Canvas 2D API in the browser, and a small pure-JS
  software rasterizer in Node, so it runs identically in both.
- `src/maplibre` — the MapLibre integration: `syncPatternTexture`,
  `buildStyleFragment`, `installPatternFills`, `installSvgPatternFill`,
  `addSvgIcon`.
- `demo/` — the playground UI described above.

## Status

`v0.1.0` — functional, not yet published to npm. See the project's issue
tracker / release notes for what's left before a `1.0`.

## License

MIT — see [LICENSE](./LICENSE).

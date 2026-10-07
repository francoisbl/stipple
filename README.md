<picture><source media="(prefers-color-scheme: dark)" srcset="./assets/stipple-wordmark-dark.svg"><source media="(prefers-color-scheme: light)" srcset="./assets/stipple-wordmark-light.svg"><img alt="Stipple" src="./assets/stipple-wordmark-light.svg" width="154" height="40"></picture>

**Pattern-based polygon styling for
[MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/).**

Design customizable fill patterns, build categorized styles, and create
graduated pattern sequences—then export them for MapLibre GL JS.

<p><a href="https://stipple.pages.dev/"><strong>Open playground</strong></a> · <a href="https://www.npmjs.com/package/stipple-maplibre">npm</a></p>

<a href="https://stipple.pages.dev/"><img width="1456" alt="Stipple playground showing a categorized polygon style built from distinct fill patterns" src="./assets/readme/playground-categorized.png" /></a>

## Three ways to style polygon data

| Single pattern | Categorized | Graduated |
| --- | --- | --- |
| Design and customize patterns independently. | Assign distinct patterns to discrete categories. | Create ordered pattern sequences from numeric values. |

Choose how your data should be styled, then design the patterns: use one
pattern independently, organize patterns by category, or turn a pattern into a
visual scale.

## Design patterns visually

Build patterns from hatches, dots, grids, marks, text, or SVG symbols and adjust
their visual properties directly on the map. The same pattern engine powers
all three styling modes.

<img width="1456" alt="Stipple single-pattern designer showing an SVG palm fill with a custom background and outline" src="./assets/readme/playground-single.png" />

### Pattern types

- Line fills: horizontal, vertical, diagonal and reverse-diagonal hatches,
  crosshatch, grid, dashed hatch, zigzag, and wave.
- Mark fills: dots and dense stipple, squares, diamonds, crosses, X marks,
  triangles, and chevrons in regular, offset, or brick-like arrangements.
- Font fills: repeat a letter, an abbreviation, or a short bit of text.
- SVG fills: repeat one of the bundled symbols or bring your own SVG.
- A background colour and polygon outline to go with the pattern.

<table>
  <tr>
    <td align="center" width="25%">
      <img src="./assets/readme/example-solid.png" alt="Polygon with a solid fill" width="100%"><br>
      <sub><em>Solid</em></sub>
    </td>
    <td align="center" width="25%">
      <img src="./assets/readme/example-stipple.png" alt="Polygon filled with a stipple pattern" width="100%"><br>
      <sub><em>Stipple</em></sub>
    </td>
    <td align="center" width="25%">
      <img src="./assets/readme/example-hatches.png" alt="Polygon filled with diagonal hatches" width="100%"><br>
      <sub><em>Hatches</em></sub>
    </td>
    <td align="center" width="25%">
      <img src="./assets/readme/example-dots.png" alt="Polygon filled with a regular dot pattern" width="100%"><br>
      <sub><em>Dots</em></sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="25%">
      <img src="./assets/readme/example-grid.png" alt="Polygon filled with a grid pattern" width="100%"><br>
      <sub><em>Grid</em></sub>
    </td>
    <td align="center" width="25%">
      <img src="./assets/readme/example-font-fill.png" alt="Polygon filled with repeated text" width="100%"><br>
      <sub><em>Font fill</em></sub>
    </td>
    <td align="center" width="25%">
      <img src="./assets/readme/example-svg-symbol.png" alt="Polygon filled with a bundled SVG motif" width="100%"><br>
      <sub><em>SVG fill</em></sub>
    </td>
    <td align="center" width="25%">
      <img src="./assets/readme/example-custom-svg.png" alt="Polygon filled with a custom SVG motif" width="100%"><br>
      <sub><em>Custom</em></sub>
    </td>
  </tr>
</table>

Adjust colour, opacity, spacing, weight, angle, scale, foreground, background,
outline, and layout. Font fills also let you choose the typeface, style, and
letter spacing. SVG fills can use regular rows, offset rows, or a more
natural-looking seeded distribution.

The playground includes 34 SVG motifs covering vegetation, trees,
agriculture, water, terrain, land use, and simple shapes. The same seed always
produces the same arrangement.

## Build categorized styles

Create a distinct pattern for each category while keeping full control over
every class. Each entry can use its own pattern type, colours, parameters,
background, outline, placement, or SVG symbol and can be refined independently
while the complete qualitative palette remains visible on the map.

## Create graduated pattern sequences

Create sequential or diverging pattern scales by varying density, weight, or
opacity across classes. Change the number of classes while preserving a
coherent low-to-high visual progression.

<img width="1456" alt="Stipple playground showing a five-class graduated dot sequence on a regional country map" src="./assets/readme/playground-graduated.png" />

`PatternSequence` and `PatternSet` describe styling—not statistical
classification or map layout. Applications bind existing numeric classes or
category values to the generated patterns; Stipple does not calculate Jenks,
quantiles, or equal intervals.

## From visual design to MapLibre

Design visually, then export the configuration you need for MapLibre GL JS:

```text
Single pattern  polygon       → custom pattern
Categorized     residential   → dots
                industrial    → hatch
                forest        → SVG
Graduated       0–20          → sparse
                20–40         → medium
                40–60         → dense
```

The copied code uses `addPatternFill`, which waits for the map style, installs
the generated textures, adapts the exported layers to an existing source, and
adds them in order:

```js
import { addPatternFill } from "stipple-maplibre";

await addPatternFill(map, {
  sourceId: "my-polygons",
  sourceLayer: null, // Use the source-layer name for vector tiles.
  pattern: exportedPattern,
});
```

The source must already exist in the map. An optional `beforeId` places the
pattern layers below an existing label or symbol layer. The returned
`layerIds` list contains every layer added to the map.

## What problem does it solve?

MapLibre provides the primitives for patterned polygon fills, but designing
and managing a complete pattern-based cartographic style still requires a lot
of manual work. Each repeated image must be created, made seamless, registered
with `addImage`, kept at an appropriate resolution, and connected to the right
style expressions and layers.

Stipple provides the visual workflow on top of those primitives. It generates
textures from compact pattern parameters, draws them in the browser, installs
them through MapLibre's public API, and keeps categorized and graduated styles
coherent as they evolve.


## But can’t I just ask AI to do this?

Fair point. But Stipple can fit into that workflow.

Whether you build maps by writing code yourself or with the help of AI,
the playground gives you direct visual control over the result.
Instead of refining a pattern through a back-and-forth series of prompts
and corrections, you can adjust it interactively until it looks exactly
the way you want.

Once you're happy with the result, export the corresponding MapLibre code
or Stipple configuration and use it directly in your project, or feed it
back into your AI-assisted workflow.

## Run the playground

[Open the Stipple playground](https://stipple.pages.dev/). No installation or
coding is required. Start with the included sample polygons or import your own
data, customize the fills visually, and export the result. Files are processed
locally in the browser and are not uploaded to a server.

The built-in previews match the design task: Single pattern uses one neutral
polygon, Graduated uses a regional country map, and Categorized uses complete
contiguous administrative coverage for close pattern comparison. These are
preview geometries only; imported features remain ordinary user data.

The compact transfer icon beside the active map-legend swatch copies the
complete selected style—including its pattern, background, outline, placement,
and scale—between Single pattern and individual Categorized entries without
changing geometry or category keys.

### Run it locally

From a clone of this repository, install the development dependencies and
build Stipple:

```sh
npm install
npm run build
```

The repository itself is the `stipple-maplibre` package, so you do not need to
install it separately. Then open the local
[`demo/index.html`](./demo/index.html) file in your browser.

## Supported file formats

The basic input is GeoJSON. The playground also understands GeoPackage,
GeoParquet, Shapefile (loose or zipped), FlatGeobuf, KML, GPX, GML, DXF, and
other common vector formats.

Polygon and MultiPolygon features are supported. If a file contains several
polygon parts, each one can have its own style. Non-polygon features are
ignored.

Imports are limited to 200 MB per dataset and the first 64 polygon parts.
Formats with a known CRS are reprojected to WGS84 in the browser.

## Installation

Install the package alongside MapLibre GL JS:

```sh
npm install stipple-maplibre maplibre-gl
```

`maplibre-gl` is a peer dependency. Stipple currently supports MapLibre GL JS
versions 4, 5, and 6.

## Basic usage

This example adds a 45-degree hatch texture to an existing GeoJSON source
called `my-polygons`:

```js
import maplibregl from "maplibre-gl";
import { syncPatternTexture } from "stipple-maplibre";

const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/liberty",
});

map.on("load", () => {
  syncPatternTexture(map, {
    imageId: "my-hatches",
    pattern: "hachures",
    size: 33,
    color: "#2c6a5b",
    weight: 2,
    angle: 45,
  });

  map.addLayer({
    id: "my-pattern-layer",
    type: "fill",
    source: "my-polygons",
    paint: {
      "fill-pattern": "my-hatches",
      "fill-opacity": 1,
    },
  });
});
```

The generated texture is registered as `my-hatches`, and that same name is
used in the layer's `fill-pattern` property.

## SVG patterns

Pass Stipple an SVG string and choose how the symbols should be spread out:

```js
import { installSvgPatternFill } from "stipple-maplibre";

await installSvgPatternFill(map, {
  imageId: "grass-pattern",
  svg: grassSvgMarkup,
  seed: "parcel-42",
  distribution: "natural",
  minSpacing: 4,
});
```

You can then use `grass-pattern` as the layer's `fill-pattern`. The playground
also accepts pasted SVG markup or an uploaded `.svg` file.

## Font patterns

Font fills are rasterized after the requested web font is ready:

```js
import { installFontPatternFill } from "stipple-maplibre";

await installFontPatternFill(map, {
  imageId: "vineyard-letters",
  text: "V",
  fontFamily: "'Source Serif 4', serif",
  fontSize: 20,
  fontStyle: "italic",
  horizontalSpacing: 26,
  verticalSpacing: 22,
  rotationDeg: -20,
  stagger: true,
  color: "#315f2f",
});
```

Use `vineyard-letters` as the layer's `fill-pattern` in the same way.

## Export and runtime integration

The playground can export:

- ready-to-use MapLibre code;
- a reusable Stipple configuration;
- a static bundle containing style layers, generated pattern images, and an
  integration helper.

For lower-level, code-driven styles, `buildStyleFragment` creates the
background, pattern, and outline layers together. The resulting style metadata
carries the pattern recipe. `installPatternFills` reads those recipes and
installs every texture the map needs:

```js
import { installPatternFills } from "stipple-maplibre";

map.on("load", async () => {
  await installPatternFills(map, map.getStyle());
});
```

If your application replaces styles while it is running, use one observer to
keep the patterns installed:

```js
import { observePatternFills } from "stipple-maplibre";

const patterns = observePatternFills(map);
map.on("load", () => patterns.refresh());

// When the map or component is removed:
patterns.dispose();
```

## Are exported styles normal MapLibre JSON?

The layers are normal MapLibre layers, with one additional runtime step:
generated textures cannot live inside plain style JSON. Stipple stores their
recipes in versioned layer metadata, then recreates and installs the images
when the style loads.

MapLibre, Maputnik, and MapLibre Native do not interpret the
`maplibre-pattern-fills:v1` metadata on their own. Call `installPatternFills`,
or export the generated PNG bundle when a runtime dependency is not suitable.

The metadata format is documented in
[`schema/pattern-metadata-v1.schema.json`](./schema/pattern-metadata-v1.schema.json).

## Rendering details

### Zoom behaviour

Two scaling modes are available:

- **Screen scale** keeps the pattern the same visual size on screen.
- **Ground scale** makes it behave like something printed on the map itself.

Ground-scaled patterns use several texture sizes and let MapLibre blend
between them. That avoids the sudden jump you normally get at integer zoom
levels. Stipple patterns also keep the same deterministic layout while they
scale, so dots and symbols do not reshuffle on every zoom.

By default, textures follow the display pixel ratio, capped at 2x. You can
also force a softer 1x texture when that suits the map better.

### Symbols at polygon edges

A repeating `fill-pattern` is always clipped at the polygon boundary. That is
how MapLibre works.

Stipple also includes an experimental `installSvgIconScatter` API. Instead of
drawing one repeating texture, it places individual symbols only where the
whole icon fits inside the polygon. It is useful when clipped trees, houses,
or other recognizable symbols would look wrong. This API may still change
before version 1.0.

## Security and browser support

If you let people provide their own SVG, treat that markup as untrusted input.
Apply the same validation and Content Security Policy rules you use elsewhere
in your application.

SVG rasterization uses a temporary `blob:` image URL, so a restrictive CSP
must allow `blob:` in `img-src`.

The package targets modern evergreen browsers and Node.js 18 or newer. SVG
and font rasterization need a browser; the geometric pattern engine also runs
in Node.

## Repository structure

- `src/engine` draws patterns, scatters points, and calculates zoom scaling.
  It has no MapLibre dependency.
- `src/maplibre` connects those pieces to MapLibre GL JS.
- `demo/` contains the playground, its motif catalogue, and its interface.
- `schema/` contains the exported metadata schema.

## Project status

Version `0.3.0` is available on
[npm](https://www.npmjs.com/package/stipple-maplibre). The whole-symbol
scatter API is the only part currently marked experimental.

## Licence

MIT. See [LICENSE](./LICENSE).

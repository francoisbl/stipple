# Stipple

Pattern fills for MapLibre, without making a pile of tiny PNGs by hand.

Stipple can fill a polygon with dots, hatches, letters, or repeating SVG
symbols. Pick a pattern in the playground, adjust it until it looks right,
then export the MapLibre code.

[MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) does the rendering.
Stipple makes the texture.

<!-- Add a wide screenshot of the playground here. -->

## What problem does it solve?

MapLibre already has a `fill-pattern` property. It repeats an image inside a
polygon, which is great — but first you need to make that image, make it tile
cleanly, keep it sharp on Retina screens, add it to the map, and update it when
the style changes.

Stipple takes care of that part.

You describe the pattern you want. Stipple draws the tile in the browser,
installs it with MapLibre's public `addImage` API, and gives your layer the
right `fill-pattern` value. It does not patch or fork MapLibre.

## What can I make with it?

- Geometric fills: solid, stipple, hatches, crosshatch, grid, and dots.
- Font fills: repeat a letter, an abbreviation, or a short bit of text.
- SVG fills: repeat one of the bundled symbols or bring your own SVG.
- A background colour and polygon outline to go with the pattern.

You can change the colour, opacity, spacing, weight, angle, scale, and layout.
Font fills also let you choose the typeface, style, and letter spacing. SVG
fills can use regular rows, offset rows, or a more natural-looking seeded
distribution.

The playground includes 34 SVG motifs covering vegetation, trees,
agriculture, water, terrain, land use, and simple shapes. The same seed always
produces the same arrangement.

<!-- Add a small gallery here: geometric, font, SVG, and custom SVG. -->

## Do I need to write code to try it?

No. The playground is there for that.

It lets you draw or import polygons, try every fill type, switch basemaps, and
export the result. Files stay in the browser; the demo does not upload them to
a server.

To run it locally:

```sh
npm install
npm run build
```

Then open [`demo/index.html`](./demo/index.html) in a browser.

<!-- Add a short GIF or three-step screenshot sequence of the playground here. -->

## What can I drop into the playground?

GeoJSON works, of course. The playground also understands GeoPackage,
GeoParquet, Shapefile (loose or zipped), FlatGeobuf, KML, GPX, GML, DXF, and
other common vector formats.

Polygon and MultiPolygon features are supported. If a file contains several
polygon parts, each one can have its own style. Non-polygon features are
ignored.

Imports are limited to 200 MB per dataset and the first 64 polygon parts.
Formats with a known CRS are reprojected to WGS84 in the browser.

## What happens when I zoom the map?

You choose.

- **Screen scale** keeps the pattern the same visual size on screen.
- **Ground scale** makes it behave like something printed on the map itself.

Ground-scaled patterns use several texture sizes and let MapLibre blend
between them. That avoids the sudden jump you normally get at integer zoom
levels. Stipple patterns also keep the same deterministic layout while they
scale, so dots and symbols do not reshuffle on every zoom.

By default, textures follow the display pixel ratio, capped at 2x. You can
also force a softer 1x texture when that suits the map better.

## How do I install it?

```sh
npm install stipple-maplibre maplibre-gl
```

`maplibre-gl` is a peer dependency. Stipple currently supports MapLibre GL JS
versions 4, 5, and 6.

## What is the smallest useful example?

This adds a 45-degree hatch texture to an existing GeoJSON source called
`my-polygons`:

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
    size: 16,
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

That is the basic idea: make a texture, give it a name, and use that name in
`fill-pattern`.

## Can I repeat an SVG instead?

Yes. Pass Stipple an SVG string and choose how the symbols should be spread
out:

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

## Can I repeat text too?

Yes. Font fills are rasterized after the requested web font is ready:

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

## What does the playground export?

It can give you MapLibre code, a reusable Stipple configuration, a style
document, or a bundle containing the generated pattern images.

For code-driven styles, `buildStyleFragment` creates the background, pattern,
and outline layers together. `installPatternFills` reads the Stipple metadata
after the style loads and installs every texture it needs.

```js
import { installPatternFills } from "stipple-maplibre";

map.on("load", async () => {
  await installPatternFills(map, map.getStyle());
});
```

If your app replaces styles while it is running, use one observer instead:

```js
import { observePatternFills } from "stipple-maplibre";

const patterns = observePatternFills(map);
map.on("load", () => patterns.refresh());

// When the map or component is removed:
patterns.dispose();
```

## Is the exported style just normal MapLibre JSON?

Mostly, with one small extra step.

The layers are normal MapLibre layers, but generated textures cannot live
inside plain style JSON. Stipple stores their recipes in versioned layer
metadata, then recreates and installs the images when the style loads.

That means MapLibre, Maputnik, and MapLibre Native will not interpret the
`maplibre-pattern-fills:v1` metadata on their own. Call
`installPatternFills`, or export the generated PNG bundle when a runtime
dependency is not suitable.

The metadata format is documented in
[`schema/pattern-metadata-v1.schema.json`](./schema/pattern-metadata-v1.schema.json).

## Can symbols stay whole at polygon edges?

A repeating `fill-pattern` is always clipped at the polygon boundary. That is
how MapLibre works.

Stipple also includes an experimental `installSvgIconScatter` API. Instead of
drawing one repeating texture, it places individual symbols only where the
whole icon fits inside the polygon. It is useful when clipped trees, houses,
or other recognizable symbols would look wrong. This API may still change
before version 1.0.

## Is there anything security-related to know?

If you let people provide their own SVG, treat that markup as untrusted input.
Apply the same validation and Content Security Policy rules you use elsewhere
in your application.

SVG rasterization uses a temporary `blob:` image URL, so a restrictive CSP
must allow `blob:` in `img-src`.

The package targets modern evergreen browsers and Node.js 18 or newer. SVG
and font rasterization need a browser; the geometric pattern engine also runs
in Node.

## Where is everything in the repository?

- `src/engine` draws patterns, scatters points, and calculates zoom scaling.
  It has no MapLibre dependency.
- `src/maplibre` connects those pieces to MapLibre GL JS.
- `demo/` contains the playground, its motif catalogue, and its interface.
- `schema/` contains the exported metadata schema.

## Is it ready to use?

Version `0.1.0` is functional and being prepared for its first npm release.
The whole-symbol scatter API is the only part currently marked experimental.

## What is the licence?

MIT. See [LICENSE](./LICENSE).

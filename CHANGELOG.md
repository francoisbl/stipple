# Changelog

All notable changes are documented here. This project follows Semantic
Versioning once it reaches `1.0.0`; breaking changes remain possible during
`0.x` and will include migration notes.

## Unreleased

### Added

- Vitest suite covering deterministic rasterization, SVG wrapping, polygon
  holes, disjoint multipolygons, metadata, image lifecycle, and package entry
  points.
- Versioned `PatternDefinition` and `maplibre-pattern-fills:v1` metadata.
- JSON schema for v1 metadata.
- Deterministic image IDs and definition deduplication.
- `core`, `maplibre`, and `experimental` package entry points.
- Disposable `observePatternFills` style-reload restoration helper.
- CI across Node 18, 22, and 24 and MapLibre GL JS 4, 5, and 6.
- Automated package inspection, Cloudflare Pages build, Dependabot, and npm
  trusted-publishing workflow.
- Regular, offset, and natural SVG distribution modes. Natural distribution
  uses deterministic best-candidate spacing and supports a minimum gap.
- Eleven cartographic SVG motifs for agriculture, wetlands, terrain, and land
  use, plus an illustrative grape motif, bringing the demo library to 26
  recolourable samples.
- Screen-fixed and map-scaled modes for experimental whole-symbol scatter.
- A sample library organized into concrete thematic families.

### Changed

- MapLibre GL JS support is explicitly `>=4 <7`.
- Generated geometric and SVG textures now follow the display pixel ratio,
  capped at 2, while preserving their layout size.
- SVG scatter grids now use exact periodic spacing instead of clustering near
  meta-tile seams, with a larger default tile to make repetition less visible.
- Experimental whole-icon scatter uses exact distance to every exterior and
  interior polygon edge. Its natural mode respects icon envelopes and minimum
  spacing.
- The playground now focuses on polygon fills, uses MapLibre GL JS 6, and
  exports SVG pattern metadata.
- Generic line styling and point-symbol helpers are no longer public APIs.
- Equivalent geometric and SVG installations are idempotent.
- SVG rendering prevents stale asynchronous work from replacing newer images.
- Whole-icon scattering is explicitly experimental and uses the icon canvas's
  circumscribed clearance radius.
- Ambiguous grass, vineyard, orchard, crop, shrub, gravel, boulder, scree,
  reed, and ripple motifs have been redrawn or simplified for legibility at
  the playground's default stamp size.

### Fixed

- Wrapped SVG copies now preserve the logical stamp's rotation and scale.
- Disjoint `MultiPolygon` components are scattered independently.
- Invalid density, jitter, radius, distribution, and spacing options now fail
  early.

### Compatibility

- Legacy `enhanced:pattern` geometric metadata remains readable during `0.x`.

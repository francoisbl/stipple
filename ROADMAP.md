# Roadmap

This roadmap turns the initial technical audit into a sequence of releasable
milestones. The project should stay focused on one clear promise:

> Generate robust cartographic surface patterns for MapLibre GL JS, at runtime
> or ahead of time, without requiring a hand-built sprite sheet.

The playground may include background and outline controls to preview a fill in
context. General line styling and point-symbol helpers stay outside the public
API. The no-cut scatter API is experimental until its geometry guarantees are
made exact and tested.

## Product boundaries

### Stable core

- Geometric pattern rasterization.
- SVG-based repeating patterns.
- Deterministic seeded generation.
- MapLibre image installation and updates.
- Runtime metadata needed to recreate generated images.

### Supporting utilities

- Style fragment builders where they directly support pattern fills.
- SVG icon rasterization when it is shared by the pattern pipeline.

### Experimental

- Whole-icon scattering inside polygons.
- View-dependent point generation.
- Approximate polygon erosion.

### Out of scope for the core package

- General-purpose line styling.
- A complete MapLibre style editor.
- A replacement for Maputnik or sprite-generation tools such as Spreet.
- Geometry editing or general symbol-layer management.

## Release strategy

- `0.2.0`: make the current claims correct and testable.
- `0.3.0`: stabilize the public API and metadata format.
- `0.4.0`: make distribution, documentation, and adoption credible.
- `1.0.0`: commit to compatibility and long-term maintenance.

Breaking changes are acceptable before `1.0.0`, but every breaking release
must include a short migration guide.

## Milestone 0.2.0: Correctness baseline

Goal: eliminate the known correctness gaps before promoting or publishing the
library.

### P0: Test foundation

- Add Vitest and a `npm test` script.
- Add unit tests for seeded randomness and the software rasterizer.
- Add pixel-boundary tests for every geometric pattern.
- Add deterministic-output tests for identical and different seeds.
- Add polygon tests covering holes, concave boundaries, disjoint
  multipolygons, small polygons, and empty input.
- Add a browser test layer for SVG decoding and Canvas behavior.

Acceptance criteria:

- `npm run typecheck`, `npm test`, and `npm run build` all pass locally.
- Every bug fixed below first has a failing regression test.
- Tests do not depend on network access.

### P0: Fix SVG tile wrapping

- Generate rotation and scale once per logical stamp.
- Reuse those exact transformations for every wrapped copy.
- Calculate the wrapping margin from the transformed stamp bounds.
- Validate `tileSize`, `stampSize`, `density`, jitter, and scale ranges.
- Document how large generated images affect MapLibre's image atlas.

Acceptance criteria:

- Opposite tile edges match for all supported jitter combinations.
- The same options and seed produce byte-identical output in the same runtime.
- Invalid or dangerous values fail with actionable errors.

### P0: Fix Polygon and MultiPolygon handling

- Preserve the hierarchy of each polygon and its holes.
- Scatter each component independently.
- Avoid treating all rings as a single even/odd ring collection.
- Add explicit antimeridian limitations or handling.

Acceptance criteria:

- Every component of a disjoint `MultiPolygon` can receive points.
- Holes never receive points.
- Results remain deterministic.

### P0: Correct the no-cut contract

- [x] Mark the API and documentation as experimental.
- [x] Replace sampled clearance with exact point-to-edge distances for every
  exterior and interior polygon boundary.
- [x] Account for the transformed icon bounds with a conservative
  circumscribed radius.
- Keep the feature experimental while its zoom and projection behavior is
  evaluated in production use.

Acceptance criteria:

- Documentation states the actual guarantee and its limitations.
- Tests cover rotated/scaled square icons and narrow concave polygons.

### P1: Align angle behavior and types

Choose one of these contracts:

1. Restrict hatches to `-45 | 0 | 45 | 90`; or
2. Implement arbitrary angles correctly.

Arbitrary angles are preferred because they improve differentiation from
existing hatch utilities.

Acceptance criteria:

- The TypeScript type, documentation, playground, and renderer expose the same
  supported angle range.
- Seam tests cover non-cardinal angles if arbitrary angles are implemented.

## Milestone 0.3.0: Public API and format

Goal: turn the proof of concept into a coherent library whose API can evolve
predictably.

Implementation status:

- [x] Add a versioned, validated `PatternDefinition` model.
- [x] Generate deterministic image IDs and deduplicate definitions.
- [x] Preserve legacy geometric metadata during the `0.x` migration.
- [x] Document runtime-extended versus standalone styles.
- [x] Publish `core`, `maplibre`, and `experimental` entry points.
- [x] Make geometric and SVG installation idempotent.
- [x] Prevent stale SVG renders from overwriting newer definitions.
- [x] Restore registered images after style reloads with a disposable observer.
- [x] Remove generic line and point-symbol helpers from the public API.
- [x] Focus the playground on polygon fill patterns.
- [ ] Publish the `0.3.0` release.

### P0: Define a versioned pattern specification

- Introduce a public `PatternDefinition` discriminated union.
- Separate geometric and SVG pattern options.
- Add a versioned metadata key, for example
  `maplibre-pattern-fills:v1`.
- Validate metadata before installing images.
- Deduplicate identical generated images using a canonical definition hash.

Acceptance criteria:

- All runtime installers consume the same definition model.
- Unknown metadata versions are ignored or rejected predictably.
- Equivalent definitions reuse one MapLibre image.

### P1: Clarify runtime versus portable exports

- Rename or document “style export” as a runtime-extended MapLibre style.
- State that custom metadata is not interpreted by MapLibre, Maputnik, or
  MapLibre Native without this library.
- Add a JSON schema for the extension.
- Decide how precompiled assets will be represented.

Acceptance criteria:

- No documentation implies that metadata-only styles are standalone.
- A user can determine from the README exactly what must run after style load.

### P1: Simplify package scope

- Keep pattern-oriented style builders.
- Keep generic line styling out of the public API.
- Keep basic SVG point helpers internal to the experimental scatter.
- Move no-cut scatter under an `experimental` export path.

Suggested exports:

```text
stipple-maplibre
stipple-maplibre/core
stipple-maplibre/maplibre
stipple-maplibre/experimental
```

Acceptance criteria:

- The primary import surface communicates the product's pattern-fill focus.
- Experimental APIs cannot be mistaken for stable guarantees.

### P1: Image lifecycle

- Handle style reloads and missing images explicitly.
- Avoid unnecessary `removeImage` / `addImage` cycles.
- Define collision behavior for image, layer, and source IDs.
- Provide cleanup/disposal where event listeners are installed.
- Prevent stale asynchronous SVG renders from overwriting newer options.

Acceptance criteria:

- Rapid updates cannot install an obsolete render.
- Reapplying or replacing a style can restore all registered pattern images.
- Repeated installation is idempotent.

## Milestone 0.4.0: Distribution and adoption

Goal: make the project credible for external users and eligible for community
catalogues.

Implementation status:

- [x] Add CI on Node 18, 22, and 24.
- [x] Add a MapLibre GL JS 4/5/6 compatibility matrix.
- [x] Inspect entry points, leaked files, and size from the packed tarball.
- [x] Add npm trusted-publishing and provenance workflow.
- [x] Add a Cloudflare Pages build command.
- [x] Upgrade the playground to MapLibre GL JS 6.
- [x] Add Dependabot for npm and GitHub Actions.
- [x] Add contribution, changelog, security, release, issue, and PR guidance.
- [ ] Connect the repository to Cloudflare Pages.
- [ ] Bootstrap the package on npm and configure `publish.yml` as its trusted publisher.
- [ ] Publish the `0.4.0` release.

### P0: Continuous integration

- Run typecheck, tests, build, and package validation on pull requests.
- Test supported MapLibre majors in a compatibility matrix.
- Add dependency update automation.
- Add a package-size check.

Initial compatibility target:

```text
maplibre-gl >=4 <7
```

Expand this only after automated compatibility tests prove it.

### P0: npm release

- Confirm package name availability.
- Add `prepack` or `prepublishOnly` verification.
- Add npm provenance through GitHub Actions.
- Verify ESM, CommonJS, TypeScript, and direct browser consumption from the
  packed tarball.
- Publish an initial prerelease before `0.4.0`.

### P1: Public documentation and demo

- Deploy the playground to Cloudflare Pages.
- Split the 1,000-line demo into maintainable modules or a small Vite app.
- Add examples for thematic accessibility, urban planning, vegetation, and
  QGIS/ArcGIS-style hatches.
- Add API reference pages and copy-paste examples.
- Add visual regression screenshots.
- Add a comparison section covering native `fill-pattern`, Spreet,
  Maputnik, and `maplibre_symbol_utils`.

### P1: Repository health

- Add `CONTRIBUTING.md`, `CHANGELOG.md`, `SECURITY.md`, and issue templates.
- Add release notes and migration notes.
- Add badges only after the corresponding automation exists.
- Document browser support and CSP requirements for SVG blob URLs.

Acceptance criteria:

- A new user can install the package and reproduce an example without reading
  source code.
- The live demo uses the latest supported MapLibre major.
- The package has at least one documented real-world integration.

## Milestone 1.0.0: Stability commitment

Goal: provide a small, dependable surface-pattern library suitable for
production use.

- Freeze the stable public API.
- Publish the compatibility and deprecation policy.
- Reach meaningful branch coverage on core algorithms.
- Complete performance benchmarks for tile sizes and SVG stamp counts.
- Provide a migration guide from all `0.x` metadata formats.
- Resolve the long-term status of experimental scatter.
- Demonstrate style restoration, high-DPI rendering, and CSP compatibility.
- Add the project to `awesome-maplibre`.
- Propose it for the MapLibre GL JS plugins page once npm, demo, tests, and
  maintenance signals are established.

## Issue backlog

The following issue titles can be created directly from this roadmap.

| Priority | Issue | Size | Milestone |
| --- | --- | --- | --- |
| P0 | Add Vitest and the first deterministic raster tests | M | 0.2.0 |
| P0 | Preserve transforms across wrapped SVG stamp copies | M | 0.2.0 |
| P0 | Add pixel-level seamlessness regression tests | M | 0.2.0 |
| P0 | Preserve Polygon hierarchy when scattering MultiPolygons | M | 0.2.0 |
| P0 | Mark icon scatter experimental and correct its guarantee | S | 0.2.0 |
| P1 | Validate public numeric options and SVG input | M | 0.2.0 |
| P1 | Implement arbitrary-angle seamless hatches | L | 0.2.0 |
| P0 | Introduce a versioned `PatternDefinition` schema | L | 0.3.0 |
| P1 | Deduplicate generated images by definition hash | M | 0.3.0 |
| P1 | Make image installation idempotent across style reloads | L | 0.3.0 |
| P1 | Move generic and experimental APIs to secondary exports | M | 0.3.0 |
| P0 | Add GitHub Actions compatibility matrix | M | 0.4.0 |
| P0 | Validate the packed npm artifact in CI | S | 0.4.0 |
| P1 | Deploy the playground to Cloudflare Pages | M | 0.4.0 |
| P1 | Add repository health and contribution documents | S | 0.4.0 |
| P2 | Add build-time PNG/sprite generation | L | 1.0.0 |
| P2 | Prepare awesome-maplibre and MapLibre plugin submissions | S | 1.0.0 |

## Recommended first iteration

Do not begin with API redesign. The first iteration should establish evidence
and fix the two known correctness defects:

- [x] Add the test runner and deterministic engine tests.
- [x] Add an SVG wrapping regression test.
- [x] Fix wrapped SVG transforms.
- [x] Add a disjoint `MultiPolygon` regression test.
- [x] Fix polygon hierarchy.
- [x] Correct the no-cut wording and expose it as experimental.
- [ ] Add browser-level pixel seam coverage.
- [ ] Release `0.2.0`.

This sequence keeps the diff reviewable and ensures later refactors are
protected by tests.

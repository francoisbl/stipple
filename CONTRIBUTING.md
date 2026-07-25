# Contributing

Thanks for helping improve `maplibre-pattern-fills`.

## Development setup

Requirements:

- Node.js 18 or newer.
- npm with lockfile support.

```sh
npm ci
npm run validate
```

The validation command runs the tests, TypeScript checks, all distribution
builds, and a dry-run inspection of the npm package.

## Project boundaries

The stable core is deliberately focused on cartographic surface patterns:

- geometric and SVG pattern generation;
- deterministic layout;
- MapLibre image installation and restoration;
- versioned runtime metadata.

Whole-icon polygon scattering is experimental. General style editing,
geometry editing, and unrelated controls are out of scope. See
[ROADMAP.md](./ROADMAP.md) before proposing a large API addition.

## Making a change

1. Create a focused branch.
2. Add a failing regression test for a bug.
3. Keep pure algorithms under `src/engine` where practical.
4. Run `npm run validate`.
5. Update the README, schema, and changelog for public behavior changes.
6. Run `npm run build` and commit `dist/`; the build is intentionally checked
   in because the buildless playground loads `dist/index.global.js`.

Public definitions and metadata must remain deterministic and JSON
serializable. New metadata formats require a versioned schema and migration
notes.

## Pull requests

Keep pull requests small enough to review. Explain:

- the cartographic or developer problem;
- the compatibility impact;
- how the behavior was tested;
- whether the change affects metadata, bundle size, or experimental APIs.

Do not include generated npm tarballs or `node_modules`.

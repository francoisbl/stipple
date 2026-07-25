# Releasing

## One-time npm setup

The first package publication may require a maintainer token because npm trusted
publishing is configured from an existing package's settings.

After the package exists on npm:

1. Open the package's Trusted Publisher settings.
2. Choose GitHub Actions.
3. Set owner `francoisbl`.
4. Set repository `maplibre-pattern-fills`.
5. Set workflow filename `publish.yml`.
6. Allow `npm publish`.

The workflow uses GitHub OIDC and does not require a long-lived npm token.

## Release checklist

1. Ensure CI and the Cloudflare Pages deployment pass on `main`.
2. Move changelog entries from `Unreleased` to the release version and date.
3. Update `package.json` and `package-lock.json` to the same version.
4. Run `npm run validate`.
5. Commit the regenerated `dist/`.
6. Create a `vX.Y.Z` GitHub release matching `package.json`.

Publishing the GitHub release triggers `.github/workflows/publish.yml`. The
workflow verifies the tag, rebuilds and tests the package, inspects the tarball,
then publishes through npm trusted publishing with automatic provenance.

# Security policy

## Supported versions

Before `1.0.0`, only the latest published minor release receives security
fixes. Experimental APIs may change without a compatibility guarantee.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use the repository's
private security advisory form:

https://github.com/francoisbl/maplibre-pattern-fills/security/advisories/new

Include a minimal reproduction, affected versions, expected impact, and any
suggested mitigation. Please allow time to investigate before public
disclosure.

## SVG trust boundary

The package rasterizes SVG markup supplied by the application and can embed it
inside runtime-extended style metadata. Applications must treat user-provided
SVG and imported style documents as untrusted content, enforce an appropriate
Content Security Policy, and validate their own asset sources.

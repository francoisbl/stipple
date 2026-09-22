import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const MAX_COMPRESSED_BYTES = 200_000;
const MAX_UNPACKED_BYTES = 800_000;
const requiredFiles = [
  "dist/index.js",
  "dist/index.cjs",
  "dist/index.d.ts",
  "dist/index.global.js",
  "dist/core.js",
  "dist/core.cjs",
  "dist/core.d.ts",
  "dist/maplibre.js",
  "dist/maplibre.cjs",
  "dist/maplibre.d.ts",
  "dist/experimental.js",
  "dist/experimental.cjs",
  "dist/experimental.d.ts",
  "schema/pattern-metadata-v1.schema.json",
];

const output = execFileSync(
  "npm",
  ["pack", "--dry-run", "--json", "--ignore-scripts"],
  {
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_cache: process.env.MPF_NPM_CACHE ?? join(tmpdir(), "stipple-npm-cache"),
    },
  },
);
const [pack] = JSON.parse(output);
if (!pack) throw new Error("npm pack did not return package metadata");

const files = new Set(pack.files.map(({ path }) => path));
for (const path of requiredFiles) {
  if (!files.has(path)) throw new Error(`Packed artifact is missing ${path}`);
}
for (const { path } of pack.files) {
  if (/^(?:src|test|demo|node_modules)\//.test(path)) {
    throw new Error(`Development file leaked into the package: ${path}`);
  }
}
if (pack.size > MAX_COMPRESSED_BYTES) {
  throw new Error(`Compressed package is ${pack.size} bytes; limit is ${MAX_COMPRESSED_BYTES}`);
}
if (pack.unpackedSize > MAX_UNPACKED_BYTES) {
  throw new Error(`Unpacked package is ${pack.unpackedSize} bytes; limit is ${MAX_UNPACKED_BYTES}`);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
for (const [subpath, target] of Object.entries(packageJson.exports)) {
  const candidates = typeof target === "string" ? [target] : Object.values(target);
  for (const candidate of candidates) {
    if (!files.has(candidate.replace(/^\.\//, ""))) {
      throw new Error(`Export ${subpath} points to unpacked file ${candidate}`);
    }
  }
}

console.log(
  `Package OK: ${pack.files.length} files, ${pack.size} bytes compressed, ${pack.unpackedSize} bytes unpacked`,
);

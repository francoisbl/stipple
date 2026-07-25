import { defineConfig } from "tsup";

const outExtension = ({ format }: { format: string }) => {
  if (format === "iife") return { js: ".global.js" };
  if (format === "cjs") return { js: ".cjs" };
  return { js: ".js" };
};

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs", "iife"],
    globalName: "MaplibrePatternFills",
    external: ["maplibre-gl"],
    dts: true,
    sourcemap: true,
    clean: true,
    minify: false,
    outExtension,
  },
  {
    entry: {
      core: "src/entries/core.ts",
      maplibre: "src/entries/maplibre.ts",
      experimental: "src/experimental.ts",
    },
    format: ["esm", "cjs"],
    external: ["maplibre-gl"],
    dts: true,
    sourcemap: true,
    clean: false,
    minify: false,
    outExtension,
  },
]);

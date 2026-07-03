import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs", "iife"],
  globalName: "MaplibrePatternFills",
  external: ["maplibre-gl"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  outExtension({ format }) {
    if (format === "iife") return { js: ".global.js" };
    if (format === "cjs") return { js: ".cjs" };
    return { js: ".js" };
  },
});

import { defineConfig } from "tsup";

const outExtension = ({ format }: { format: string }) => {
  if (format === "iife") return { js: ".global.js" };
  if (format === "cjs") return { js: ".cjs" };
  return { js: ".js" };
};

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "iife"],
    globalName: "MaplibrePatternFills",
    external: ["maplibre-gl"],
    dts: true,
    sourcemap: false,
    clean: true,
    minify: false,
    outExtension,
  },
]);

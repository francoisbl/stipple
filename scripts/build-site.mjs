import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const outputDir = resolve("_site");

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir);
await cp("site", outputDir, { recursive: true });
await cp("demo", resolve(outputDir, "demo"), { recursive: true });
await cp("dist", resolve(outputDir, "dist"), { recursive: true });

console.log(`Static site assembled in ${outputDir}`);

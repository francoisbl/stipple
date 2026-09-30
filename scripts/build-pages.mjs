import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const projectRoot = new URL("../", import.meta.url);
const demoDirectory = new URL("demo/", projectRoot);
const outputDirectory = new URL("_site/", projectRoot);
const outputBundleDirectory = new URL("dist/", outputDirectory);

await rm(outputDirectory, { recursive: true, force: true });
await cp(demoDirectory, outputDirectory, { recursive: true });
await mkdir(outputBundleDirectory, { recursive: true });
await cp(
  new URL("dist/index.global.js", projectRoot),
  new URL("index.global.js", outputBundleDirectory),
);

const outputIndex = new URL("index.html", outputDirectory);
const sourceHtml = await readFile(outputIndex, "utf8");
const deployedHtml = sourceHtml.replace(
  "../dist/index.global.js",
  "./dist/index.global.js",
);

if (deployedHtml === sourceHtml) {
  throw new Error("Could not update the browser bundle path in demo/index.html");
}

await writeFile(outputIndex, deployedHtml);

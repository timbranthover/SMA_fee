import { cp, mkdir, rm } from "node:fs/promises";

const outputDirectory = new URL("../public/", import.meta.url);
const projectRoot = new URL("../", import.meta.url);
const staticFiles = ["index.html", "app.js", "styles.css", "robots.txt"];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await Promise.all(
  staticFiles.map((file) =>
    cp(new URL(file, projectRoot), new URL(file, outputDirectory)),
  ),
);

await mkdir(new URL("lib/", outputDirectory), { recursive: true });
await Promise.all(
  ["shared-config.js", "brand-logos.js", "column-config.js"].map((file) =>
    cp(new URL(`lib/${file}`, projectRoot), new URL(`lib/${file}`, outputDirectory)),
  ),
);
await cp(new URL("assets/", projectRoot), new URL("assets/", outputDirectory), { recursive: true });
await mkdir(new URL("vendor/", outputDirectory), { recursive: true });
await cp(
  new URL("node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs", projectRoot),
  new URL("vendor/lightweight-charts.mjs", outputDirectory),
);

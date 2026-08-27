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
  ["shared-config.js", "brand-logos.js"].map((file) =>
    cp(new URL(`lib/${file}`, projectRoot), new URL(`lib/${file}`, outputDirectory)),
  ),
);
await cp(new URL("assets/", projectRoot), new URL("assets/", outputDirectory), { recursive: true });

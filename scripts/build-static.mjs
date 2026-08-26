import { cp, mkdir } from "node:fs/promises";

const outputDirectory = new URL("../public/", import.meta.url);
const projectRoot = new URL("../", import.meta.url);
const staticFiles = ["index.html", "app.js", "styles.css", "robots.txt"];

await mkdir(outputDirectory, { recursive: true });

await Promise.all(
  staticFiles.map((file) =>
    cp(new URL(file, projectRoot), new URL(file, outputDirectory)),
  ),
);

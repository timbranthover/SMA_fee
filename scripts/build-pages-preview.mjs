import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

await import("./build-static.mjs");

const projectRoot = new URL("../", import.meta.url);
const publicDirectory = new URL("../public/", import.meta.url);
const outputDirectory = new URL("../pages-public/", import.meta.url);

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(publicDirectory, outputDirectory, { recursive: true });

// GitHub Pages is a visual-QA runtime only. It deliberately ships the deterministic
// demo domain modules so the production UI can execute without serverless functions.
// The ordinary Vercel/public build continues to exclude these modules.
await cp(new URL("../api/", import.meta.url), new URL("api/", outputDirectory), { recursive: true });
await cp(new URL("../lib/", import.meta.url), new URL("lib/", outputDirectory), { recursive: true });
await cp(new URL("../pages-preview-router.js", import.meta.url), new URL("pages-preview-router.js", outputDirectory));
await writeFile(new URL(".nojekyll", outputDirectory), "", "utf8");

const htmlPath = new URL("index.html", outputDirectory);
let html = await readFile(htmlPath, "utf8");
html = html.replace(/(href|src)="\/(?!\/)/g, '$1="./');
html = html.replace(
  '<script type="module" src="./app.js"></script>',
  '<script type="module" src="./pages-preview-router.js"></script>\n    <script type="module" src="./app.js"></script>',
);
await writeFile(htmlPath, html, "utf8");

const appPath = new URL("app.js", outputDirectory);
let app = await readFile(appPath, "utf8");
app = app
  .replace(/from "\//g, 'from "./')
  .replace(/import\("\//g, 'import("./')
  .replace(/location\.pathname/g, '(window.__pagesPreviewPathname?.() || location.pathname)');
await writeFile(appPath, app, "utf8");

const brandPath = new URL("lib/brand-logos.js", outputDirectory);
let brands = await readFile(brandPath, "utf8");
brands = brands.replaceAll('src: "/assets/', 'src: "../assets/');
await writeFile(brandPath, brands, "utf8");

const notFound = `<!doctype html>
<meta charset="utf-8">
<meta name="robots" content="noindex,nofollow">
<title>Advisor Workspace QA</title>
<script>
  const parts = location.pathname.split('/').filter(Boolean);
  const base = parts.length ? '/' + parts[0] : '';
  const route = location.pathname.slice(base.length) + location.search + location.hash;
  location.replace(base + '/?__qa_route=' + encodeURIComponent(route));
</script>`;
await writeFile(new URL("404.html", outputDirectory), notFound, "utf8");

// Make direct-refresh routes work on project Pages. The router runs before app.js.
const routerPath = new URL("pages-preview-router.js", outputDirectory);
let router = await readFile(routerPath, "utf8");
router = router.replace(
  'window.fetch = routeFetch;',
  `const restoredRoute = new URL(location.href).searchParams.get("__qa_route");
if (restoredRoute) {
  history.replaceState(history.state, "", withBasePath(restoredRoute));
}

window.fetch = routeFetch;`,
);
await writeFile(routerPath, router, "utf8");

console.log("Built GitHub Pages visual-QA site in pages-public/");

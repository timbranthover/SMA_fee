import { readFile, writeFile } from "node:fs/promises";

const path = "app.js";
let source = await readFile(path, "utf8");
const from = '    state.facets = data.facets;\n    state.appliedCategory = data.appliedCategory || state.category;\n    state.ranges = normalizeRanges(data.appliedRanges || state.ranges, state.appliedCategory);';
const to = '    state.facets = data.facets;\n    state.appliedCategory = data.appliedCategory || state.category;\n    state.items = sortLoadedItems(state.items, state.sort, state.appliedCategory);\n    state.ranges = normalizeRanges(data.appliedRanges || state.ranges, state.appliedCategory);';
const count = source.split(from).length - 1;
if (count !== 1) throw new Error(`Expected one app sort insertion point, found ${count}`);
source = source.replace(from, to);
await writeFile(path, source);
console.log("Applied cached live sort fix");

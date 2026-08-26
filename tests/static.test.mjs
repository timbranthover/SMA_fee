import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = ["index.html", "app.js", "lib/catalog.js", "lib/shared-config.js"];

test("public source is masked and contains no client-context remnants", async () => {
  const source = (await Promise.all(files.map((file) => readFile(new URL(`../${file}`, import.meta.url), "utf8")))).join("\n");
  for (const forbidden of ["Tim Branthover", "Pollen Capital", "M59D", "Client context", "Client fit", "client eligibility", "UBS"]) {
    assert.equal(source.includes(forbidden), false, `found forbidden public string: ${forbidden}`);
  }
});

test("removed prototype controls do not remain in the markup or event code", async () => {
  const source = `${await readFile(new URL("../index.html", import.meta.url), "utf8")}\n${await readFile(new URL("../app.js", import.meta.url), "utf8")}`;
  assert.equal(source.includes("addCriteriaButton"), false);
  assert.equal(source.includes("criteriaModal"), false);
  assert.equal(source.includes("100+ available criteria"), false);
});

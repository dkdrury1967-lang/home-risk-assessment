// Sanity checks on the editable content file, so a typo in the JSON is
// caught before it reaches the phone.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const data = JSON.parse(
  readFileSync(new URL("../src/data/risk-areas.json", import.meta.url), "utf8")
);
const matrix = JSON.parse(
  readFileSync(new URL("../src/config/rating-matrix.json", import.meta.url), "utf8")
);

test("there are exactly 16 risk areas with unique ids", () => {
  assert.equal(data.areas.length, 16);
  assert.equal(new Set(data.areas.map((a) => a.id)).size, 16);
});

test("every area has a title, question and guidance", () => {
  for (const a of data.areas) {
    assert.ok(a.title && a.question, `${a.id} missing title or question`);
    assert.ok(Array.isArray(a.guidance) && a.guidance.length > 0, `${a.id} has no guidance`);
  }
});

test("scale matches the rating matrix levels", () => {
  assert.deepEqual(data.scale, matrix.levels);
});

test("defaults are present", () => {
  assert.equal(data.defaults.reviewIntervalMonths, 12);
  assert.ok(Array.isArray(data.defaults.staff));
  assert.ok(data.warnings.noCodes);
});

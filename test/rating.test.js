// Checks every probability/impact combination against the table in the
// project brief (section 7). The expected table is typed out separately here
// on purpose: if someone edits the config by mistake, this test fails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getRating, getRatingColours, needsActionPrompt } from "../src/rating.js";

const config = JSON.parse(
  readFileSync(new URL("../src/config/rating-matrix.json", import.meta.url), "utf8")
);

const impacts = ["Very Low", "Low", "Medium", "High", "Very high"];
const expected = {
  "Very high": ["Moderate", "Severe", "Severe", "Critical", "Critical"],
  "High": ["Sustainable", "Moderate", "Severe", "Critical", "Critical"],
  "Medium": ["Sustainable", "Moderate", "Moderate", "Severe", "Critical"],
  "Low": ["Sustainable", "Sustainable", "Moderate", "Severe", "Critical"],
  "Very Low": ["Sustainable", "Sustainable", "Sustainable", "Moderate", "Severe"],
};

test("all 25 probability/impact combinations match the brief", () => {
  let checked = 0;
  for (const [probability, row] of Object.entries(expected)) {
    row.forEach((rating, i) => {
      assert.equal(
        getRating(config, probability, impacts[i]),
        rating,
        `${probability} probability x ${impacts[i]} impact`
      );
      checked++;
    });
  }
  assert.equal(checked, 25);
});

test("unanswered or unknown values give no rating", () => {
  assert.equal(getRating(config, "", "High"), null);
  assert.equal(getRating(config, "High", undefined), null);
  assert.equal(getRating(config, "Huge", "High"), null);
});

test("every rating in the matrix has colours", () => {
  for (const row of Object.values(config.matrix)) {
    for (const rating of Object.values(row)) {
      assert.ok(getRatingColours(config, rating), `no colours for ${rating}`);
    }
  }
});

test("action is prompted for Critical and Severe only", () => {
  assert.equal(needsActionPrompt("Critical"), true);
  assert.equal(needsActionPrompt("Severe"), true);
  assert.equal(needsActionPrompt("Moderate"), false);
  assert.equal(needsActionPrompt("Sustainable"), false);
  assert.equal(needsActionPrompt(null), false);
});

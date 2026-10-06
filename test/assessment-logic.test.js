import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  todayISO, addMonthsISO, blankArea, newAssessment, areaStatus, missingItems,
  progress, firstUnfinishedIndex, areaRatings,
} from "../src/assessment-logic.js";

const config = JSON.parse(
  readFileSync(new URL("../src/config/rating-matrix.json", import.meta.url), "utf8")
);

test("todayISO is yyyy-mm-dd in local time", () => {
  assert.equal(todayISO(new Date(2026, 9, 6, 23, 59)), "2026-10-06");
  assert.equal(todayISO(new Date(2026, 0, 5)), "2026-01-05");
});

test("addMonthsISO keeps the day and clamps short months", () => {
  assert.equal(addMonthsISO("2026-10-06", 12), "2027-10-06");
  assert.equal(addMonthsISO("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonthsISO("2028-02-29", 12), "2029-02-28");
  assert.equal(addMonthsISO("2026-11-15", 3), "2027-02-15");
  assert.equal(addMonthsISO("2026-10-06", 6), "2027-04-06");
});

const done = (over = {}) => ({
  ...blankArea(), applicable: "yes", description: "Trip hazard on stairs",
  inherentProb: "High", inherentImpact: "High", controls: "Stair lift fitted",
  residualProb: "Low", residualImpact: "Low", ...over,
});

test("a new assessment has a blank area for each id", () => {
  const a = newAssessment({
    id: "x", clientName: "  Mrs Smith ", assessedBy: "Sarah Collins",
    dateAssessed: "2026-10-06", nextReviewDue: "2027-10-06",
    areaIds: ["a", "b"], now: "t",
  });
  assert.equal(a.clientName, "Mrs Smith");
  assert.deepEqual(Object.keys(a.areas), ["a", "b"]);
  assert.equal(a.areas.a.applicable, "unassessed");
  assert.equal(a.exportedAt, null);
});

test("area status: not started, not applicable, incomplete, complete", () => {
  assert.equal(areaStatus(config, blankArea()), "not-started");
  assert.equal(areaStatus(config, { ...blankArea(), applicable: "no" }), "not-applicable");
  assert.equal(areaStatus(config, { ...blankArea(), applicable: "yes" }), "incomplete");
  assert.equal(areaStatus(config, done()), "complete");
});

test("Critical or Severe residual risk needs an answer on action", () => {
  const severe = done({ residualProb: "High", residualImpact: "Medium" }); // Severe
  assert.equal(areaRatings(config, severe).residual, "Severe");
  assert.ok(missingItems(config, severe).includes("Is an action required?"));
  assert.equal(areaStatus(config, { ...severe, actionRequired: false }), "complete");
});

test("when an action is required, its details are required", () => {
  const a = done({ actionRequired: true });
  assert.deepEqual(missingItems(config, a),
    ["Required action", "Action owner", "Priority", "Target completion date"]);
  const full = { ...a, requiredAction: "Fit grab rail", actionOwner: "Dave", priority: "High", targetDate: "2026-11-01" };
  assert.equal(areaStatus(config, full), "complete");
});

test("progress counts complete and not-applicable areas", () => {
  const a = newAssessment({
    id: "x", clientName: "A", assessedBy: "B", dateAssessed: "d", nextReviewDue: "d",
    areaIds: ["a", "b", "c"], now: "t",
  });
  a.areas.a = done();
  a.areas.b = { ...blankArea(), applicable: "no" };
  assert.deepEqual(progress(config, a, ["a", "b", "c"]), { done: 2, total: 3 });
  assert.equal(firstUnfinishedIndex(config, a, ["a", "b", "c"]), 2);
  a.areas.c = done();
  assert.equal(firstUnfinishedIndex(config, a, ["a", "b", "c"]), -1);
});

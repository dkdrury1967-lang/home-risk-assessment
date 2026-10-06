import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatRiskRef, cleanPrefix, parseRefNumber, parseReviewMonths,
  addStaffName, removeStaffName,
} from "../src/settings-logic.js";

test("risk refs are padded like the register (RR008)", () => {
  assert.equal(formatRiskRef("RR", 8, 3), "RR008");
  assert.equal(formatRiskRef("RR", 1, 3), "RR001");
  assert.equal(formatRiskRef("RR", 1234, 3), "RR1234");
});

test("prefix is tidied", () => {
  assert.equal(cleanPrefix(" rr-"), "RR");
  assert.equal(cleanPrefix("abcdefghi"), "ABCDEF");
});

test("ref number must be a whole number of 1 or more", () => {
  assert.equal(parseRefNumber("8"), 8);
  assert.equal(parseRefNumber(" 12 "), 12);
  for (const bad of ["", "0", "-3", "2.5", "abc", "1000000"]) {
    assert.equal(parseRefNumber(bad), null, bad);
  }
});

test("review interval is 1 to 60 whole months", () => {
  assert.equal(parseReviewMonths("12"), 12);
  for (const bad of ["", "0", "61", "1.5", "x"]) {
    assert.equal(parseReviewMonths(bad), null, bad);
  }
});

test("adding staff trims, rejects blanks and duplicates", () => {
  let r = addStaffName(["Sarah Collins"], "  John   Peters ");
  assert.deepEqual(r.staff, ["Sarah Collins", "John Peters"]);
  assert.equal(r.error, null);
  r = addStaffName(["Sarah Collins"], "sarah collins");
  assert.deepEqual(r.staff, ["Sarah Collins"]);
  assert.ok(r.error);
  assert.ok(addStaffName([], "   ").error);
});

test("removing staff", () => {
  assert.deepEqual(removeStaffName(["A", "B", "C"], "B"), ["A", "C"]);
});

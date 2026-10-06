import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  HEADERS, isoToExcelSerial, exportableAreaIds, allocateRefs, buildRow, buildRows,
  buildWorkbook, buildCsv, exportFileName,
} from "../src/export-logic.js";
import { blankArea, newAssessment } from "../src/assessment-logic.js";

const config = JSON.parse(readFileSync(new URL("../src/config/rating-matrix.json", import.meta.url), "utf8"));
// The library is a browser script that defines a global called XLSX; run it the same way here.
const sandbox = {};
vm.runInNewContext(readFileSync(new URL("../src/vendor/xlsx.mini.min.js", import.meta.url), "utf8") + ";this.XLSX = XLSX;", sandbox);
const XLSX = sandbox.XLSX;

const settings = { riskRefPrefix: "RR", riskRefDigits: 3, nextRiskRefNumber: 8 };
const ids = ["a", "b", "c", "d"];

function sample() {
  const a = newAssessment({
    id: "x", clientName: "Mrs A. Smith", assessedBy: "Sarah Collins",
    dateAssessed: "2026-10-06", nextReviewDue: "2027-10-06", areaIds: ids, now: "t",
  });
  const risk = (o) => ({ ...blankArea(), applicable: "yes", description: "Desc", controls: "Ctl",
    inherentProb: "High", inherentImpact: "High", residualProb: "Low", residualImpact: "Low", ...o });
  a.areas.a = risk({ causedBy: "Clutter", consequences: "Slow exit", actionRequired: true,
    requiredAction: "Move it", actionOwner: "John Peters", priority: "High", targetDate: "2026-11-01" });
  a.areas.b = { ...blankArea(), applicable: "no" };
  a.areas.c = risk({ controlOwner: "David Drury" });
  a.areas.d = { ...blankArea(), applicable: "yes", description: "unfinished" };
  return a;
}

// The exact headers from the Risk Register tab of the Governance Master Dashboard.
test("headers are A to X, exactly as in the register", () => {
  assert.deepEqual(HEADERS, [
    "Risk Ref", "Date Assessed", "Client Name", "Assessed By", "Risk Description",
    "Caused by & Consequences", "Risk Owner", "Inherent Probability", "Inherent Impact",
    "Inherent Risk Rating", "Controls in Place", "Control Owner", "Residual Probability",
    "Residual Impact", "Residual Risk Rating", "Action Required?", "Required Action",
    "Action Owner", "Priority Level", "Target Completion Date", "Action Status",
    "Date Completed", "Action Overdue?", "Next Review Due",
  ]);
  assert.equal(HEADERS.length, 24);
});

test("Excel date numbers are right", () => {
  assert.equal(isoToExcelSerial("2000-01-01"), 36526);
  assert.equal(isoToExcelSerial("2026-10-06"), 46301);
});

test("only applicable, finished risks are exported", () => {
  assert.deepEqual(exportableAreaIds(config, sample(), ids), ["a", "c"]);
});

test("refs follow on from the setting and never repeat on re-export", () => {
  const a = sample();
  const first = allocateRefs(a, ["a", "c"], settings);
  assert.deepEqual(first.refs, { a: "RR008", c: "RR009" });
  assert.equal(first.nextNumber, 10);
  // exported once already: same refs, counter unchanged
  a.exportedRefs = first.refs;
  const again = allocateRefs(a, ["a", "c"], { ...settings, nextRiskRefNumber: 10 });
  assert.deepEqual(again.refs, first.refs);
  assert.equal(again.nextNumber, 10);
  // a later risk gets the next new number
  const more = allocateRefs(a, ["a", "c", "d"], { ...settings, nextRiskRefNumber: 10 });
  assert.equal(more.refs.d, "RR010");
});

test("a row with an action fills the action columns and Status = Open", () => {
  const a = sample();
  const row = buildRow(config, a, a.areas.a, "RR008");
  assert.equal(row.length, 24);
  const col = (letter) => row["ABCDEFGHIJKLMNOPQRSTUVWX".indexOf(letter)];
  assert.equal(col("A"), "RR008");
  assert.equal(col("B"), 46301);
  assert.equal(col("C"), "Mrs A. Smith");
  assert.equal(col("D"), "Sarah Collins");
  assert.equal(col("F"), "Caused by: Clutter Consequences: Slow exit");
  assert.equal(col("G"), "Sarah Collins");
  assert.equal(col("H"), "High");
  assert.equal(col("P"), "Yes");
  assert.equal(col("Q"), "Move it");
  assert.equal(col("R"), "John Peters");
  assert.equal(col("S"), "High");
  assert.equal(col("T"), isoToExcelSerial("2026-11-01"));
  assert.equal(col("U"), "Open");
  assert.equal(col("X"), isoToExcelSerial("2027-10-06"));
});

test("formula columns J, O, W and Date Completed V are always blank", () => {
  const a = sample();
  for (const id of ["a", "c"]) {
    const row = buildRow(config, a, a.areas[id], "RR001");
    for (const letter of "JOVW") assert.equal(row["ABCDEFGHIJKLMNOPQRSTUVWX".indexOf(letter)], null, letter);
  }
});

test("a risk with no action says No and leaves the action columns blank", () => {
  const a = sample();
  const row = buildRow(config, a, a.areas.c, "RR009");
  const col = (letter) => row["ABCDEFGHIJKLMNOPQRSTUVWX".indexOf(letter)];
  assert.equal(col("P"), "No");
  for (const letter of "QRSTU") assert.equal(col(letter), null, letter);
  assert.equal(col("L"), "David Drury");
  assert.equal(col("F"), null);
});

test("the .xlsx has the headers, real dates, and no cells in J, O, V, W", () => {
  const a = sample();
  const rows = buildRows(config, a, ["a", "c"], { a: "RR008", c: "RR009" });
  const bytes = XLSX.write(buildWorkbook(XLSX, rows), { type: "buffer", bookType: "xlsx" });

  // read it back with the library
  const ws = XLSX.read(bytes, { type: "buffer", cellDates: false }).Sheets["Risk Register"];
  const headers = XLSX.utils.sheet_to_json(ws, { header: 1 })[0];
  assert.deepEqual([...headers], HEADERS);

  // dates are numbers with a date format, not text
  for (const addr of ["B2", "T2", "X2", "B3", "X3"]) {
    assert.equal(ws[addr].t, "n", addr);
    assert.match(ws[addr].w, /^\d\d\/\d\d\/\d{4}$/, addr);
  }
  assert.equal(ws.B2.w, "06/10/2026");
  assert.equal(ws.T2.w, "01/11/2026");

  // formula columns have no cell at all, so "Skip blanks" keeps the register's formulas
  for (const addr of ["J2", "O2", "V2", "W2", "J3", "O3", "V3", "W3", "Q3", "T3", "U3"]) {
    assert.equal(ws[addr], undefined, `${addr} should be empty`);
  }
  assert.equal(ws.A2.v, "RR008");
  assert.equal(ws.U2.v, "Open");
  assert.equal(XLSX.read(bytes, { type: "buffer" }).SheetNames.length, 1);
});

test("CSV escapes commas, quotes and line breaks and writes UK dates", () => {
  const a = sample();
  a.areas.c.description = 'Has "quotes", commas\nand a new line';
  const csv = buildCsv(buildRows(config, a, ["c"], { c: "RR009" }));
  assert.ok(csv.startsWith("﻿Risk Ref,Date Assessed,"));
  assert.ok(csv.includes('"Has ""quotes"", commas\nand a new line"'));
  assert.ok(csv.includes("RR009,06/10/2026,Mrs A. Smith"));
});

test("file name is safe and follows the brief", () => {
  const a = sample();
  assert.equal(exportFileName(a, "xlsx"), "Risk Assessment - Mrs A. Smith - 2026-10-06.xlsx");
  a.clientName = 'Mr O\'Neil / "Jim": <b>';
  assert.equal(exportFileName(a, "csv"), "Risk Assessment - Mr O'Neil Jim b - 2026-10-06.csv");
});

import { emailMessage } from "../src/export-logic.js";

test("email subject and message never contain the client's name", () => {
  const a = sample(); // client "Mrs A. Smith"
  const m = emailMessage(a, 2, "RR008 to RR009");
  assert.equal(m.subject, "Risk assessment - Sarah Collins - 06/10/2026 - 2 risks");
  for (const part of [m.subject, m.text]) {
    assert.ok(!part.includes("Smith"), "client name leaked");
    assert.ok(!part.includes("Mrs"), "client name leaked");
  }
  assert.match(m.text, /2 risks, refs RR008 to RR009/);
  assert.match(m.text, /Please add to the Risk Register/);
});

test("email wording for a single risk", () => {
  const m = emailMessage(sample(), 1, "RR008");
  assert.match(m.subject, /1 risk$/);
  assert.match(m.text, /1 risk, refs RR008/);
});

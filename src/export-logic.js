// Builds the export in the exact layout of the "Risk Register" tab: columns A
// to X, one row per applicable risk. Plain functions with no browser code, so
// the automated tests can check them. The spreadsheet library is passed in.
import { YES, areaStatus } from "./assessment-logic.js";
import { formatRiskRef } from "./settings-logic.js";
import { formatDate } from "./dates.js";

/** Headers A to X. Must match the register exactly, in this order. */
export const HEADERS = [
  "Risk Ref", "Date Assessed", "Client Name", "Assessed By", "Risk Description",
  "Caused by & Consequences", "Risk Owner", "Inherent Probability", "Inherent Impact",
  "Inherent Risk Rating", "Controls in Place", "Control Owner", "Residual Probability",
  "Residual Impact", "Residual Risk Rating", "Action Required?", "Required Action",
  "Action Owner", "Priority Level", "Target Completion Date", "Action Status",
  "Date Completed", "Action Overdue?", "Next Review Due",
];

// Columns left blank on purpose: the register works these out with formulas.
// J = Inherent Risk Rating, O = Residual Risk Rating, W = Action Overdue?
// V = Date Completed is filled in later, when an action is closed.

const DATE_COLUMNS = [1, 19, 23]; // B, T, X (0-based)

/** Excel's day number for a yyyy-mm-dd date (Excel counts days from 1900). */
export function isoToExcelSerial(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
}

/** Areas that can be exported: applicable and fully filled in. */
export function exportableAreaIds(config, assessment, areaIds) {
  return areaIds.filter((id) => {
    const area = assessment.areas[id];
    return area && area.applicable === YES && areaStatus(config, area) === "complete";
  });
}

/**
 * Give each exported risk its reference. A risk that was exported before keeps
 * its old reference, so exporting the same assessment twice can never create a
 * second RR number for the same risk. Returns the refs and the next number.
 */
export function allocateRefs(assessment, areaIdsToExport, settings) {
  const refs = { ...(assessment.exportedRefs || {}) };
  let next = settings.nextRiskRefNumber;
  for (const id of areaIdsToExport) {
    if (!refs[id]) {
      refs[id] = formatRiskRef(settings.riskRefPrefix, next, settings.riskRefDigits);
      next++;
    }
  }
  return { refs, nextNumber: next };
}

/** One value per column A to X for one risk. Blank = null (no cell at all). */
export function buildRow(config, assessment, area, ref) {
  const text = (s) => (s && s.trim() ? s.trim() : null);
  const hasAction = area.actionRequired === true;
  const causedAndConsequences = [
    text(area.causedBy) && `Caused by: ${text(area.causedBy)}`,
    text(area.consequences) && `Consequences: ${text(area.consequences)}`,
  ].filter(Boolean).join(" ") || null;

  return [
    ref,                                              // A Risk Ref
    isoToExcelSerial(assessment.dateAssessed),        // B Date Assessed
    assessment.clientName,                            // C Client Name
    assessment.assessedBy,                            // D Assessed By
    text(area.description),                           // E Risk Description
    causedAndConsequences,                            // F Caused by & Consequences
    assessment.assessedBy,                            // G Risk Owner (the assessor)
    area.inherentProb,                                // H
    area.inherentImpact,                              // I
    null,                                             // J formula in Excel
    text(area.controls),                              // K Controls in Place
    text(area.controlOwner),                          // L Control Owner
    area.residualProb,                                // M
    area.residualImpact,                              // N
    null,                                             // O formula in Excel
    hasAction ? "Yes" : "No",                         // P Action Required?
    hasAction ? text(area.requiredAction) : null,     // Q
    hasAction ? text(area.actionOwner) : null,        // R
    hasAction ? area.priority : null,                 // S
    hasAction ? isoToExcelSerial(area.targetDate) : null, // T
    hasAction ? "Open" : null,                        // U Action Status
    null,                                             // V Date Completed
    null,                                             // W formula in Excel
    isoToExcelSerial(assessment.nextReviewDue),       // X Next Review Due
  ];
}

/** All rows for the exportable risks, using the given refs. */
export function buildRows(config, assessment, areaIds, refs) {
  return areaIds.map((id) => buildRow(config, assessment, assessment.areas[id], refs[id]));
}

/** Make a SheetJS workbook: header row, then one row per risk, real Excel dates. */
export function buildWorkbook(XLSX, rows) {
  const ws = {};
  const put = (r, c, cell) => { ws[XLSX.utils.encode_cell({ r, c })] = cell; };
  HEADERS.forEach((h, c) => put(0, c, { t: "s", v: h }));
  rows.forEach((row, i) => {
    row.forEach((value, c) => {
      if (value === null || value === undefined || value === "") return; // leave the cell empty
      if (DATE_COLUMNS.includes(c)) put(i + 1, c, { t: "n", v: value, z: "dd/mm/yyyy" });
      else put(i + 1, c, { t: "s", v: String(value) });
    });
  });
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: HEADERS.length - 1 } });
  ws["!cols"] = HEADERS.map((h, c) => ({ wch: [4, 5, 7, 9, 10, 11, 16, 19, 22].includes(c) ? 34 : 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Risk Register");
  return wb;
}

/** CSV fallback. Dates as dd/mm/yyyy text; a BOM so Excel reads the characters right. */
export function buildCsv(rows) {
  const quote = (s) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const cell = (value, c) => {
    if (value === null || value === undefined) return "";
    return quote(DATE_COLUMNS.includes(c) ? formatDate(excelSerialToIso(value)) : String(value));
  };
  const lines = [HEADERS.map(quote), ...rows.map((r) => r.map(cell))].map((l) => l.join(","));
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

function excelSerialToIso(serial) {
  const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
  return d.toISOString().slice(0, 10);
}

/** "Risk Assessment - <Client> - <yyyy-mm-dd>.<ext>", safe for any file system. */
export function exportFileName(assessment, ext) {
  const client = assessment.clientName.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim() || "Client";
  return `Risk Assessment - ${client} - ${assessment.dateAssessed}.${ext}`;
}

// Export: makes the .xlsx (and a CSV fallback) in the Risk Register layout and
// hands it to the iPhone Share sheet so it can be saved to Files / OneDrive.
//
// Two taps on purpose: "Create export file" builds the file, then "Share" opens
// the Share sheet straight away. iPhone Safari only allows the Share sheet to
// open from a tap, so nothing slow can happen between the tap and the sheet.
import { h } from "../ui.js";
import { loadContent, loadRatingConfig } from "../content.js";
import { getAssessment, saveAssessment, getSettings, saveSettings } from "../db.js";
import { loadXlsx } from "../xlsx-loader.js";
import { areaStatus, blankArea, YES } from "../assessment-logic.js";
import {
  exportableAreaIds, allocateRefs, buildRows, buildWorkbook, buildCsv, exportFileName,
} from "../export-logic.js";
import { formatDate } from "../dates.js";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function renderExport(root, id) {
  const [content, config, assessment, settings] = await Promise.all([
    loadContent(), loadRatingConfig(), getAssessment(id), getSettings(),
  ]);
  if (!assessment) {
    root.replaceChildren(
      h("a", { class: "back", href: "#/" }, "‹ Home"),
      h("p", {}, "That assessment could not be found."));
    return;
  }
  const ids = content.areas.map((a) => a.id);
  const toExport = exportableAreaIds(config, assessment, ids);
  const left = content.areas
    .map((def, i) => ({ def, i, area: assessment.areas[def.id] || blankArea() }))
    .filter(({ area }) => area.applicable === YES || area.applicable === "unassessed")
    .filter(({ area }) => areaStatus(config, area) !== "complete");

  const preview = allocateRefs(assessment, toExport, settings);
  const refList = toExport.map((aid) => preview.refs[aid]);
  const refText = refList.length === 0 ? "" :
    refList.length === 1 ? refList[0] : `${refList[0]} to ${refList[refList.length - 1]}`;

  const result = h("div", {});
  const message = h("p", { class: "hint", role: "status" });
  const errorBox = h("p", { class: "error", role: "alert" });

  async function markExported() {
    assessment.exportedAt = new Date().toISOString();
    await saveAssessment(assessment);
    message.textContent = `Marked as exported on ${formatDate(assessment.exportedAt.slice(0, 10))}. ` +
      "After you have pasted the rows into the Risk Register, delete this assessment from the phone.";
  }

  // Step 1: build the files. Risk refs are fixed here and saved, so building
  // the file again later reuses the same refs.
  async function createFiles(button) {
    button.disabled = true;
    errorBox.textContent = "";
    try {
      const XLSX = await loadXlsx();
      const fresh = await getSettings();
      const { refs, nextNumber } = allocateRefs(assessment, toExport, fresh);
      assessment.exportedRefs = refs;
      fresh.nextRiskRefNumber = Math.max(fresh.nextRiskRefNumber, nextNumber);
      await saveAssessment(assessment);
      await saveSettings(fresh);

      const rows = buildRows(config, assessment, toExport, refs);
      const bytes = XLSX.write(buildWorkbook(XLSX, rows), { type: "array", bookType: "xlsx" });
      const xlsxFile = new File([bytes], exportFileName(assessment, "xlsx"), { type: XLSX_TYPE });
      const csvFile = new File([buildCsv(rows)], exportFileName(assessment, "csv"), { type: "text/csv" });
      showFiles(xlsxFile, csvFile, rows.length);
    } catch (err) {
      errorBox.textContent = `Could not create the file: ${err.message}`;
      button.disabled = false;
    }
  }

  function download(file) {
    const url = URL.createObjectURL(file);
    const a = h("a", { href: url, download: file.name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    markExported();
  }

  // Step 2: share. Called straight from the tap, with the file already built.
  function share(file) {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: file.name })
        .then(markExported)
        .catch((err) => {
          if (err.name !== "AbortError") errorBox.textContent = `Sharing failed: ${err.message}`;
        });
    } else {
      download(file); // this browser cannot share files, so download instead
    }
  }

  function showFiles(xlsxFile, csvFile, count) {
    result.replaceChildren(
      h("div", { class: "ok-box" },
        h("p", { class: "tight" }, "File ready"),
        h("p", {}, `${xlsxFile.name}`),
        h("p", { class: "hint" }, `${count} ${count === 1 ? "risk" : "risks"}, refs ${refText}.`)),
      h("button", { class: "btn btn-primary", type: "button", onclick: () => share(xlsxFile) },
        "Share / Save to Files"),
      h("button", { class: "btn btn-secondary", type: "button", onclick: () => download(xlsxFile) },
        "Download .xlsx"),
      h("button", { class: "btn btn-secondary", type: "button", onclick: () => download(csvFile) },
        "Download CSV (backup option)"),
      h("h3", {}, "Putting it in the Risk Register"),
      h("ol", { class: "steps" },
        h("li", {}, "Open the file in Excel and select the data rows (not the header row)."),
        h("li", {}, "Copy them."),
        h("li", {}, "In the Risk Register tab, click the first empty cell in column A."),
        h("li", {}, "Use Paste Special > Values, tick Skip blanks, and click OK."),
        h("li", {}, "Check the ratings in columns J and O have filled in.")));
  }

  const createButton = h("button", {
    class: "btn btn-primary", type: "button",
    disabled: toExport.length === 0,
    onclick: (e) => createFiles(e.currentTarget),
  }, assessment.exportedAt ? "Create the export file again" : "Create export file");

  root.replaceChildren(
    h("a", { class: "back", href: `#/assessment/${id}/summary` }, "‹ Summary"),
    h("h2", { class: "first" }, `Export: ${assessment.clientName}`),

    toExport.length === 0
      ? h("p", { class: "prompt" }, "There are no finished risks to export yet.")
      : h("p", {}, `${toExport.length} ${toExport.length === 1 ? "risk" : "risks"} will be exported, ` +
          `as ${refText}${assessment.exportedRefs ? "" : ""}.`),

    assessment.exportedAt
      ? h("p", { class: "hint" }, `Last exported on ${formatDate(assessment.exportedAt.slice(0, 10))}. ` +
          "Creating the file again keeps the same risk references.")
      : null,

    left.length === 0 ? null :
      h("details", { class: "prompt unfinished", open: left.length <= 3 },
        h("summary", {}, `${left.length} ${left.length === 1 ? "area" : "areas"} not finished, so not in the export (tap to see)`),
        h("ul", { class: "plain" }, left.map(({ def, i }) =>
          h("li", {}, h("a", { href: `#/assessment/${id}/area/${i}` }, `${i + 1}. ${def.title}`))))),

    h("p", { class: "hint" },
      "Areas marked not applicable are not exported. The ratings (columns J and O) and Action Overdue (W) " +
      "are left blank so the register's own formulas work them out."),

    createButton,
    errorBox,
    result,
    message);
}

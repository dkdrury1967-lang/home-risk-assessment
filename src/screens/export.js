// Export: makes the .xlsx (and a CSV fallback) in the Risk Register layout and
// hands it to the iPhone Share sheet so it can be saved to Files / OneDrive.
//
// The file is built as soon as this screen opens, so there is a single tap:
// "Share / Save to Files". (iPhone Safari only allows the Share sheet to open
// straight from a tap, so the file has to be ready before the tap.)
//
// Risk references are only used up once the file has really been shared or
// downloaded. If the Share sheet is cancelled, nothing is used up.
import { h, render } from "../ui.js";
import { loadContent, loadRatingConfig } from "../content.js";
import { getAssessment, saveAssessment, getSettings, saveSettings } from "../db.js";
import { loadXlsx } from "../xlsx-loader.js";
import { areaStatus, blankArea, YES } from "../assessment-logic.js";
import {
  exportableAreaIds, allocateRefs, buildRows, buildWorkbook, buildCsv, exportFileName, emailMessage,
} from "../export-logic.js";
import { formatDate } from "../dates.js";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function renderExport(root, id) {
  const [content, config, assessment, settings] = await Promise.all([
    loadContent(), loadRatingConfig(), getAssessment(id), getSettings(),
  ]);
  if (!assessment) {
    render(root, 
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

  // Called once the file has really left the app (shared or downloaded):
  // fix the risk refs, move the counter on, and mark the assessment exported.
  async function commitExport() {
    const fresh = await getSettings();
    assessment.exportedRefs = preview.refs;
    fresh.nextRiskRefNumber = Math.max(fresh.nextRiskRefNumber, preview.nextNumber);
    assessment.exportedAt = new Date().toISOString();
    await saveAssessment(assessment);
    await saveSettings(fresh);
    message.textContent = `Marked as exported on ${formatDate(assessment.exportedAt.slice(0, 10))}. ` +
      "Once the Registered Manager confirms it is in the Risk Register, delete this assessment from the phone " +
      "and delete the sent email from your Sent and Deleted items.";
  }

  function download(file) {
    const url = URL.createObjectURL(file);
    const a = h("a", { href: url, download: file.name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    commitExport();
  }

  // Called straight from the tap, with the file already built. The Share sheet
  // is where "Mail" (or Files, AirDrop...) is chosen. The subject and message
  // are filled in for Mail; other destinations ignore them.
  function share(file, count) {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      const email = emailMessage(assessment, count, refText);
      navigator.share({ files: [file], title: email.subject, text: email.text })
        .then(commitExport)
        .catch((err) => {
          if (err.name !== "AbortError") errorBox.textContent = `Sharing failed: ${err.message}`;
        });
    } else {
      download(file); // this browser cannot share files, so download instead
    }
  }

  async function copyAddress(button) {
    try {
      await navigator.clipboard.writeText(settings.rmEmail);
      button.textContent = "Copied";
    } catch {
      button.textContent = "Could not copy: select the address instead";
    }
    setTimeout(() => (button.textContent = "Copy address"), 2500);
  }

  // Who the email goes to. The address is set in Settings on each phone.
  function recipientBox() {
    if (!settings.rmEmail) {
      return h("p", { class: "hint" },
        "Add the Registered Manager's email in ",
        h("a", { href: "#/settings" }, "Settings"),
        " so it can be copied here.");
    }
    return h("div", { class: "to-box" },
      h("p", { class: "tight" }, "Send to:"),
      h("p", { class: "to-address" }, settings.rmEmail),
      h("button", { class: "btn btn-secondary", type: "button", onclick: (e) => copyAddress(e.currentTarget) },
        "Copy address"));
  }

  function showFiles(xlsxFile, csvFile, count) {
    render(result, 
      h("div", { class: "ok-box" },
        h("p", { class: "tight" }, "File ready"),
        h("p", {}, `${xlsxFile.name}`),
        h("p", { class: "hint" }, `${count} ${count === 1 ? "risk" : "risks"}, refs ${refText}.`)),

      recipientBox(),
      h("button", { class: "btn btn-primary", type: "button", onclick: () => share(xlsxFile, count) },
        "Email to RM"),
      h("p", { class: "hint" },
        "This opens the Share sheet. Choose Mail (use your work email account, not a personal one) " +
        "and paste or pick the address in the To line. Save to Files and AirDrop are in the same sheet."),
      h("button", { class: "btn btn-secondary", type: "button", onclick: () => download(xlsxFile) },
        "Download .xlsx"),
      h("button", { class: "btn btn-secondary", type: "button", onclick: () => download(csvFile) },
        "Download CSV (backup option)"),

      h("details", { class: "guidance" },
        h("summary", {}, "For the person updating the Risk Register"),
        h("ol", { class: "steps" },
          h("li", {}, "Use Excel on a computer (the desktop app). The browser version of Excel has no Skip blanks option."),
          h("li", {}, "Open the file and select the data rows (not the header row), then copy them."),
          h("li", {}, "In the Risk Register tab, click the first empty cell in column A."),
          h("li", {}, "Use Paste Special > Values, tick Skip blanks, and click OK."),
          h("li", {}, "Check the ratings in columns J and O have filled in."))));
  }

  // Build the files now, using the refs worked out above. Nothing is saved yet.
  async function prepare() {
    render(result, h("p", { class: "hint", role: "status" }, "Preparing the file…"));
    errorBox.textContent = "";
    try {
      const XLSX = await loadXlsx();
      const rows = buildRows(config, assessment, toExport, preview.refs);
      const bytes = XLSX.write(buildWorkbook(XLSX, rows), { type: "array", bookType: "xlsx" });
      const xlsxFile = new File([bytes], exportFileName(assessment, "xlsx"), { type: XLSX_TYPE });
      const csvFile = new File([buildCsv(rows)], exportFileName(assessment, "csv"), { type: "text/csv" });
      showFiles(xlsxFile, csvFile, rows.length);
    } catch (err) {
      render(result, 
        h("p", { class: "error" }, `Could not prepare the file: ${err.message}`),
        h("button", { class: "btn btn-secondary", type: "button", onclick: prepare }, "Try again"));
    }
  }

  render(root, 
    h("a", { class: "back", href: `#/assessment/${id}/summary` }, "‹ Summary"),
    h("h2", { class: "first" }, `Export: ${assessment.clientName}`),

    toExport.length === 0
      ? h("p", { class: "prompt" }, "There are no finished risks to export yet.")
      : h("p", {}, `${toExport.length} ${toExport.length === 1 ? "risk" : "risks"} will be exported, ` +
          `as ${refText}.`),

    assessment.exportedAt
      ? h("p", { class: "hint" }, `Last exported on ${formatDate(assessment.exportedAt.slice(0, 10))}. ` +
          "Sharing it again keeps the same risk references.")
      : null,

    left.length === 0 ? null :
      h("details", { class: "prompt unfinished", open: left.length <= 3 },
        h("summary", {}, `${left.length} ${left.length === 1 ? "area" : "areas"} not finished, so not in the export (tap to see)`),
        h("ul", { class: "plain" }, left.map(({ def, i }) =>
          h("li", {}, h("a", { href: `#/assessment/${id}/area/${i}` }, `${i + 1}. ${def.title}`))))),

    h("p", { class: "hint" },
      "The Registered Manager adds exported assessments to the Risk Register. " +
      "Areas marked not applicable are not exported. The ratings (columns J and O) and Action Overdue (W) " +
      "are left blank so the register's own formulas work them out."),

    errorBox,
    result,
    message);

  if (toExport.length > 0) prepare();
}

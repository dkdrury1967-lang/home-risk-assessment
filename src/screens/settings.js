// Settings screen: staff list, risk ref numbering and review interval.
// Every change is saved straight away.
import { h } from "../ui.js";
import { getSettings, saveSettings } from "../db.js";
import {
  formatRiskRef, cleanPrefix, parseRefNumber, parseReviewMonths,
  addStaffName, removeStaffName,
} from "../settings-logic.js";

export async function renderSettings(root) {
  const settings = await getSettings();
  const persisted = navigator.storage && navigator.storage.persisted
    ? await navigator.storage.persisted() : false;

  const savedMsg = h("p", { class: "saved", role: "status" });
  let timer;
  async function save() {
    await saveSettings(settings);
    savedMsg.textContent = "Saved";
    clearTimeout(timer);
    timer = setTimeout(() => (savedMsg.textContent = ""), 1500);
  }

  // ---- Staff list ----
  const staffList = h("ul", { class: "plain staff" });
  const staffError = h("p", { class: "error", role: "alert" });
  const nameInput = h("input", {
    id: "new-staff", type: "text", autocomplete: "off", autocapitalize: "words",
    placeholder: "Add a name",
  });

  function drawStaff() {
    staffList.replaceChildren(...settings.staff.map((name) =>
      h("li", {},
        h("span", {}, name),
        h("button", {
          class: "btn-small", type: "button", "aria-label": `Remove ${name}`,
          onclick: async () => {
            if (!confirm(`Remove ${name} from the staff list? Assessments already saved keep this name.`)) return;
            settings.staff = removeStaffName(settings.staff, name);
            drawStaff();
            await save();
          },
        }, "Remove"))));
    if (settings.staff.length === 0) {
      staffList.append(h("li", { class: "empty" }, "No names yet. Add at least one to assess."));
    }
  }
  drawStaff();

  const addForm = h("form", {
    class: "inline-form",
    onsubmit: async (e) => {
      e.preventDefault();
      const result = addStaffName(settings.staff, nameInput.value);
      staffError.textContent = result.error || "";
      if (result.error) return;
      settings.staff = result.staff;
      nameInput.value = "";
      drawStaff();
      await save();
    },
  }, nameInput, h("button", { class: "btn btn-secondary add", type: "submit" }, "Add"));

  // ---- Risk ref numbering ----
  const preview = h("p", { class: "hint" });
  const refError = h("p", { class: "error", role: "alert" });
  function drawPreview() {
    preview.textContent = `The next risk exported will be ${formatRiskRef(
      settings.riskRefPrefix, settings.nextRiskRefNumber, settings.riskRefDigits)}.`;
  }
  drawPreview();

  const prefixInput = h("input", {
    id: "ref-prefix", type: "text", value: settings.riskRefPrefix,
    autocapitalize: "characters", autocomplete: "off", maxlength: "6",
    onchange: async (e) => {
      const p = cleanPrefix(e.target.value);
      if (!p) { e.target.value = settings.riskRefPrefix; return; }
      settings.riskRefPrefix = p;
      e.target.value = p;
      drawPreview();
      await save();
    },
  });
  const numberInput = h("input", {
    id: "ref-number", type: "number", inputmode: "numeric", min: "1",
    value: String(settings.nextRiskRefNumber),
    onchange: async (e) => {
      const n = parseRefNumber(e.target.value);
      refError.textContent = n ? "" : "Enter a whole number, 1 or more.";
      if (!n) { e.target.value = String(settings.nextRiskRefNumber); return; }
      settings.nextRiskRefNumber = n;
      drawPreview();
      await save();
    },
  });

  // ---- Review interval ----
  const reviewError = h("p", { class: "error", role: "alert" });
  const reviewInput = h("input", {
    id: "review-months", type: "number", inputmode: "numeric", min: "1", max: "60",
    value: String(settings.reviewIntervalMonths),
    onchange: async (e) => {
      const n = parseReviewMonths(e.target.value);
      reviewError.textContent = n ? "" : "Enter a whole number of months, 1 to 60.";
      if (!n) { e.target.value = String(settings.reviewIntervalMonths); return; }
      settings.reviewIntervalMonths = n;
      await save();
    },
  });

  root.replaceChildren(
    h("a", { class: "back", href: "#/" }, "‹ Back"),
    h("h2", { class: "first" }, "Settings"),
    savedMsg,

    h("h3", {}, "Staff list"),
    h("p", { class: "hint" }, "Names offered under “Assessed By”. They must match the names used in the Risk Register."),
    staffList,
    h("label", { for: "new-staff", class: "sr-only" }, "New staff name"),
    addForm,
    staffError,

    h("h3", {}, "Risk reference numbers"),
    h("p", { class: "hint" }, "Set the next number to follow on from the last risk in your Risk Register."),
    h("div", { class: "field-row" },
      h("div", { class: "field" }, h("label", { for: "ref-prefix" }, "Prefix"), prefixInput),
      h("div", { class: "field" }, h("label", { for: "ref-number" }, "Next number"), numberInput)),
    preview,
    refError,

    h("h3", {}, "Review interval"),
    h("div", { class: "field" },
      h("label", { for: "review-months" }, "Next review due after (months)"), reviewInput),
    reviewError,

    h("h3", {}, "Storage"),
    h("p", { class: "hint" }, persisted
      ? "This phone has agreed to keep the app's data."
      : "The phone has not promised to keep the app's data. Export assessments promptly and delete them from the phone afterwards."),
    h("p", { class: "hint" }, "All data stays on this device. The app never sends client information anywhere.")
  );
}

// Settings screen: staff list, risk ref numbering and review interval.
// Every change is saved straight away.
import { h, render } from "../ui.js";
import { getSettings, saveSettings, listAssessments, deleteAssessment } from "../db.js";
import {
  formatRiskRef, cleanPrefix, parseRefNumber, parseReviewMonths, cleanEmail,
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
    render(staffList, ...settings.staff.map((name) =>
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

  // ---- Registered Manager's email (used on the Export screen) ----
  const rmError = h("p", { class: "error", role: "alert" });
  const rmInput = h("input", {
    id: "rm-email", type: "email", inputmode: "email", autocomplete: "off",
    autocapitalize: "none", spellcheck: "false", value: settings.rmEmail || "",
    placeholder: "name@yourorganisation.co.uk",
    onchange: async (e) => {
      const v = cleanEmail(e.target.value);
      rmError.textContent = v === null ? "That does not look like an email address." : "";
      if (v === null) return;
      settings.rmEmail = v;
      e.target.value = v;
      await save();
    },
  });

  // ---- Delete exported assessments ----
  const exported = (await listAssessments()).filter((a) => a.exportedAt);
  const clearMsg = h("p", { class: "hint", role: "status" });
  const clearButton = h("button", {
    class: "btn btn-danger", type: "button", disabled: exported.length === 0,
    onclick: async () => {
      if (!confirm(`Delete ${exported.length} exported ${exported.length === 1 ? "assessment" : "assessments"} from this phone? ` +
        "Check they are pasted into the Risk Register first. This cannot be undone.")) return;
      for (const a of exported) await deleteAssessment(a.id);
      clearMsg.textContent = `Deleted ${exported.length}.`;
      clearButton.textContent = "Delete all exported assessments (0)";
      clearButton.disabled = true;
    },
  }, `Delete all exported assessments (${exported.length})`);

  render(root, 
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
    h("p", { class: "hint" }, "Each assessor needs their own prefix (for example initials such as DD or SC), so refs never clash in the Risk Register. " +
      "Set the next number to follow on from your own last ref."),
    h("div", { class: "field-row" },
      h("div", { class: "field" }, h("label", { for: "ref-prefix" }, "Prefix"), prefixInput),
      h("div", { class: "field" }, h("label", { for: "ref-number" }, "Next number"), numberInput)),
    preview,
    refError,

    h("h3", {}, "Review interval"),
    h("div", { class: "field" },
      h("label", { for: "review-months" }, "Next review due after (months)"), reviewInput),
    reviewError,

    h("h3", {}, "Registered Manager"),
    h("p", { class: "hint" },
      "Exported assessments are emailed to the Registered Manager, who adds them to the Risk Register. " +
      "Use a work email address. It is stored only on this phone."),
    h("div", { class: "field" }, h("label", { for: "rm-email" }, "Registered Manager's email"), rmInput),
    rmError,

    h("h3", {}, "Clear exported assessments"),
    h("p", { class: "hint" },
      "Once the Registered Manager has confirmed an assessment is in the Risk Register, delete it from the phone, " +
      "and delete the sent email from your Sent and Deleted items. " +
      "This removes only assessments that have been exported."),
    clearButton,
    clearMsg,

    h("h3", {}, "Storage"),
    h("p", { class: "hint" }, persisted
      ? "This phone has agreed to keep the app's data."
      : "The phone has not promised to keep the app's data. Export assessments promptly and delete them from the phone afterwards."),
    h("p", { class: "hint" }, "All data stays on this device. The app never sends client information anywhere.")
  );
}

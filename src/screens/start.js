// Start screen: client name, assessor, dates.
import { h, render } from "../ui.js";
import { loadContent } from "../content.js";
import { getSettings, saveAssessment } from "../db.js";
import { newAssessment, todayISO, addMonthsISO } from "../assessment-logic.js";

function makeId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function renderStart(root) {
  const [content, settings] = await Promise.all([loadContent(), getSettings()]);

  if (settings.staff.length === 0) {
    render(root, 
      h("a", { class: "back", href: "#/" }, "‹ Back"),
      h("p", {}, "Add at least one name to the staff list before starting."),
      h("a", { class: "btn btn-primary", href: "#/settings" }, "Go to Settings"));
    return;
  }

  const today = todayISO();
  let reviewEdited = false;

  const nameInput = h("input", {
    id: "client-name", type: "text", autocomplete: "off", autocapitalize: "words",
  });
  const assessor = h("select", { id: "assessed-by" },
    h("option", { value: "" }, "Choose a name…"),
    settings.staff.map((s) => h("option", { value: s }, s)));
  const dateInput = h("input", { id: "date-assessed", type: "date", value: today });
  const reviewInput = h("input", {
    id: "review-due", type: "date",
    value: addMonthsISO(today, settings.reviewIntervalMonths),
  });
  reviewInput.addEventListener("change", () => (reviewEdited = true));
  dateInput.addEventListener("change", () => {
    if (!reviewEdited && dateInput.value) {
      reviewInput.value = addMonthsISO(dateInput.value, settings.reviewIntervalMonths);
    }
  });

  const error = h("p", { class: "error", role: "alert" });

  const form = h("form", {
    onsubmit: async (e) => {
      e.preventDefault();
      if (!nameInput.value.trim()) { error.textContent = "Enter the client's name."; return; }
      if (!assessor.value) { error.textContent = "Choose who is assessing."; return; }
      if (!dateInput.value || !reviewInput.value) { error.textContent = "Both dates are needed."; return; }
      const assessment = newAssessment({
        id: makeId(),
        clientName: nameInput.value,
        assessedBy: assessor.value,
        dateAssessed: dateInput.value,
        nextReviewDue: reviewInput.value,
        areaIds: content.areas.map((a) => a.id),
        now: new Date().toISOString(),
      });
      await saveAssessment(assessment);
      location.hash = `#/assessment/${assessment.id}/area/0`;
    },
  },
    h("div", { class: "field" }, h("label", { for: "client-name" }, "Client name"), nameInput),
    h("div", { class: "field" }, h("label", { for: "assessed-by" }, "Assessed by"), assessor),
    h("div", { class: "field" }, h("label", { for: "date-assessed" }, "Date assessed"), dateInput),
    h("div", { class: "field" }, h("label", { for: "review-due" }, "Next review due"), reviewInput),
    error,
    h("button", { class: "btn btn-primary", type: "submit" }, "Begin assessment"));

  render(root, 
    h("a", { class: "back", href: "#/" }, "‹ Back"),
    h("h2", { class: "first" }, "New assessment"),
    h("p", { class: "warn" }, content.warnings.noCodes),
    form);
}

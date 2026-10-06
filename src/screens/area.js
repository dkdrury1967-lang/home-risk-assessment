// One risk area. Every change is autosaved. Ratings update live.
import { h } from "../ui.js";
import { loadContent, loadRatingConfig } from "../content.js";
import { getAssessment, getSettings } from "../db.js";
import { createAutosaver } from "../autosave.js";
import { segmented, ratingChip, setChip, textField } from "../components.js";
import { blankArea, areaRatings, residualWarnings, YES, NO, UNASSESSED } from "../assessment-logic.js";
import { needsActionPrompt } from "../rating.js";

export async function renderArea(root, id, indexText) {
  const [content, config, assessment, settings] = await Promise.all([
    loadContent(), loadRatingConfig(), getAssessment(id), getSettings(),
  ]);
  const index = Number(indexText);
  const def = content.areas[index];
  if (!assessment || !def) {
    location.hash = assessment ? `#/assessment/${id}` : "#/";
    return;
  }
  const total = content.areas.length;
  const data = (assessment.areas[def.id] ||= blankArea());

  const savedNote = h("span", { class: "saved-note", role: "status" });
  let noteTimer;
  const saver = createAutosaver(assessment, () => {
    savedNote.textContent = "Saved";
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => (savedNote.textContent = ""), 1500);
  });

  // Change one field, then refresh the live bits and save.
  const set = (field) => (value) => { data[field] = value; refresh(); saver.schedule(); };
  const scale = content.scale.map((v) => ({ value: v }));

  // ---- Live bits (updated by refresh) ----
  const inherentChip = ratingChip(config, null, "Inherent: ");
  const residualChip = ratingChip(config, null, "Residual: ");
  const actionPrompt = h("p", { class: "prompt", role: "status" });
  const residualWarning = h("p", { class: "warn", role: "status" });

  // ---- Sections ----
  const notApplicableNote = h("p", { class: "hint" },
    "Marked as not applicable. This area will not be exported as a risk.");

  const staffList = h("datalist", { id: "staff-names" },
    settings.staff.map((s) => h("option", { value: s })));

  const riskSection = h("div", {},
    h("p", { class: "warn" }, content.warnings.noCodes),
    textField({ label: "Risk description", multiline: true, value: data.description, onInput: set("description") }),
    textField({ label: "Caused by", multiline: true, value: data.causedBy, onInput: set("causedBy") }),
    textField({ label: "Consequences", multiline: true, value: data.consequences, onInput: set("consequences") }),

    h("h3", {}, "Inherent risk (before controls)"),
    segmented({ legend: "Probability", options: scale, value: data.inherentProb, onChange: set("inherentProb"), className: "five" }),
    segmented({ legend: "Impact", options: scale, value: data.inherentImpact, onChange: set("inherentImpact"), className: "five" }),
    h("p", {}, inherentChip),

    h("h3", {}, "Controls"),
    textField({ label: "Controls in place", multiline: true, value: data.controls, onInput: set("controls") }),
    textField({ label: "Control owner", value: data.controlOwner, onInput: set("controlOwner"), list: "staff-names" }),

    h("h3", {}, "Residual risk (after controls)"),
    segmented({ legend: "Probability", options: scale, value: data.residualProb, onChange: set("residualProb"), className: "five" }),
    segmented({ legend: "Impact", options: scale, value: data.residualImpact, onChange: set("residualImpact"), className: "five" }),
    h("p", {}, residualChip),
    residualWarning,

    h("h3", {}, "Action"),
    actionPrompt,
    segmented({
      legend: "Action required?",
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
      value: data.actionRequired === true ? "yes" : data.actionRequired === false ? "no" : "",
      onChange: (v) => set("actionRequired")(v === "yes"),
      className: "two",
    }));

  const actionFields = h("div", {},
    textField({ label: "Required action", multiline: true, value: data.requiredAction, onInput: set("requiredAction") }),
    textField({ label: "Action owner", value: data.actionOwner, onInput: set("actionOwner"), list: "staff-names" }),
    segmented({
      legend: "Priority",
      options: content.priorities.map((v) => ({ value: v })),
      value: data.priority, onChange: set("priority"), className: "three",
    }),
    h("div", { class: "field" },
      h("label", { for: "target-date" }, "Target completion date"),
      h("input", {
        id: "target-date", type: "date", value: data.targetDate,
        oninput: (e) => set("targetDate")(e.target.value),
      })));
  riskSection.append(actionFields);

  function refresh() {
    const { inherent, residual } = areaRatings(config, data);
    setChip(inherentChip, config, inherent, "Inherent: ");
    setChip(residualChip, config, residual, "Residual: ");

    riskSection.hidden = data.applicable !== YES;
    notApplicableNote.hidden = data.applicable !== NO;
    actionFields.hidden = data.actionRequired !== true;

    const warnings = residualWarnings(config, data);
    residualWarning.hidden = warnings.length === 0;
    residualWarning.textContent = warnings.length
      ? `${warnings.join(" ")} Controls should lower a risk. Check this is right.` : "";

    if (needsActionPrompt(residual) && data.actionRequired === null) {
      actionPrompt.textContent = `Residual risk is ${residual}. An action is expected. Please answer below.`;
      actionPrompt.hidden = false;
    } else if (needsActionPrompt(residual) && data.actionRequired === false) {
      actionPrompt.textContent = `Residual risk is ${residual} but no action is set. Check that is right.`;
      actionPrompt.hidden = false;
    } else {
      actionPrompt.hidden = true;
    }
  }
  refresh();

  // ---- Navigation ----
  const go = (hash) => async () => { await saver.flush(); location.hash = hash; };
  const prevHash = index === 0 ? `#/assessment/${id}` : `#/assessment/${id}/area/${index - 1}`;
  const nextHash = index === total - 1 ? `#/assessment/${id}/summary` : `#/assessment/${id}/area/${index + 1}`;

  root.replaceChildren(
    h("div", { class: "top-row" },
      h("a", { class: "back", href: `#/assessment/${id}`, onclick: () => saver.flush() }, "‹ Overview"),
      savedNote),
    h("p", { class: "progress-text" }, `Area ${index + 1} of ${total}`),
    h("div", { class: "bar", role: "presentation" },
      h("div", { class: "bar-fill", style: `width:${((index + 1) / total) * 100}%` })),

    h("h2", { class: "first" }, def.title),
    h("p", {}, def.question),
    h("details", { class: "guidance" },
      h("summary", {}, "Guidance"),
      h("ul", {}, def.guidance.map((g) => h("li", {}, g)))),

    segmented({
      legend: "Risk applicable?",
      options: [
        { value: YES, label: "Yes" }, { value: NO, label: "No" },
        { value: UNASSESSED, label: "Not assessed yet" },
      ],
      value: data.applicable, onChange: set("applicable"), className: "three",
    }),
    notApplicableNote,
    riskSection,
    staffList,

    h("div", { class: "nav-bar" },
      h("button", { class: "btn btn-secondary", type: "button", onclick: go(prevHash) },
        index === 0 ? "‹ Overview" : "‹ Back"),
      h("button", { class: "btn btn-primary", type: "button", onclick: go(nextHash) },
        index === total - 1 ? "Finish" : "Next ›")));
}

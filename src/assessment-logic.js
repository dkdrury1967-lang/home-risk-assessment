// Plain rules for an assessment: dates, blank records, and what counts as
// "complete". No browser code, so the automated tests can check it.
import { getRating, needsActionPrompt } from "./rating.js";

export const YES = "yes";
export const NO = "no";
export const UNASSESSED = "unassessed";

const pad = (n) => String(n).padStart(2, "0");

/** Today as yyyy-mm-dd in the phone's own time zone. */
export function todayISO(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Add months to a yyyy-mm-dd date. 31 Jan + 1 month gives 28/29 Feb, not March. */
export function addMonthsISO(iso, months) {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(Math.min(d, lastDay))}`;
}

/** An area with nothing filled in yet. */
export function blankArea() {
  return {
    applicable: UNASSESSED,
    description: "", causedBy: "", consequences: "",
    inherentProb: "", inherentImpact: "",
    controls: "", controlOwner: "",
    residualProb: "", residualImpact: "",
    actionRequired: null, // null = not answered, true = yes, false = no
    requiredAction: "", actionOwner: "", priority: "", targetDate: "",
  };
}

/** A new assessment record, with a blank area for every risk area id. */
export function newAssessment({ id, clientName, assessedBy, dateAssessed, nextReviewDue, areaIds, now }) {
  const areas = {};
  for (const areaId of areaIds) areas[areaId] = blankArea();
  return {
    id,
    clientName: clientName.trim(),
    assessedBy,
    dateAssessed,
    nextReviewDue,
    createdAt: now,
    updatedAt: now,
    exportedAt: null,
    areas,
  };
}

/** Inherent and residual rating names for one area (null until both answers are in). */
export function areaRatings(config, area) {
  return {
    inherent: getRating(config, area.inherentProb, area.inherentImpact),
    residual: getRating(config, area.residualProb, area.residualImpact),
  };
}

/** Is an action needed? Answer wins; otherwise Critical/Severe is "not answered". */
export function actionIsRequired(area) {
  return area.actionRequired === true;
}

/** Names of the things still missing in an area (empty when it is finished). */
export function missingItems(config, area) {
  if (area.applicable === UNASSESSED) return ["Is this risk applicable?"];
  if (area.applicable === NO) return [];
  const missing = [];
  if (!area.description.trim()) missing.push("Risk description");
  if (!area.inherentProb || !area.inherentImpact) missing.push("Inherent probability and impact");
  if (!area.controls.trim()) missing.push("Controls in place");
  if (!area.residualProb || !area.residualImpact) missing.push("Residual probability and impact");

  const { residual } = areaRatings(config, area);
  if (area.actionRequired === null && needsActionPrompt(residual)) {
    missing.push("Is an action required?");
  }
  if (area.actionRequired === true) {
    if (!area.requiredAction.trim()) missing.push("Required action");
    if (!area.actionOwner.trim()) missing.push("Action owner");
    if (!area.priority) missing.push("Priority");
    if (!area.targetDate) missing.push("Target completion date");
  }
  return missing;
}

/** "not-started" | "not-applicable" | "incomplete" | "complete" */
export function areaStatus(config, area) {
  if (area.applicable === UNASSESSED) return "not-started";
  if (area.applicable === NO) return "not-applicable";
  return missingItems(config, area).length === 0 ? "complete" : "incomplete";
}

/** How many areas are finished (complete or marked not applicable). */
export function progress(config, assessment, areaIds) {
  const done = areaIds.filter((id) => {
    const s = areaStatus(config, assessment.areas[id] || blankArea());
    return s === "complete" || s === "not-applicable";
  }).length;
  return { done, total: areaIds.length };
}

/** Position of the first area that is not finished, or -1 when all are. */
export function firstUnfinishedIndex(config, assessment, areaIds) {
  return areaIds.findIndex((id) => {
    const s = areaStatus(config, assessment.areas[id] || blankArea());
    return s !== "complete" && s !== "not-applicable";
  });
}

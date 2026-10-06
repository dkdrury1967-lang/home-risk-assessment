// Overview of one assessment: every risk area with its status, so you can
// jump to any area, continue where you left off, or delete the assessment.
import { h, render } from "../ui.js";
import { loadContent, loadRatingConfig } from "../content.js";
import { getAssessment, deleteAssessment } from "../db.js";
import { ratingChip } from "../components.js";
import {
  areaStatus, areaRatings, blankArea, progress, firstUnfinishedIndex,
} from "../assessment-logic.js";
import { formatDate } from "../dates.js";

const STATUS_TEXT = {
  "not-started": "Not started",
  "not-applicable": "Not applicable",
  incomplete: "In progress",
  complete: "Complete",
};

export async function renderOverview(root, id) {
  const [content, config, assessment] = await Promise.all([
    loadContent(), loadRatingConfig(), getAssessment(id),
  ]);
  if (!assessment) {
    render(root, 
      h("a", { class: "back", href: "#/" }, "‹ Home"),
      h("p", {}, "That assessment could not be found."));
    return;
  }
  const ids = content.areas.map((a) => a.id);
  const { done, total } = progress(config, assessment, ids);
  const next = firstUnfinishedIndex(config, assessment, ids);

  const rows = content.areas.map((def, i) => {
    const area = assessment.areas[def.id] || blankArea();
    const status = areaStatus(config, area);
    const { residual } = areaRatings(config, area);
    return h("li", {},
      h("a", { class: `area-row ${status}`, href: `#/assessment/${id}/area/${i}` },
        h("span", { class: "area-num" }, String(i + 1)),
        h("span", { class: "area-main" },
          h("span", { class: "area-title" }, def.title),
          h("span", { class: "area-status" }, STATUS_TEXT[status])),
        status === "complete" || status === "incomplete"
          ? ratingChip(config, residual) : null));
  });

  render(root, 
    h("a", { class: "back", href: "#/" }, "‹ Home"),
    h("h2", { class: "first" }, assessment.clientName),
    h("p", { class: "hint" },
      `Assessed by ${assessment.assessedBy} on ${formatDate(assessment.dateAssessed)}. ` +
      `Next review ${formatDate(assessment.nextReviewDue)}.`),
    h("p", { class: "progress-text" }, `${done} of ${total} areas finished`),
    h("div", { class: "bar", role: "presentation" },
      h("div", { class: "bar-fill", style: `width:${(done / total) * 100}%` })),

    next === -1
      ? h("p", { class: "hint" }, "All areas are finished.")
      : h("a", { class: "btn btn-primary", href: `#/assessment/${id}/area/${next}` },
          done === 0 ? "Start with area 1" : `Continue with area ${next + 1}`),

    h("a", { class: "btn btn-secondary", href: `#/assessment/${id}/summary` }, "View summary and heat map"),
    h("a", { class: "btn btn-secondary", href: `#/assessment/${id}/export` }, "Export / Email to RM"),

    h("ul", { class: "plain areas" }, rows),

    h("button", {
      class: "btn btn-danger", type: "button",
      onclick: async () => {
        if (!confirm(`Delete the assessment for ${assessment.clientName}? This cannot be undone.`)) return;
        await deleteAssessment(id);
        location.hash = "#/";
      },
    }, "Delete this assessment"));
}

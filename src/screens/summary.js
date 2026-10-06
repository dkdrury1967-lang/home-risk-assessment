// Summary: the risks with their ratings, the number of actions, a 5x5 heat
// map of residual risks, and a list of areas not finished yet.
import { h } from "../ui.js";
import { loadContent, loadRatingConfig } from "../content.js";
import { getAssessment } from "../db.js";
import { ratingChip } from "../components.js";
import {
  areaStatus, areaRatings, blankArea, progress, heatmap, summaryCounts, missingItems,
  residualWarnings, YES,
} from "../assessment-logic.js";
import { formatDate } from "../dates.js";

export async function renderSummary(root, id) {
  const [content, config, assessment] = await Promise.all([
    loadContent(), loadRatingConfig(), getAssessment(id),
  ]);
  if (!assessment) {
    root.replaceChildren(
      h("a", { class: "back", href: "#/" }, "‹ Home"),
      h("p", {}, "That assessment could not be found."));
    return;
  }
  const ids = content.areas.map((a) => a.id);
  const { done, total } = progress(config, assessment, ids);
  const counts = summaryCounts(config, assessment, ids);
  const areaOf = (i) => assessment.areas[ids[i]] || blankArea();

  // ---- Areas not finished ----
  const unfinished = content.areas
    .map((def, i) => ({ def, i, status: areaStatus(config, areaOf(i)) }))
    .filter(({ status }) => status === "not-started" || status === "incomplete");

  const unfinishedBlock = unfinished.length === 0
    ? h("p", { class: "ok" }, "All 16 areas are finished.")
    : h("details", { class: "prompt unfinished", open: unfinished.length <= 3 },
        h("summary", {}, `${unfinished.length} ${unfinished.length === 1 ? "area is" : "areas are"} not finished (tap to see)`),
        h("ul", { class: "plain" }, unfinished.map(({ def, i, status }) => {
          const missing = status === "not-started" ? "not started" : missingItems(config, areaOf(i)).join(", ");
          return h("li", {},
            h("a", { href: `#/assessment/${id}/area/${i}` }, `${i + 1}. ${def.title}`),
            h("span", { class: "missing" }, ` — ${missing}`));
        })));

  // ---- Risk list ----
  const riskRows = content.areas
    .map((def, i) => ({ def, i, area: areaOf(i) }))
    .filter(({ area }) => area.applicable === YES)
    .map(({ def, i, area }) => {
      const { inherent, residual } = areaRatings(config, area);
      const checks = residualWarnings(config, area);
      return h("li", { class: "risk-row" },
        h("a", { href: `#/assessment/${id}/area/${i}` },
          h("span", { class: "area-title" }, `${i + 1}. ${def.title}`),
          h("span", { class: "chips" },
            ratingChip(config, inherent, "Inherent: "),
            ratingChip(config, residual, "Residual: ")),
          area.actionRequired === true
            ? h("span", { class: "area-status" }, `Action${area.priority ? ` (${area.priority})` : ""}: ${area.requiredAction || "details missing"}`)
            : null,
          checks.length ? h("span", { class: "check" }, "Check: residual is higher than inherent") : null));
    });

  // ---- Heat map ----
  const impacts = [...config.levels].reverse();
  const short = { "Very high": "Very high", "High": "High", "Medium": "Med", "Low": "Low", "Very Low": "Very low" };
  const map = heatmap(config, assessment, ids);
  const table = h("table", { class: "heatmap" },
    h("caption", {}, "Residual risks. Numbers are the area numbers."),
    h("thead", {},
      h("tr", {},
        h("th", { class: "corner", scope: "col" }, "Prob. ↓ Impact →"),
        impacts.map((imp) => h("th", { scope: "col" }, short[imp])))),
    h("tbody", {}, map.map((row) =>
      h("tr", {},
        h("th", { scope: "row" }, short[row[0].probability]),
        row.map((cell) => {
          const colours = config.ratings[cell.rating];
          return h("td", {
            style: `background:${colours.background};color:${colours.text}`,
            title: `${cell.probability} probability, ${cell.impact} impact: ${cell.rating}`,
          }, cell.areas.join(" "));
        })))));

  const p = counts.byPriority;
  const priorityText = counts.actions === 0 ? "" :
    ` (High ${p.High}, Medium ${p.Medium}, Low ${p.Low}${p["Not set"] ? `, no priority ${p["Not set"]}` : ""})`;

  root.replaceChildren(
    h("a", { class: "back", href: `#/assessment/${id}` }, "‹ Overview"),
    h("h2", { class: "first" }, `Summary: ${assessment.clientName}`),
    h("p", { class: "hint" },
      `Assessed by ${assessment.assessedBy} on ${formatDate(assessment.dateAssessed)}. ` +
      `Next review ${formatDate(assessment.nextReviewDue)}.`),

    h("div", { class: "stats" },
      h("div", { class: "stat" }, h("b", {}, String(counts.risks)), "risks"),
      h("div", { class: "stat" }, h("b", {}, String(counts.actions)), "actions"),
      h("div", { class: "stat" }, h("b", {}, `${done}/${total}`), "areas done")),
    counts.actions ? h("p", { class: "hint" }, `Actions${priorityText}`) : null,

    unfinishedBlock,

    h("h3", {}, "Heat map"),
    table,

    h("h3", {}, "Risks"),
    riskRows.length === 0
      ? h("p", { class: "empty" }, "No applicable risks recorded yet.")
      : h("ul", { class: "plain areas" }, riskRows),

    h("button", { class: "btn btn-primary", type: "button", disabled: true }, "Export to Excel"),
    h("p", { class: "hint" }, "Export comes in the next step."));
}

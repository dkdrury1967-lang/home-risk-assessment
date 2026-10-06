// Summary: the risks with their ratings, the number of actions, a 5x5 heat
// map of residual risks, and a list of areas not finished yet.
import { h } from "../ui.js";
import { loadContent, loadRatingConfig } from "../content.js";
import { getAssessment } from "../db.js";
import { ratingChip, segmented } from "../components.js";
import {
  areaStatus, areaRatings, blankArea, progress, heatmap, heatmapOmissions, summaryCounts, missingItems,
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
          checks.map((c) => h("span", { class: "check" }, `Check: ${c}`))));
    });

  // ---- Heat map (residual = after controls, inherent = before controls) ----
  const impacts = [...config.levels].reverse();
  const short = { "Very high": "Very high", "High": "High", "Medium": "Med", "Low": "Low", "Very Low": "Very low" };
  const heatBox = h("div", {});

  function drawHeat(view) {
    const map = heatmap(config, assessment, ids, view);
    const label = view === "inherent" ? "Inherent risk (before controls)" : "Residual risk (after controls)";
    const table = h("table", { class: "heatmap" },
      h("caption", {}, label),
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

    // Legend: what each number in the grid means
    const plotted = map.flat().flatMap((c) => c.areas).sort((a, b) => a - b);
    const legend = plotted.length === 0
      ? h("p", { class: "hint" }, "No risks to show yet.")
      : h("div", {},
          h("p", { class: "hint tight-hint" }, "Each number is an area:"),
          h("ul", { class: "legend" }, plotted.map((n) =>
            h("li", {}, h("b", {}, String(n)), ` ${content.areas[n - 1].title}`))));

    // What is not on the map, and why
    const om = heatmapOmissions(assessment, ids, view);
    const notes = [];
    if (om.notApplicable) notes.push(`${om.notApplicable} ${om.notApplicable === 1 ? "area" : "areas"} marked not applicable`);
    if (om.notAssessed) notes.push(`${om.notAssessed} not assessed yet`);
    if (om.notRated) notes.push(`${om.notRated} without ${view} ratings`);
    const omitted = notes.length
      ? h("p", { class: "hint" }, `Not shown: ${notes.join(", ")}.`) : null;

    heatBox.replaceChildren(table, legend, omitted);
  }
  drawHeat("residual");

  const viewSwitch = segmented({
    legend: "Show on the heat map",
    options: [
      { value: "residual", label: "Residual (after controls)" },
      { value: "inherent", label: "Inherent (before controls)" },
    ],
    value: "residual",
    onChange: drawHeat,
    className: "two",
  });

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
      h("div", { class: "stat" }, h("b", {}, String(counts.risks)), counts.risks === 1 ? "risk" : "risks"),
      h("div", { class: "stat" }, h("b", {}, String(counts.actions)), counts.actions === 1 ? "action" : "actions"),
      h("div", { class: "stat" }, h("b", {}, `${done}/${total}`), "areas done")),
    counts.actions ? h("p", { class: "hint" }, `Actions${priorityText}`) : null,

    unfinishedBlock,

    h("h3", {}, "Heat map"),
    viewSwitch,
    heatBox,

    h("h3", {}, "Risks"),
    riskRows.length === 0
      ? h("p", { class: "empty" }, "No applicable risks recorded yet.")
      : h("ul", { class: "plain areas" }, riskRows),

    h("a", { class: "btn btn-primary", href: `#/assessment/${id}/export` }, "Export to Excel"));
}

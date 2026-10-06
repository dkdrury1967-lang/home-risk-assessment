// Home screen: start a new assessment, see saved ones, open Settings.
import { h } from "../ui.js";
import { loadContent, loadRatingConfig } from "../content.js";
import { listAssessments } from "../db.js";
import { progress } from "../assessment-logic.js";
import { formatDate } from "../dates.js";

export async function renderHome(root) {
  const [content, config, saved] = await Promise.all([
    loadContent(), loadRatingConfig(), listAssessments(),
  ]);
  const ids = content.areas.map((a) => a.id);
  saved.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  root.replaceChildren(
    h("a", { class: "btn btn-primary", href: "#/assessment/new" }, "Start new assessment"),

    h("h2", {}, "Saved assessments"),
    saved.length === 0
      ? h("p", { class: "empty" }, "None yet.")
      : h("ul", { class: "plain areas" }, saved.map((a) => {
          const { done, total } = progress(config, a, ids);
          return h("li", {},
            h("a", { class: "area-row", href: `#/assessment/${a.id}` },
              h("span", { class: "area-main" },
                h("span", { class: "area-title" }, a.clientName),
                h("span", { class: "area-status" },
                  `${formatDate(a.dateAssessed)} · ${done} of ${total} areas finished`))));
        })),

    h("a", { class: "btn btn-secondary", href: "#/settings" }, "Settings"),

    h("section", { class: "notice", "aria-label": "Data protection notes" },
      h("h2", {}, "Keep client data safe"),
      h("ul", {}, Object.values(content.warnings).map((t) => h("li", {}, t)))));
}

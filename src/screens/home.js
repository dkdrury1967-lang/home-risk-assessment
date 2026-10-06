// Home screen: start a new assessment, see saved ones, open Settings.
import { h } from "../ui.js";
import { loadContent } from "../content.js";
import { listAssessments } from "../db.js";

export async function renderHome(root) {
  const content = await loadContent();
  const saved = await listAssessments();

  root.replaceChildren(
    h("button", { class: "btn btn-primary", type: "button", disabled: true },
      "Start new assessment"),
    h("p", { class: "hint" }, "The assessment screens are coming in the next step."),

    h("h2", {}, "Saved assessments"),
    saved.length === 0
      ? h("p", { class: "empty" }, "None yet.")
      : h("ul", { class: "plain" }, saved.map((a) => h("li", {}, a.clientName || "Unnamed"))),

    h("a", { class: "btn btn-secondary", href: "#/settings" }, "Settings"),

    h("section", { class: "notice", "aria-label": "Data protection notes" },
      h("h2", {}, "Keep client data safe"),
      h("ul", {}, Object.values(content.warnings).map((t) => h("li", {}, t)))
    )
  );
}

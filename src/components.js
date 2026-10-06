// Small reusable pieces for the screens.
import { h } from "./ui.js";

let groupCounter = 0;

/**
 * A row of big tap-friendly choices (radio buttons that look like buttons).
 * options: [{ value, label? }]. onChange gets the chosen value.
 */
export function segmented({ legend, options, value, onChange, className = "" }) {
  const name = `seg-${++groupCounter}`;
  const row = h("div", { class: `seg ${className}` });
  for (const opt of options) {
    row.append(
      h("label", { class: "seg-opt" },
        h("input", {
          type: "radio", name, value: opt.value,
          checked: opt.value === value,
          onchange: () => onChange(opt.value),
        }),
        h("span", {}, opt.label ?? opt.value))
    );
  }
  return h("fieldset", { class: "seg-group" }, h("legend", {}, legend), row);
}

/** A coloured pill showing a rating, e.g. "Severe". */
export function ratingChip(config, rating, prefix = "") {
  const chip = h("span", { class: "chip" });
  setChip(chip, config, rating, prefix);
  return chip;
}

export function setChip(chip, config, rating, prefix = "") {
  const colours = rating && config.ratings[rating];
  chip.textContent = `${prefix}${rating || "not rated yet"}`;
  chip.style.background = colours ? colours.background : "#e6e6e6";
  chip.style.color = colours ? colours.text : "#333";
}

/** A labelled text box (or multi-line box). */
export function textField({ label, value, onInput, multiline = false, list, help }) {
  const id = `f-${++groupCounter}`;
  const attrs = {
    id, autocomplete: "off", autocapitalize: "sentences",
    oninput: (e) => onInput(e.target.value),
  };
  const input = multiline
    ? h("textarea", { ...attrs, rows: "3" }, value || "")
    : h("input", { ...attrs, type: "text", value: value || "", ...(list ? { list } : {}) });
  return h("div", { class: "field" },
    h("label", { for: id }, label),
    help ? h("p", { class: "hint" }, help) : null,
    input);
}

/**
 * A labelled drop-down of the staff list. The Risk Register only accepts names
 * from its own staff list, so owners are chosen, not typed. If the saved name
 * is no longer in the list it stays selectable so nothing is silently lost.
 */
export function staffSelect({ label, value, staff, onInput }) {
  const id = `f-${++groupCounter}`;
  const names = value && !staff.includes(value) ? [...staff, value] : staff;
  const select = h("select", { id, onchange: (e) => onInput(e.target.value) },
    h("option", { value: "" }, "Choose a name…"),
    names.map((n) => h("option", { value: n, selected: n === value }, n)));
  return h("div", { class: "field" }, h("label", { for: id }, label), select);
}

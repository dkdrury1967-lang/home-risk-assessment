// An on-screen number pad with dots, used to enter the passcode. Built here
// (rather than a text box) so the iPhone never offers to save a "password".
import { h } from "./ui.js";

export function createKeypad({ length, onComplete }) {
  let digits = "";
  let disabled = false;

  const dots = h("div", { class: "pin-dots", role: "img" });
  function draw() {
    dots.setAttribute("aria-label", `${digits.length} of ${length} digits entered`);
    dots.replaceChildren(...Array.from({ length }, (_, i) =>
      h("span", { class: i < digits.length ? "pin-dot filled" : "pin-dot" })));
  }

  function press(d) {
    if (disabled || digits.length >= length) return;
    digits += d;
    draw();
    if (digits.length === length) {
      disabled = true; // until the caller calls reset()
      onComplete(digits);
    }
  }

  const key = (label, onclick, extra = "") =>
    h("button", { class: `key ${extra}`, type: "button", onclick, "aria-label": label }, label);

  const pad = h("div", { class: "keypad" },
    ["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => key(d, () => press(d))),
    h("span", {}),
    key("0", () => press("0")),
    h("button", {
      class: "key key-back", type: "button", "aria-label": "Delete last digit",
      onclick: () => { if (!disabled && digits) { digits = digits.slice(0, -1); draw(); } },
    }, "⌫"));

  draw();
  return {
    element: h("div", { class: "keypad-wrap" }, dots, pad),
    /** Clear the dots and allow typing again. */
    reset() { digits = ""; disabled = false; pad.classList.remove("off"); draw(); },
    /** Stop (or allow) typing, for example during a wait. */
    setDisabled(value) { disabled = value; pad.classList.toggle("off", value); },
  };
}

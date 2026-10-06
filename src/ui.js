// Tiny helper for building screens: h("p", { class: "x" }, "text", child...)
// Text is always added as plain text (never as HTML), so typed names and
// notes can never break the page.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else if (value === true) el.setAttribute(key, "");
    else if (value !== false && value != null) el.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(child));
  }
  return el;
}

/**
 * Replace everything inside a parent with the given pieces. Pieces that are
 * empty (null, undefined, false) are skipped. The browser's own
 * replaceChildren would print them as the word "null".
 */
export function render(parent, ...nodes) {
  parent.replaceChildren(...nodes.flat().filter((n) => n !== null && n !== undefined && n !== false));
}

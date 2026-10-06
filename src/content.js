// Loads the editable content file (src/data/risk-areas.json) once.
let cached;
export function loadContent() {
  if (!cached) {
    cached = fetch("src/data/risk-areas.json").then((r) => r.json());
  }
  return cached;
}

// Loads the editable content file (src/data/risk-areas.json) once.
let cached;
export function loadContent() {
  if (!cached) {
    cached = fetch("src/data/risk-areas.json").then((r) => r.json());
  }
  return cached;
}

// The rating table and colours (src/config/rating-matrix.json), loaded once.
let cachedRatings;
export function loadRatingConfig() {
  if (!cachedRatings) {
    cachedRatings = fetch("src/config/rating-matrix.json").then((r) => r.json());
  }
  return cachedRatings;
}

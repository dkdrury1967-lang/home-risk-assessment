// Rating logic. Pure functions with no browser or file access, so the same
// code runs in the app and in the automated test. The config object comes
// from src/config/rating-matrix.json.

/** Look up the rating name (e.g. "Severe") for a probability and impact. */
export function getRating(config, probability, impact) {
  const row = config.matrix[probability];
  const rating = row && row[impact];
  // Anything missing (e.g. not answered yet) gives no rating.
  return rating || null;
}

/** Colours for a rating name, or null if the rating is unknown. */
export function getRatingColours(config, rating) {
  return config.ratings[rating] || null;
}

/** True when an action should be prompted automatically (Critical or Severe). */
export function needsActionPrompt(rating) {
  return rating === "Critical" || rating === "Severe";
}

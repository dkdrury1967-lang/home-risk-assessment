// Showing dates the UK way. Dates are stored as yyyy-mm-dd.
export function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

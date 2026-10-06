// Plain rules for the Settings screen. No browser code here, so the same
// functions run in the app and in the automated tests.

/** Build a risk ref such as "RR008" from the prefix, number and digit count. */
export function formatRiskRef(prefix, number, digits) {
  return `${prefix}${String(number).padStart(digits, "0")}`;
}

/** Prefix: letters and numbers only, upper case, up to 6 characters. */
export function cleanPrefix(text) {
  return String(text).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
}

/** Next ref number: a whole number from 1 upwards. Returns null if not valid. */
export function parseRefNumber(text) {
  const n = Number(String(text).trim());
  return Number.isInteger(n) && n >= 1 && n <= 999999 ? n : null;
}

/** Review interval in months: a whole number from 1 to 60, or null. */
export function parseReviewMonths(text) {
  const n = Number(String(text).trim());
  return Number.isInteger(n) && n >= 1 && n <= 60 ? n : null;
}

/**
 * Add a name to the staff list. Returns { staff, error }.
 * Names are trimmed, must not be empty, and must not repeat an existing name
 * (ignoring capital letters), because "Assessed By" has to match the list.
 */
export function addStaffName(staff, name) {
  const clean = String(name).replace(/\s+/g, " ").trim();
  if (!clean) return { staff, error: "Type a name first." };
  if (staff.some((s) => s.toLowerCase() === clean.toLowerCase())) {
    return { staff, error: `${clean} is already in the list.` };
  }
  return { staff: [...staff, clean], error: null };
}

/** Remove one name from the staff list. */
export function removeStaffName(staff, name) {
  return staff.filter((s) => s !== name);
}

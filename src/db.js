// Storage on the phone (IndexedDB). Everything stays on this device; nothing
// is ever sent anywhere. Two stores:
//   settings     - one record, key "main"
//   assessments  - one record per assessment, keyed by its "id"
import { loadContent } from "./content.js";

const DB_NAME = "risk-assessment";
const DB_VERSION = 1;
let dbPromise;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore("settings");
        db.createObjectStore("assessments", { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

// Run one request inside a transaction and wait for it to be fully saved.
async function run(storeName, mode, makeRequest) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = makeRequest(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Settings, with any missing values filled in from the content file defaults. */
export async function getSettings() {
  const { defaults } = await loadContent();
  const stored = await run("settings", "readonly", (s) => s.get("main"));
  const { _note, ...base } = defaults;
  return { ...base, staff: [...base.staff], ...(stored || {}) };
}

export function saveSettings(settings) {
  return run("settings", "readwrite", (s) => s.put(settings, "main"));
}

/**
 * Hand out the next risk ref number and move the counter on, as one saved
 * change. Used when a risk is exported so refs never repeat.
 */
export async function takeRefNumbers(count) {
  const settings = await getSettings();
  const first = settings.nextRiskRefNumber;
  settings.nextRiskRefNumber = first + count;
  await saveSettings(settings);
  return first;
}

export function listAssessments() {
  return run("assessments", "readonly", (s) => s.getAll());
}
export function getAssessment(id) {
  return run("assessments", "readonly", (s) => s.get(id));
}
export function saveAssessment(assessment) {
  return run("assessments", "readwrite", (s) => s.put(assessment));
}
export function deleteAssessment(id) {
  return run("assessments", "readwrite", (s) => s.delete(id));
}

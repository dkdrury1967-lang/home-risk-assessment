// Autosave. Call schedule() after every change; the assessment is written to
// the phone a moment later. flush() writes straight away. The app flushes
// whenever you leave a screen or switch away from the app, so nothing typed
// is lost.
import { saveAssessment } from "./db.js";

let current = null; // the saver for the screen on show

export function createAutosaver(assessment, onSaved = () => {}, delay = 300) {
  let timer = null;
  let pending = false;
  let chain = Promise.resolve();

  function write() {
    pending = false;
    assessment.updatedAt = new Date().toISOString();
    chain = chain.then(() => saveAssessment(assessment)).then(onSaved).catch((e) => console.error(e));
    return chain;
  }
  const saver = {
    schedule() {
      pending = true;
      clearTimeout(timer);
      timer = setTimeout(write, delay);
    },
    flush() {
      clearTimeout(timer);
      return pending ? write() : chain;
    },
  };
  current = saver;
  return saver;
}

/** Make sure anything typed on the current screen is saved. */
export function flushCurrent() {
  return current ? current.flush() : Promise.resolve();
}

// Save if the app is switched away from or closed.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushCurrent();
});
window.addEventListener("pagehide", () => flushCurrent());

// Lock state for the app. When a passcode is set, the app starts locked, and
// locks again after being away from the screen for the chosen time. While the
// app is away, the screen is covered so client details do not show in the app
// switcher (iOS decides when it takes its snapshot, so this helps but cannot
// be guaranteed).
import { getPasscodeRecord, getSettings } from "./db.js";
import { shouldLock } from "./passcode-logic.js";
import { flushCurrent } from "./autosave.js";

let enabled = false;
let locked = false;
let hiddenAt = null;
let lockAfterSeconds = 300;
let onLockChange = () => {};

/** Call once at start-up, before the first screen is shown. */
export async function initLock() {
  enabled = !!(await getPasscodeRecord());
  lockAfterSeconds = (await getSettings()).lockAfterSeconds;
  locked = enabled;
}

export const isEnabled = () => enabled;
export const isLocked = () => locked;

/** The app calls this to be told when it must show (or leave) the lock screen. */
export function setLockListener(fn) { onLockChange = fn; }

/** Passcode switched on or off in Settings. */
export function setEnabled(value) {
  enabled = value;
  locked = false;
  document.body.classList.remove("privacy-cover");
}
export function setLockAfter(seconds) { lockAfterSeconds = seconds; }

export async function lockNow() {
  if (!enabled) return;
  await flushCurrent(); // save anything typed before the screen is replaced
  locked = true;
  onLockChange();
}

export function unlock() {
  locked = false;
  hiddenAt = null;
  document.body.classList.remove("privacy-cover");
}

document.addEventListener("visibilitychange", () => {
  if (!enabled) return;
  if (document.visibilityState === "hidden") {
    hiddenAt = Date.now();
    document.body.classList.add("privacy-cover");
    flushCurrent();
  } else {
    document.body.classList.remove("privacy-cover");
    if (!locked && shouldLock(hiddenAt, Date.now(), lockAfterSeconds)) lockNow();
    hiddenAt = null;
  }
});

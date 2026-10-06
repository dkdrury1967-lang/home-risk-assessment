// Passcode rules. No screen code here, so the automated tests can check it.
//
// IMPORTANT: this is a SCREEN LOCK for the app. It keeps casual snoopers out,
// but it does not encrypt the stored assessments. It is not a substitute for
// the phone's own passcode, which must stay switched on.
//
// The passcode itself is never stored. We keep a salted hash (PBKDF2-SHA256).

export const PIN_LENGTH = 6;
const ITERATIONS = 200000;
const FREE_ATTEMPTS = 5;       // wrong tries allowed before a delay starts
const FIRST_DELAY_SECONDS = 30; // then 30s, 60s, 120s ... doubling each time
const MAX_DELAY_SECONDS = 900;  // never more than 15 minutes

const toHex = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex) => new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));

async function derive(pin, saltHex, iterations) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromHex(saltHex), iterations }, key, 256);
  return toHex(bits);
}

// Compare two hex strings without stopping at the first difference.
function sameHash(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Exactly PIN_LENGTH digits. */
export function isValidPin(pin) {
  return typeof pin === "string" && new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

/** Too easy to guess: one repeated digit (111111) or a straight run (123456, 654321). */
export function isWeakPin(pin) {
  const d = [...pin].map(Number);
  const steps = d.slice(1).map((n, i) => n - d[i]);
  return steps.every((s) => s === 0) || steps.every((s) => s === 1) || steps.every((s) => s === -1);
}

/** Make the record to store for a new passcode. */
export async function createRecord(pin, iterations = ITERATIONS) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, hash: await derive(pin, salt, iterations), iterations, failed: 0, lockUntil: 0 };
}

/** How long to make someone wait after this many wrong tries in a row. */
export function delaySeconds(failed) {
  if (failed < FREE_ATTEMPTS) return 0;
  return Math.min(MAX_DELAY_SECONDS, FIRST_DELAY_SECONDS * 2 ** (failed - FREE_ATTEMPTS));
}

/** Whole seconds left on a wait (0 when none). */
export function secondsLeft(record, now = Date.now()) {
  return Math.max(0, Math.ceil((record.lockUntil - now) / 1000));
}

/**
 * Check a passcode. Returns { status, record, secondsLeft } where status is
 * "ok", "wrong" or "waiting". The caller must save the returned record.
 * While a wait is running, tries are refused and not counted.
 */
export async function checkPin(record, pin, now = Date.now()) {
  const wait = secondsLeft(record, now);
  if (wait > 0) return { status: "waiting", record, secondsLeft: wait };

  const ok = isValidPin(pin) && sameHash(await derive(pin, record.salt, record.iterations), record.hash);
  if (ok) return { status: "ok", record: { ...record, failed: 0, lockUntil: 0 }, secondsLeft: 0 };

  const failed = record.failed + 1;
  const next = { ...record, failed, lockUntil: delaySeconds(failed) ? now + delaySeconds(failed) * 1000 : 0 };
  return { status: "wrong", record: next, secondsLeft: secondsLeft(next, now) };
}

/** Wrong tries left before the first delay (for the message on screen). */
export function freeTriesLeft(record) {
  return Math.max(0, FREE_ATTEMPTS - record.failed);
}

/**
 * Has the app been away long enough to lock? hiddenAt is when it left the
 * screen (null if it never did). 0 seconds means lock every time.
 */
export function shouldLock(hiddenAt, now, lockAfterSeconds) {
  if (hiddenAt === null || hiddenAt === undefined) return false;
  return (now - hiddenAt) / 1000 >= lockAfterSeconds;
}

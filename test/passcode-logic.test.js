import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PIN_LENGTH, isValidPin, isWeakPin, createRecord, checkPin, delaySeconds,
  secondsLeft, freeTriesLeft, shouldLock,
} from "../src/passcode-logic.js";

const FAST = 1000; // few iterations so the tests run quickly; the app uses 200,000

test("a passcode is exactly six digits", () => {
  assert.equal(PIN_LENGTH, 6);
  assert.equal(isValidPin("482916"), true);
  for (const bad of ["", "12345", "1234567", "12345a", "12 456", 482916, null]) {
    assert.equal(isValidPin(bad), false, String(bad));
  }
});

test("easy-to-guess passcodes are weak", () => {
  for (const weak of ["000000", "111111", "123456", "234567", "654321", "987654"]) {
    assert.equal(isWeakPin(weak), true, weak);
  }
  for (const ok of ["482916", "121212", "135791", "123450"]) {
    assert.equal(isWeakPin(ok), false, ok);
  }
});

test("the stored record never contains the passcode, and salts differ", async () => {
  const a = await createRecord("482916", FAST);
  const b = await createRecord("482916", FAST);
  assert.ok(!JSON.stringify(a).includes("482916"));
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.hash, b.hash);
  assert.equal(a.failed, 0);
});

test("right passcode unlocks, wrong one does not", async () => {
  const rec = await createRecord("482916", FAST);
  assert.equal((await checkPin(rec, "482916")).status, "ok");
  assert.equal((await checkPin(rec, "482917")).status, "wrong");
  assert.equal((await checkPin(rec, "12")).status, "wrong"); // too short is just wrong
});

test("wrong tries are counted, a delay starts after five, and success resets", async () => {
  let rec = await createRecord("482916", FAST);
  const t0 = 1_000_000;
  for (let i = 1; i <= 4; i++) {
    const r = await checkPin(rec, "000001", t0);
    rec = r.record;
    assert.equal(r.status, "wrong");
    assert.equal(r.secondsLeft, 0, `no delay after try ${i}`);
  }
  assert.equal(freeTriesLeft(rec), 1);
  const fifth = await checkPin(rec, "000001", t0);
  assert.equal(fifth.status, "wrong");
  assert.equal(fifth.secondsLeft, 30);
  rec = fifth.record;

  // during the wait even the RIGHT passcode is refused, and it is not counted
  const during = await checkPin(rec, "482916", t0 + 10_000);
  assert.equal(during.status, "waiting");
  assert.equal(during.secondsLeft, 20);
  assert.equal(during.record.failed, 5);

  // after the wait the right passcode works and clears the count
  const after = await checkPin(rec, "482916", t0 + 31_000);
  assert.equal(after.status, "ok");
  assert.equal(after.record.failed, 0);
  assert.equal(secondsLeft(after.record, t0 + 31_000), 0);
});

test("the wait doubles and stops at 15 minutes", () => {
  assert.deepEqual([4, 5, 6, 7, 8].map(delaySeconds), [0, 30, 60, 120, 240]);
  assert.equal(delaySeconds(20), 900);
});

test("the app locks after the chosen time away", () => {
  const t = 1_000_000;
  assert.equal(shouldLock(null, t, 300), false);          // never left the screen
  assert.equal(shouldLock(t - 10_000, t, 300), false);    // away 10 seconds
  assert.equal(shouldLock(t - 300_000, t, 300), true);    // away exactly 5 minutes
  assert.equal(shouldLock(t - 1, t, 0), true);            // "immediately"
});

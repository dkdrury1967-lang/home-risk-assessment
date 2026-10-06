// The "App passcode" section of Settings: set, change, turn off, and choose
// how long the app can be away before it locks.
import { h, render } from "../ui.js";
import { createKeypad } from "../keypad.js";
import { getPasscodeRecord, savePasscodeRecord, clearPasscodeRecord } from "../db.js";
import {
  PIN_LENGTH, isWeakPin, createRecord, checkPin, freeTriesLeft,
} from "../passcode-logic.js";
import { isEnabled, setEnabled, setLockAfter, lockNow } from "../lock.js";

const LOCK_AFTER = [
  { seconds: 0, label: "Immediately" },
  { seconds: 60, label: "After 1 minute" },
  { seconds: 300, label: "After 5 minutes" },
  { seconds: 900, label: "After 15 minutes" },
];

export function buildPasscodePanel({ settings, save }) {
  const box = h("div", {});

  // Show a keypad with a title and wait for six digits (or Cancel -> null).
  function askPin(title, hint = "", error = "") {
    return new Promise((resolve) => {
      const keypad = createKeypad({ length: PIN_LENGTH, onComplete: (pin) => resolve({ pin, keypad }) });
      render(box, 
        h("p", { class: "tight" }, title),
        hint ? h("p", { class: "hint" }, hint) : null,
        keypad.element,
        error ? h("p", { class: "error", role: "alert" }, error) : null,
        h("button", { class: "btn btn-secondary", type: "button", onclick: () => resolve(null) }, "Cancel"));
    });
  }

  // Ask for the current passcode. Returns true if it was right.
  async function verifyCurrent() {
    let error = "";
    for (;;) {
      const answer = await askPin("Enter your current passcode", "", error);
      if (!answer) return false;
      const record = await getPasscodeRecord();
      const result = await checkPin(record, answer.pin);
      await savePasscodeRecord(result.record);
      if (result.status === "ok") return true;
      if (result.secondsLeft > 0) {
        error = `Too many wrong tries. Try again in ${result.secondsLeft} seconds.`;
      } else {
        const left = freeTriesLeft(result.record);
        error = `Wrong passcode. ${left} ${left === 1 ? "try" : "tries"} left before a wait.`;
      }
    }
  }

  async function chooseNew() {
    let error = "";
    for (;;) {
      const first = await askPin(`Choose a ${PIN_LENGTH}-digit passcode`,
        "Do not use your phone's own passcode, birthdays or simple runs like 123456.", error);
      if (!first) return false;
      if (isWeakPin(first.pin)) { error = "That is too easy to guess. Choose another."; continue; }
      const second = await askPin("Enter it again to confirm", "", "");
      if (!second) return false;
      if (second.pin !== first.pin) { error = "The two did not match. Start again."; continue; }
      await savePasscodeRecord(await createRecord(first.pin));
      setEnabled(true);
      return true;
    }
  }

  function showIdle(note = "") {
    const on = isEnabled();
    const lockAfter = h("select", {
      id: "lock-after", "aria-label": "Lock the app",
      onchange: async (e) => {
        settings.lockAfterSeconds = Number(e.target.value);
        setLockAfter(settings.lockAfterSeconds);
        await save();
      },
    }, LOCK_AFTER.map((o) => h("option", { value: String(o.seconds), selected: o.seconds === settings.lockAfterSeconds }, o.label)));

    render(box, 
      h("p", { class: "hint" },
        "A screen lock for this app. It keeps casual snoopers out, but it does not encrypt the stored assessments, " +
        "and it is not a substitute for the phone's own passcode, which must stay on. " +
        "A forgotten passcode cannot be recovered: the only way back in is to erase the app's data."),
      h("p", { class: on ? "ok" : "hint", role: "status" }, note || (on ? "Passcode is ON." : "Passcode is off.")),
      on ? null : h("button", { class: "btn btn-secondary", type: "button", onclick: onSet }, "Set a passcode"),
      on ? h("div", { class: "field" }, h("label", { for: "lock-after" }, "Lock the app"), lockAfter) : null,
      on ? h("button", { class: "btn btn-secondary", type: "button", onclick: onChange }, "Change passcode") : null,
      on ? h("button", { class: "btn btn-secondary", type: "button", onclick: onOff }, "Turn off passcode") : null,
      on ? h("button", { class: "btn btn-secondary", type: "button", onclick: () => lockNow() }, "Lock the app now") : null);
  }

  async function onSet() {
    showIdle(await chooseNew() ? "Passcode is now ON." : "");
  }
  async function onChange() {
    if (!(await verifyCurrent())) return showIdle();
    showIdle(await chooseNew() ? "Passcode changed." : "");
  }
  async function onOff() {
    if (!(await verifyCurrent())) return showIdle();
    await clearPasscodeRecord();
    setEnabled(false);
    showIdle("Passcode is now off.");
  }

  showIdle();
  return box;
}

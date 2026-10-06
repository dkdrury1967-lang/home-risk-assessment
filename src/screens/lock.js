// The lock screen: shown instead of the app while it is locked.
import { h, render } from "../ui.js";
import { createKeypad } from "../keypad.js";
import { getPasscodeRecord, savePasscodeRecord, eraseEverything } from "../db.js";
import { PIN_LENGTH, checkPin, freeTriesLeft, secondsLeft } from "../passcode-logic.js";
import { unlock } from "../lock.js";

export async function renderLock(root, afterUnlock) {
  let record = await getPasscodeRecord();
  if (!record) { unlock(); afterUnlock(); return; } // no passcode any more

  const message = h("p", { class: "error", role: "alert" });
  let timer = null;

  // While a wait is running, show the countdown and stop the keypad.
  function startWaitIfNeeded() {
    clearInterval(timer);
    if (secondsLeft(record) <= 0) { keypad.setDisabled(false); return false; }
    keypad.setDisabled(true);
    const tick = () => {
      const left = secondsLeft(record);
      if (left <= 0) {
        clearInterval(timer);
        message.textContent = "";
        keypad.reset();
        return;
      }
      message.textContent = `Too many wrong tries. Try again in ${left} ${left === 1 ? "second" : "seconds"}.`;
    };
    tick();
    timer = setInterval(tick, 1000);
    return true;
  }

  const keypad = createKeypad({
    length: PIN_LENGTH,
    onComplete: async (pin) => {
      const result = await checkPin(record, pin);
      record = result.record;
      await savePasscodeRecord(record);
      if (result.status === "ok") {
        unlock();
        afterUnlock();
        return;
      }
      keypad.reset();
      if (!startWaitIfNeeded()) {
        const left = freeTriesLeft(record);
        message.textContent = `Wrong passcode. ${left} ${left === 1 ? "try" : "tries"} left before a wait.`;
      }
    },
  });

  const forgot = h("details", { class: "guidance" },
    h("summary", {}, "Forgot the passcode?"),
    h("p", {}, "There is no way to recover a forgotten passcode, because nothing is stored anywhere else. " +
      "The only way back in is to erase this app's data on this phone: every saved assessment and every setting."),
    h("p", {}, "Files you have already exported or emailed are not affected."),
    h("button", {
      class: "btn btn-danger", type: "button",
      onclick: async () => {
        if (!confirm("Erase ALL assessments and settings on this phone? This cannot be undone.")) return;
        if (!confirm("Are you sure? Anything not exported will be lost.")) return;
        await eraseEverything();
        location.hash = "#/";
        location.reload();
      },
    }, "Erase everything and start again"));

  render(root,
    h("div", { class: "lock-screen" },
      h("h2", { class: "first" }, "Enter passcode"),
      h("p", { class: "hint" }, `${PIN_LENGTH} digits. Home Risk Assessment is locked.`),
      keypad.element,
      message,
      forgot));

  startWaitIfNeeded();
}

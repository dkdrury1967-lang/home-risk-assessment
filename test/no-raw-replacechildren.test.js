// Guard: the browser's replaceChildren prints null/false pieces as the word
// "null". Screens must use render() from src/ui.js, which skips them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

test("screens use render(), never replaceChildren directly", () => {
  const dir = new URL("../src/screens/", import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".js"))) {
    const code = readFileSync(new URL(file, dir), "utf8");
    assert.ok(!code.includes(".replaceChildren("), `${file} calls replaceChildren directly`);
    if (code.includes("render(")) {
      assert.match(code, /import \{[^}]*\brender\b[^}]*\} from "\.\.\/ui\.js"/, `${file} uses render without importing it`);
    }
  }
});

// Makes the app icons from tools/daisy-logo.svg: the logo centred on white
// (iPhone icons cannot be transparent). Uses Google Chrome in the background
// to draw the SVG, so Chrome must be installed on this Mac.
// Run with: node tools/make-icons.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const logo = fileURLToPath(new URL("./daisy-logo.svg", import.meta.url));
const outDir = fileURLToPath(new URL("../icons/", import.meta.url));
const work = mkdtempSync(join(tmpdir(), "icons-"));

// logoPercent = how much of the icon the logo fills. The "maskable" icon is
// smaller because Android may crop its edges.
const icons = [
  ["icon-192.png", 192, 80],
  ["icon-512.png", 512, 80],
  ["icon-maskable-512.png", 512, 62],
  ["apple-touch-icon.png", 180, 80],
];

for (const [name, size, logoPercent] of icons) {
  const page = join(work, "icon.html");
  writeFileSync(page, `<!doctype html><html><body style="margin:0;background:#fff">
    <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center">
      <img src="file://${logo}" style="width:${logoPercent}%;height:${logoPercent}%">
    </div></body></html>`);
  execFileSync(CHROME, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars",
    "--force-device-scale-factor=1", `--window-size=${size},${size}`,
    "--default-background-color=ffffffff",
    `--screenshot=${outDir}${name}`, `file://${page}`,
  ], { stdio: "ignore" });
  console.log("wrote", name);
}
rmSync(work, { recursive: true, force: true });

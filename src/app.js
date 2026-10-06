// App start-up. Registers the offline service worker, asks the phone to keep
// our data, and shows the right screen for the address after the # sign.
import { renderHome } from "./screens/home.js";
import { renderSettings } from "./screens/settings.js";
import { renderStart } from "./screens/start.js";
import { renderOverview } from "./screens/overview.js";
import { renderArea } from "./screens/area.js";
import { renderSummary } from "./screens/summary.js";
import { renderExport } from "./screens/export.js";
import { flushCurrent } from "./autosave.js";

const APP_VERSION = "0.6.0";

const root = document.getElementById("screen");
const statusEl = document.getElementById("status");
document.getElementById("version").textContent = `Version ${APP_VERSION}`;

// Ask the phone not to wipe our stored assessments when space runs low.
// iOS may still clear storage for apps not opened for a long time, which is
// why the app also reminds you to export promptly.
async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    try { return await navigator.storage.persist(); } catch { /* ignore */ }
  }
  return false;
}

// Register the service worker, which saves the app on the phone so it opens
// with no signal.
async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return false;
  // If an older version of the app was already controlling this page, reload
  // once when the new version takes over, so updates show straight away
  // instead of on the second open. Assessments autosave, so nothing is lost.
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController && !reloading) {
      reloading = true;
      flushCurrent().finally(() => location.reload());
    }
  });
  try {
    await navigator.serviceWorker.register("sw.js");
    return true;
  } catch {
    return false;
  }
}

let offlineReady = false;
function updateStatus() {
  const net = navigator.onLine ? "Online" : "Offline";
  const ready = offlineReady ? "ready to work without signal" : "offline mode not available";
  statusEl.textContent = `${net} · ${ready}`;
}

// Screens, chosen by the part of the address after the #. Anything in
// brackets in the pattern is passed to the screen (e.g. the assessment id).
const routes = [
  [/^(#\/?)?$/, renderHome],
  [/^#\/settings$/, renderSettings],
  [/^#\/assessment\/new$/, renderStart],
  [/^#\/assessment\/([^/]+)$/, renderOverview],
  [/^#\/assessment\/([^/]+)\/area\/(\d+)$/, renderArea],
  [/^#\/assessment\/([^/]+)\/summary$/, renderSummary],
  [/^#\/assessment\/([^/]+)\/export$/, renderExport],
];

async function showScreen() {
  // Make sure anything typed on the screen we are leaving is saved first.
  await flushCurrent();
  let render = renderHome;
  let args = [];
  for (const [pattern, screen] of routes) {
    const match = location.hash.match(pattern);
    if (match) { render = screen; args = match.slice(1); break; }
  }
  try {
    await render(root, ...args);
  } catch (err) {
    root.replaceChildren(document.createTextNode(`Something went wrong: ${err.message}`));
  }
  window.scrollTo(0, 0);
}

async function start() {
  offlineReady = await registerServiceWorker();
  await requestPersistentStorage();
  updateStatus();
  window.addEventListener("online", updateStatus);
  window.addEventListener("offline", updateStatus);
  window.addEventListener("hashchange", showScreen);
  showScreen();
}

start();

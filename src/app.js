// App start-up. Registers the offline service worker, asks the phone to keep
// our data, and fills in the home screen. Screens for the assessment itself
// come in the next steps.

const APP_VERSION = "0.1.0";

const statusEl = document.getElementById("status");
const warningsEl = document.getElementById("warnings");
document.getElementById("version").textContent = `Version ${APP_VERSION}`;

// Show the data-protection notes from the editable content file.
async function showWarnings() {
  const res = await fetch("src/data/risk-areas.json");
  const data = await res.json();
  for (const text of Object.values(data.warnings)) {
    const li = document.createElement("li");
    li.textContent = text;
    warningsEl.appendChild(li);
  }
}

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
  try {
    await navigator.serviceWorker.register("sw.js");
    return true;
  } catch {
    return false;
  }
}

function updateOnlineStatus(offlineReady) {
  const net = navigator.onLine ? "Online" : "Offline";
  const ready = offlineReady ? "ready to work without signal" : "offline mode not available";
  statusEl.textContent = `${net} · ${ready}`;
}

async function start() {
  const offlineReady = await registerServiceWorker();
  await requestPersistentStorage();
  await showWarnings();
  updateOnlineStatus(offlineReady);
  window.addEventListener("online", () => updateOnlineStatus(offlineReady));
  window.addEventListener("offline", () => updateOnlineStatus(offlineReady));
}

start();

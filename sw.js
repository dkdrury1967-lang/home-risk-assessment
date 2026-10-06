// Service worker: saves every app file on the phone the first time it is
// opened, then serves them from there so the app works with no signal.
//
// IMPORTANT: when you change any app file, change CACHE_VERSION below. That
// tells the phone to fetch the new files. Add any new file to FILES.

const CACHE_VERSION = "v14";
const CACHE_NAME = `risk-assessment-${CACHE_VERSION}`;

const FILES = [
  "./",
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "src/app.js",
  "src/content.js",
  "src/db.js",
  "src/ui.js",
  "src/settings-logic.js",
  "src/assessment-logic.js",
  "src/autosave.js",
  "src/components.js",
  "src/dates.js",
  "src/screens/start.js",
  "src/screens/overview.js",
  "src/screens/area.js",
  "src/screens/summary.js",
  "src/screens/export.js",
  "src/export-logic.js",
  "src/xlsx-loader.js",
  "src/vendor/xlsx.mini.min.js",
  "src/screens/home.js",
  "src/screens/settings.js",
  "src/rating.js",
  "src/config/rating-matrix.json",
  "src/data/risk-areas.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting())
  );
});

// Remove caches left over from older versions.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Answer from the saved copy; only go to the network for files we don't hold.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((hit) => hit || fetch(event.request))
  );
});

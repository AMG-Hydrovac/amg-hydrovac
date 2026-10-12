/* AMG Hydrovac: this service worker exists only to remove an older one.
   It deletes every cache for this origin, unregisters itself and reloads open pages
   so visitors get the current files. Keep this file; do not register a new worker. */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll({ type: "window" }); })
      .then(function (clients) { clients.forEach(function (c) { if (c.navigate) c.navigate(c.url); }); })
  );
});

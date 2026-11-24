"use strict";

const CACHE_NAME = "flavours-business-manager-v23";
const APP_SHELL = [
  "./",
  "./index.html",
  "./app.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put("./index.html", copy));
        return response;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }))
  );
});

// Web Push arrives while the app is closed. Delivery requires a registered
// subscription and a server-side sender configured with VAPID secrets.
self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch { payload = { body: event.data?.text() || "Open Flavours POS to review." }; }
  const title = String(payload.title || "Flavours POS").slice(0, 120);
  const options = {
    body: String(payload.body || "You have a business update.").slice(0, 500),
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    tag: String(payload.tag || payload.eventId || "flavours-notification").slice(0, 120),
    data: { url: payload.url || "./" },
    renotify: false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  let target = new URL("./", self.location.origin);
  try {
    const candidate = new URL(event.notification.data?.url || "./", self.location.origin);
    if (candidate.origin === self.location.origin) target = candidate;
  } catch { /* Keep the safe same-origin app URL. */ }
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientsList) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.focus();
        if ("navigate" in client) await client.navigate(target.href);
        return;
      }
    }
    await self.clients.openWindow(target.href);
  })());
});

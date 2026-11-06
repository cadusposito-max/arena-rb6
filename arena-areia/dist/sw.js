// ARENA RB6 · service worker: app instalável, funciona sem sinal e recebe avisos.
const CACHE = "arena-rb6-v6";
const SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.mjs",
  "./engine.mjs",
  "./courts.mjs",
  "./icons.mjs",
  "./push.mjs",
  "./cloud.js",
  "./manifest.webmanifest",
  "./assets/logo.png",
  "./assets/favicon-64.png",
  "./assets/hero.jpg",
  "./assets/icon-192.png",
  "./assets/badge-96.png",
  "./assets/inter-latin-400-normal.woff2",
  "./assets/inter-latin-600-normal.woff2",
  "./assets/barlow-condensed-latin-700-normal.woff2",
  "./assets/barlow-condensed-latin-800-italic.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.allSettled(SHELL.map((url) => cache.add(url))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// Rede primeiro (dados sempre frescos); cache só quando estiver sem sinal.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin)
    return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches
          .match(req, { ignoreSearch: req.mode === "navigate" })
          .then((hit) => hit || caches.match("./index.html")),
      ),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "ARENA RB6", {
      body: data.body || "",
      icon: "./assets/icon-192.png",
      badge: "./assets/badge-96.png",
      tag: data.tag || "arena-rb6",
      renotify: true,
      requireInteraction: Boolean(data.tag && data.tag.includes("chamada")),
      vibrate: [220, 120, 220, 120, 320],
      data: { url: data.url || "./" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    event.notification.data?.url || "./",
    self.registration.scope,
  ).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        const open = list.find((c) => c.url.startsWith(self.registration.scope));
        if (open)
          return Promise.resolve(open.navigate?.(target))
            .catch(() => null)
            .then((c) => (c || open).focus());
        return self.clients.openWindow(target);
      }),
  );
});

const CACHE_PREFIX = "shinigacim-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const APP_SHELL = [
  "/manifest.webmanifest",
  "/pwa-icon.svg",
  "/pwa-icon-180.png",
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
];

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const response = await fetch("/");
  if (!response.ok) throw new Error(`App shell request failed: ${response.status}`);

  const html = await response.clone().text();
  const assets = Array.from(html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g), ([, path]) => path);
  await Promise.all([
    cache.put("/", response),
    cache.addAll([...APP_SHELL, ...assets]),
  ]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      cacheAppShell(),
      self.skipWaiting(),
    ]),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && "navigate" in client) {
          return client.navigate("/sync/upload").then(() => client.focus());
        }
      }
      return self.clients.openWindow("/sync/upload");
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await caches.open(CACHE_NAME).then((cache) => cache.put("/", response.clone()));
        }
        return response;
      } catch {
        const cachedPage = await caches.match(request);
        return cachedPage ?? (await caches.match("/"));
      }
    })());
    return;
  }

  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.startsWith("/pwa-icon-")
  ) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) {
        await caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      }
      return response;
    })());
  }
});

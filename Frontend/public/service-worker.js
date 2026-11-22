const CACHE_PREFIX = "shinigacim-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v8`;
const UI_MANIFEST = "/ui-assets.json";
const APP_SHELL = [
  "/manifest.webmanifest",
  "/pwa-icon-180.png",
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
];

function mayCache(response) {
  return response.ok && !response.redirected && !/(?:^|,)\s*(?:private|no-store)\s*(?:=|,|$)/i.test(response.headers.get("Cache-Control") ?? "");
}

async function cacheAppShell(preload = false) {
  const response = await fetch("/", { credentials: "omit", cache: "no-store" });
  if (!mayCache(response) || !response.headers.get("Content-Type")?.includes("text/html")) {
    throw new Error("App shell response is not cacheable HTML");
  }
  const html = await response.clone().text();
  const assets = Array.from(html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g), ([, path]) => path);
  if (assets.length === 0) throw new Error("App shell contains no built assets");
  const paths = [...APP_SHELL, ...new Set(assets)];
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(paths.map(async (path) => {
    if (path.startsWith("/assets/") && await cache.match(path, { ignoreVary: true })) return;
    const asset = await fetch(path, { credentials: "omit", cache: "no-store" });
    if (!mayCache(asset)) throw new Error(`App shell asset is not cacheable: ${path}`);
    await cache.put(path, asset);
  }));
  await cache.put("/", response);
  if (preload) await cacheBuiltUi(cache).catch(() => undefined);
}

async function cacheBuiltUi(cache) {
  const inventory = await fetch(UI_MANIFEST, { credentials: "omit", cache: "no-cache" });
  if (!mayCache(inventory) || !inventory.headers.get("Content-Type")?.includes("json")) return;
  const { assets } = await inventory.clone().json();
  await cache.put(UI_MANIFEST, inventory);
  if (!Array.isArray(assets)) return;
  const paths = [...new Set(assets)].filter((path) => typeof path === "string"
    && /^\/assets\/[a-z0-9_./-]+$/i.test(path) && !path.split("/").includes(".."));
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(paths.length, 6) }, async () => {
    while (next < paths.length) {
      const path = paths[next++];
      if (await cache.match(path, { ignoreVary: true })) continue;
      try {
        const asset = await fetch(path, { credentials: "omit" });
        if (mayCache(asset) && !asset.headers.get("Content-Type")?.includes("text/html")) await cache.put(path, asset);
      } catch {
        // A failed optional resource must not prevent app-shell installation.
      }
    }
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      cacheAppShell(new URL(self.location.href ?? self.location.origin).searchParams.get("preload") !== "off"),
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
  const targetUrl = new URL(event.notification.data?.url ?? "/sync/upload", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && "navigate" in client) {
          return client.navigate(targetUrl).then(() => client.focus());
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (/^\/(api|hubs)(\/|$)/.test(url.pathname) || request.headers.has("Authorization")) return;

  if (url.pathname === UI_MANIFEST && !url.search) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request, { credentials: "omit" });
        if (mayCache(response) && response.headers.get("Content-Type")?.includes("json")) {
          await cache.put(UI_MANIFEST, response.clone());
        }
        return response;
      } catch {
        return (await cache.match(UI_MANIFEST, { ignoreVary: true })) ?? Response.error();
      }
    })());
    return;
  }

  if (request.mode === "navigate") {
    event.waitUntil(cacheAppShell().catch(() => undefined));
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        return (await caches.open(CACHE_NAME)).match("/", { ignoreVary: true });
      }
    })());
    return;
  }

  if (!url.search && !request.headers.has("Authorization") && (
    url.pathname.startsWith("/assets/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.startsWith("/pwa-icon-")
  )) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request, { ignoreVary: true });
      if (cached) return cached;

      const response = await fetch(request, { credentials: "omit", signal: request.signal });
      if (mayCache(response) && !response.headers.get("Content-Type")?.includes("text/html")) {
        await cache.put(request, response.clone());
      }
      return response;
    })());
  }
});

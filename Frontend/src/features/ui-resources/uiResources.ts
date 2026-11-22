import { Capacitor } from "@capacitor/core";
import { useAuthStore } from "@/store/authStore";
import type { ReportUiResource } from "./uiModules";

const cacheName = "shinigacim-shell-v8";
const preferenceKey = "shinigacim.skip-ui-preload";
const manifestUrl = "/ui-assets.json";
type UiManifest = { assets: string[]; routes: Record<string, string[]> };
let manifest: UiManifest | undefined;

export function canSkipUiPreload() {
  const user = useAuthStore.getState().user;
  const installed = Capacitor.isNativePlatform()
    || matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone;
  return !installed && user?.status === "active" && user.role.toLowerCase() === "superadmin";
}

export function readSkipUiPreload() {
  try { return canSkipUiPreload() && localStorage.getItem(preferenceKey) === "true"; }
  catch { return false; }
}

export function setSkipUiPreload(skip: boolean) {
  try {
    if (canSkipUiPreload()) localStorage.setItem(preferenceKey, String(skip));
  } catch {
    // Private browser sessions may restrict storage.
  }
}

function isPublicUiAsset(value: unknown): value is string {
  return typeof value === "string" && /^\/assets\/[a-z0-9_./-]+$/i.test(value)
    && !value.split("/").includes("..");
}

function mayCache(response: Response) {
  return response.ok && !response.redirected && !response.headers.get("Content-Type")?.includes("text/html")
    && !/(?:^|,)\s*(?:private|no-store)\b/i.test(response.headers.get("Cache-Control") ?? "");
}

async function readManifest(signal: AbortSignal) {
  const response = await fetch(manifestUrl, { credentials: "omit", cache: "no-cache", signal });
  if (!response.ok || response.redirected || !response.headers.get("Content-Type")?.includes("json")) return;
  const data: UiManifest = await response.json();
  if (!Array.isArray(data.assets) || !data.routes || typeof data.routes !== "object") return;
  manifest = { assets: [...new Set(data.assets.filter(isPublicUiAsset))], routes: data.routes };
}

async function prepareUiAsset(path: string, signal: AbortSignal, cache: Cache) {
  signal.throwIfAborted();
  if (await cache.match(path, { ignoreVary: true })) return;
  const response = await fetch(path, { credentials: "omit", signal });
  if (!mayCache(response)) throw new Error("UI asset is not cacheable");
  signal.throwIfAborted();
  await cache.put(path, response);
}

export async function prepareUiAssets(paths: string[], signal: AbortSignal, onReady: () => void, cache?: Cache) {
  if (!paths.length) return true;
  const storage = cache ?? await caches.open(cacheName);
  let next = 0;
  let successful = true;
  await Promise.all(Array.from({ length: Math.min(paths.length, 6) }, async () => {
    while (!signal.aborted && next < paths.length) {
      const path = paths[next++];
      try { await prepareUiAsset(path, signal, storage); }
      catch { successful = false; continue; }
      if (!signal.aborted) onReady();
    }
  }));
  return successful && !signal.aborted;
}

export async function preloadUi(signal: AbortSignal, reveal: () => void, report: ReportUiResource) {
  if (!import.meta.env.PROD || Capacitor.isNativePlatform() || !("caches" in window)) return true;
  const item = { id: "build-assets", name: "Application files" };
  let downloading = false;
  try {
    await readManifest(signal);
    if (!manifest || signal.aborted) return true;
    const cache = await caches.open(cacheName);
    const present = new Set((await cache.keys()).map((request) => new URL(request.url).pathname));
    const missing = manifest.assets.filter((asset) => !present.has(asset));
    if (!missing.length || signal.aborted) return true;
    reveal();
    downloading = true;
    report({ ...item, status: "downloading" });
    const successful = await prepareUiAssets(missing, signal, () => {}, cache);
    if (!signal.aborted) report({ ...item, status: successful ? "done" : "failed" });
    return successful;
  } catch {
    if (downloading && !signal.aborted) report({ ...item, status: "failed" });
    return !downloading;
  }
}

export function routeUiAssets(file: string): string[] {
  if (Capacitor.isNativePlatform() || !("caches" in window)) return [];
  const files = manifest?.routes[file];
  return Array.isArray(files) ? files.filter(isPublicUiAsset) : [];
}

export function registerUiServiceWorker() {
  if (!import.meta.env.PROD || Capacitor.isNativePlatform() || !("serviceWorker" in navigator)) return;
  const script = readSkipUiPreload() ? "/service-worker.js?preload=off" : "/service-worker.js";
  void navigator.serviceWorker.register(script).catch((error: unknown) => {
    console.error("Service worker registration failed:", error);
  });
}

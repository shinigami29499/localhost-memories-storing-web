// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function setup() {
  const handlers: Record<string, (event: any) => void> = {};
  const entries = new Map<string, Response>();
  const key = (value: string | { url: string }) => typeof value === "string" ? value : new URL(value.url).pathname;
  const cache = {
    match: vi.fn(async (value: string | { url: string }) => entries.get(key(value))?.clone()),
    put: vi.fn(async (value: string | { url: string }, response: Response) => { entries.set(key(value), response.clone()); }),
  };
  let version = "old";
  let offline = false;
  const fetch = vi.fn(async (input: string | { url: string }, _options?: RequestInit) => {
    if (offline) throw new Error("offline");
    const path = key(input);
    if (path === "/") return new Response(`<html><script src="/assets/${version}.js"></script></html>`, { headers: { "Content-Type": "text/html" } });
    if (path.startsWith("/assets/") || path.startsWith("/pwa-") || path === "/manifest.webmanifest") return new Response(`asset ${path}`);
    return new Response("private navigation");
  });
  const self = {
    location: { origin: "https://example.test" },
    addEventListener: (name: string, handler: (event: any) => void) => { handlers[name] = handler; },
    skipWaiting: vi.fn(), clients: { claim: vi.fn() },
  };
  runInNewContext(readFileSync("public/service-worker.js", "utf8"), {
    self, URL, fetch, caches: { open: vi.fn().mockResolvedValue(cache) },
  });
  return { handlers, cache, fetch, entries, setVersion: (value: string) => { version = value; }, setOffline: (value: boolean) => { offline = value; } };
}

function request(url: string, mode = "cors", headers = new Headers()) {
  return { method: "GET", url: `https://example.test${url}`, mode, headers };
}

describe("service worker shell and privacy", () => {
  it("does not intercept API, hub, token-bearing assets or authorized navigation", () => {
    const { handlers } = setup();
    for (const req of [
      request("/api/media/1", "navigate"), request("/hubs/notifications"),
      request("/assets/a.js?token=secret"),
      request("/assets/a.js", "cors", new Headers({ Authorization: "Bearer secret" })),
      request("/gallery", "navigate", new Headers({ Authorization: "Bearer secret" })),
    ]) {
      const respondWith = vi.fn();
      handlers.fetch({ request: req, respondWith, waitUntil: vi.fn() });
      expect(respondWith).not.toHaveBeenCalled();
    }
  });

  it("refreshes the anonymous shell after a deployment and serves it offline", async () => {
    const { handlers, cache, fetch, setVersion, setOffline } = setup();
    const installed: Promise<unknown>[] = [];
    handlers.install({ waitUntil: (promise: Promise<unknown>) => installed.push(promise) });
    await Promise.all(installed);
    expect(await (await cache.match("/"))!.text()).toContain("old.js");
    setVersion("new");
    const pending: Promise<unknown>[] = [];
    const response: Promise<Response>[] = [];
    handlers.fetch({ request: request("/gallery", "navigate"), waitUntil: (p: Promise<unknown>) => pending.push(p), respondWith: (p: Promise<Response>) => response.push(p) });
    expect(await (await response[0]).text()).toBe("private navigation");
    await Promise.all(pending);
    expect(await (await cache.match("/"))!.text()).toContain("new.js");
    expect(await cache.match("/assets/new.js")).toBeDefined();
    expect(fetch.mock.calls.filter(([input]) => typeof input === "string").every(([, options]) => options?.credentials === "omit")).toBe(true);
    setOffline(true);
    handlers.fetch({ request: request("/gallery", "navigate"), waitUntil: (p: Promise<unknown>) => pending.push(p), respondWith: (p: Promise<Response>) => response.push(p) });
    expect(await (await response[1]).text()).toContain("new.js");
    await Promise.all(pending);
  });

  it("keeps the prior shell if the replacement is private", async () => {
    const { handlers, cache, fetch } = setup();
    const pending: Promise<unknown>[] = [];
    handlers.install({ waitUntil: (promise: Promise<unknown>) => pending.push(promise) });
    await Promise.all(pending);
    fetch.mockResolvedValueOnce(new Response("personalized", { headers: { "Content-Type": "text/html", "Cache-Control": "private" } }));
    const responses: Promise<Response>[] = [];
    handlers.fetch({ request: request("/gallery", "navigate"), waitUntil: (p: Promise<unknown>) => pending.push(p), respondWith: (p: Promise<Response>) => responses.push(p) });
    await Promise.all([...pending, ...responses]);
    expect(await (await cache.match("/"))!.text()).toContain("old.js");
  });

  it("does not cache a private static response", async () => {
    const { handlers, cache, fetch } = setup();
    fetch.mockResolvedValueOnce(new Response("private", { headers: { "Cache-Control": "private" } }));
    const response: Promise<Response>[] = [];
    handlers.fetch({ request: request("/assets/private.js"), respondWith: (p: Promise<Response>) => response.push(p) });
    expect(await (await response[0]).text()).toBe("private");
    expect(cache.put).not.toHaveBeenCalled();
    expect(fetch.mock.calls[0][1]?.credentials).toBe("omit");
  });
});

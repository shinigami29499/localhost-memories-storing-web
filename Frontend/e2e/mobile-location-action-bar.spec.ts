import { expect, test } from "@playwright/test";

test("mobile location map action aligns with map controls and exits toward the right", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "" }, accessToken: "test", refreshToken: "test",
    }, version: 0 }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
  });
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/location/home-location") return route.fulfill({ json: null });
    if (path === "/api/location/map/page") return route.fulfill({ json: { page: 1, limit: 30, total: 1, items: [{ id: "p1", name: "Test place", markerColor: "#00AA00", markerIcon: "P", rating: 2, address: "", note: "", createdAt: "2026-01-01", owner: { id: "u1", username: "viewer" }, latitude: 10.8, longitude: 106.7 }] } });
    if (path === "/api/location/p1") return route.fulfill({ json: { id: "p1", name: "Test place", markerColor: "#00AA00", markerIcon: "P", rating: 2, mediaIds: [], owner: { id: "u1", username: "viewer" }, latitude: 10.8, longitude: 106.7 } });
    if (path.endsWith("/page") || path === "/api/location/travel/map" || path.startsWith("/api/library/gallery")) {
      return route.fulfill({ json: { page: 1, offset: 0, limit: 30, total: 0, items: [], hasMore: false } });
    }
    return route.fulfill({ json: [] });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({ json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {} }));
  await page.goto("/location");
  const action = page.locator(".page-action-bar__item > .map-navigation__toolbar--add");
  await expect(action.getByRole("button", { name: "Add" })).toBeVisible();
  await expect(action).toHaveCSS("border-top-width", "2px");
  await expect(action).toHaveCSS("border-top-color", "rgb(244, 243, 238)");
  const map = (await page.locator(".place__map").boundingBox())!;
  const rightEdge = Math.round(map.x + map.width - 8);
  await expect.poll(async () => Math.round((await action.boundingBox())!.x + (await action.boundingBox())!.width)).toBe(rightEdge);
  const box = (await action.boundingBox())!;
  expect(Math.round(box.width)).toBe(44);
  expect(Math.round(box.height)).toBe(44);
  const geolocation = (await page.locator(".mapboxgl-ctrl-group:has(.mapboxgl-ctrl-geolocate)").boundingBox())!;
  expect(box.y + box.height).toBeCloseTo(geolocation.y + geolocation.height, 0);
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter((animation) =>
    animation.playState === "running" && animation.effect?.getTiming().iterations !== Infinity).length)).toBe(0);
  await page.evaluate(() => {
    (window as Window & { exitFrames: Keyframe[][]; enterFrames: Keyframe[][] }).exitFrames = [];
    (window as Window & { enterFrames: Keyframe[][] }).enterFrames = [];
    (window as Window & { viewFrames: { kind: string; time: number; frames: Keyframe[] }[] }).viewFrames = [];
    (window as Window & { ghostSamples: { time: number; count: number }[] }).ghostSamples = [];
    (window as Window & { footerSamples: boolean[] }).footerSamples = [];
    (window as Window & { outlineSamples: { width: string; color: string }[] }).outlineSamples = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.hasAttribute("data-collapsing-bar") && Array.isArray(frames)) (window as Window & { exitFrames: Keyframe[][] }).exitFrames.push(frames);
      if (this.classList.contains("map-navigation__toolbar") && Array.isArray(frames)) (window as Window & { enterFrames: Keyframe[][] }).enterFrames.push(frames);
      if (Array.isArray(frames) && frames[0]?.height && (this.hasAttribute("data-collapsing-bar") || this.classList.contains("map-navigation__toolbar"))) {
        const style = getComputedStyle(this);
        (window as Window & { outlineSamples: { width: string; color: string }[] }).outlineSamples.push({ width: style.borderTopWidth, color: style.borderTopColor });
      }
      if ((this.classList.contains("map-navigation__toolbar") || this.classList.contains("page-action-bar")) && Array.isArray(frames)) {
        (window as Window & { viewFrames: { kind: string; time: number; frames: Keyframe[] }[] }).viewFrames.push({ kind: this.classList.contains("page-action-bar") ? "search" : "map", time: performance.now(), frames });
      }
      if (this.classList.contains("page-action-bar") && Array.isArray(frames) && frames[0]?.transform === "translateY(100%)") {
        const start = performance.now();
        const sample = () => {
          (window as Window & { ghostSamples: { time: number; count: number; html: string }[] }).ghostSamples.push({ time: performance.now() - start, count: document.querySelectorAll("[data-collapsing-bar], [data-exiting], .page-action-bar__item > .map-navigation__toolbar").length, html: document.querySelector("[data-collapsing-bar], [data-exiting], .page-action-bar__item > .map-navigation__toolbar")?.outerHTML.slice(0, 250) ?? "" });
          if (performance.now() - start < 400) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }
      if (this.classList.contains("page-action-bar") && Array.isArray(frames) && (frames[0]?.transform === "translateY(100%)" || frames.at(-1)?.transform === "translateY(100%)")) {
        const start = performance.now();
        const sample = () => {
          const nav = document.querySelector(".bottom-navigation");
          const bounds = nav?.getBoundingClientRect();
          if (nav && bounds) (window as Window & { footerSamples: boolean[] }).footerSamples.push(Boolean(document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + 3)?.closest(".bottom-navigation")));
          if (performance.now() - start < 200) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }
      return original.call(this, frames, options);
    };
  });
  const tabs = page.getByRole("group", { name: "Place view" });
  const navigationStart = Date.now();
  await tabs.getByRole("button", { name: "Saved" }).click();
  await expect(page).toHaveURL(/\/location\/saved$/);
  expect(Date.now() - navigationStart).toBeLessThan(200);
  await expect(page.getByRole("searchbox", { name: "Search saved places" })).toBeHidden();
  await expect(page.getByRole("searchbox", { name: "Search saved places" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as Window & { viewFrames: { kind: string; frames: Keyframe[] }[] }).viewFrames.some((item) => item.kind === "search" && item.frames[0]?.transform === "translateY(100%)"))).toBe(true);
  await page.waitForTimeout(450);
  const ghostSamples = await page.evaluate(() => (window as Window & { ghostSamples: { time: number; count: number }[] }).ghostSamples);
  expect(ghostSamples.length).toBeGreaterThan(5);
  expect(ghostSamples.filter((sample) => sample.count > 0)).toEqual([]);
  await tabs.getByRole("button", { name: "History" }).click();
  await expect(page.getByRole("searchbox", { name: "Search visit history" })).toBeVisible();
  await tabs.getByRole("button", { name: "Saved" }).click();
  await expect(page.getByRole("searchbox", { name: "Search saved places" })).toBeVisible();
  await tabs.getByRole("button", { name: "Map", exact: true }).click();
  await expect(action.getByRole("button", { name: "Add" })).toBeVisible();
  await expect.poll(async () => Math.round((await action.boundingBox())!.x + (await action.boundingBox())!.width)).toBe(rightEdge);
  await expect.poll(() => page.evaluate(() => (window as Window & { enterFrames: Keyframe[][] }).enterFrames.some((frames) => frames[0]?.clipPath === "inset(0 0 0 100%)"))).toBe(true);
  const viewFrames = await page.evaluate(() => (window as Window & { viewFrames: { kind: string; time: number; frames: Keyframe[] }[] }).viewFrames);
  const mapExit = viewFrames.find((item) => item.kind === "map" && item.frames.at(-1)?.clipPath === "inset(0 0 0 100%)")!;
  const searchEnter = viewFrames.find((item) => item.kind === "search" && item.frames[0]?.transform === "translateY(100%)")!;
  const searchExit = viewFrames.find((item) => item.kind === "search" && item.frames.at(-1)?.transform === "translateY(100%)")!;
  const mapEnter = viewFrames.find((item) => item.kind === "map" && item.frames[0]?.clipPath === "inset(0 0 0 100%)" && item.time > searchExit.time)!;
  expect(searchEnter.time - mapExit.time).toBeGreaterThanOrEqual(240);
  expect(mapEnter.time - searchExit.time).toBeGreaterThanOrEqual(190);
  await tabs.getByRole("button", { name: "History" }).click();
  await expect(page.getByRole("searchbox", { name: "Search visit history" })).toBeVisible();
  await tabs.getByRole("button", { name: "Map", exact: true }).click();
  await expect(action.getByRole("button", { name: "Add" })).toBeVisible();
  const allViewFrames = await page.evaluate(() => (window as Window & { viewFrames: { kind: string; time: number; frames: Keyframe[] }[] }).viewFrames);
  const searchEntries = allViewFrames.filter((item) => item.kind === "search" && item.frames[0]?.transform === "translateY(100%)");
  const searchExits = allViewFrames.filter((item) => item.kind === "search" && item.frames.at(-1)?.transform === "translateY(100%)");
  expect(searchEntries).toHaveLength(2);
  expect(searchExits).toHaveLength(2);
  const footerSamples = await page.evaluate(() => (window as Window & { footerSamples: boolean[] }).footerSamples);
  expect(footerSamples.length).toBeGreaterThan(5);
  expect(footerSamples.every(Boolean)).toBe(true);
  const marker = page.locator(".place__pin").first();
  await expect(marker).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter((animation) =>
    animation.playState === "running" && animation.effect?.getTiming().iterations !== Infinity).length)).toBe(0);
  await page.evaluate(() => { (window as Window & { enterFrames: Keyframe[][]; exitFrames: Keyframe[][] }).enterFrames = []; (window as Window & { exitFrames: Keyframe[][] }).exitFrames = []; });
  await marker.dispatchEvent("click");
  const selected = page.locator(".page-action-bar__item > .map-navigation__toolbar:not(.map-navigation__toolbar--add)");
  await expect(selected.getByRole("button", { name: "Navigate" })).toBeVisible();
  await expect.poll(async () => Math.round((await selected.boundingBox())!.height)).toBe(124);
  await expect.poll(() => page.evaluate(() => (window as Window & { enterFrames: Keyframe[][] }).enterFrames.map((frames) => [frames[0]?.height, frames.at(-1)?.height]))).toContainEqual(["44px", "124px"]);
  await expect(selected.getByRole("button", { name: "Navigate" }).locator("svg")).toBeVisible();
  await selected.getByRole("button", { name: "Cancel" }).click();
  await expect(action.getByRole("button", { name: "Add" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as Window & { exitFrames: Keyframe[][] }).exitFrames.some((frames) => frames[0]?.height === "124px" && frames.at(-1)?.height === "44px"))).toBe(true);
  const outlines = await page.evaluate(() => (window as Window & { outlineSamples: { width: string; color: string }[] }).outlineSamples);
  expect(outlines.length).toBeGreaterThanOrEqual(2);
  expect(outlines.every((outline) => outline.width === "2px" && outline.color === "rgb(244, 243, 238)")).toBe(true);
});

test("mobile map waits for highlight motion and matches action sizing to map controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: { user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "" }, accessToken: "test", refreshToken: "test" }, version: 0 }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
  });
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path === "/api/location/home-location" ? null : path.endsWith("/page") || path === "/api/location/travel/map" || path.startsWith("/api/library/gallery") ? { page: 1, offset: 0, limit: 30, total: 0, items: [], hasMore: false } : [] });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({ json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {} }));
  await page.goto("/location");
  const overlay = page.locator(".place__map-panel > .map-loading-overlay");
  await expect(page.locator(".page-highlight__toggle")).toBeVisible();
  await expect(overlay).toHaveCount(0);
  const toggle = page.locator(".page-highlight__toggle");
  await toggle.click();
  await expect(overlay).toBeVisible();
  await toggle.click();
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveCount(0);
  const action = page.locator(".page-action-bar__item > .map-navigation__toolbar--add");
  for (const [width, height] of [[320, 844], [390, 844], [390, 700], [640, 844], [641, 844], [767, 1024]]) {
    await page.setViewportSize({ width, height });
    await expect(overlay).toHaveCount(0);
    const controlBox = (await page.locator(".place__map-home-control").boundingBox())!;
    await expect.poll(async () => {
      const bounds = (await action.boundingBox())!;
      return { width: bounds.width, height: bounds.height };
    }).toEqual({ width: controlBox.width, height: controlBox.height });
    const mapBox = (await page.locator(".place__map").boundingBox())!;
    const geolocationBox = (await page.locator(".mapboxgl-ctrl-group:has(.mapboxgl-ctrl-geolocate)").boundingBox())!;
    await expect.poll(async () => {
      const bounds = (await action.boundingBox())!;
      return {
        right: Math.round(bounds.x + bounds.width),
        bottom: Math.round(bounds.y + bounds.height),
      };
    }).toEqual({
      right: Math.round(mapBox.x + mapBox.width - 8),
      bottom: Math.round(geolocationBox.y + geolocationBox.height),
    });
    await expect(action).toHaveCSS("padding", "0px");
    await expect(action).toHaveCSS("border-top-width", "2px");
    await expect(action.getByRole("button", { name: "Add" }).locator("svg")).toHaveCSS("width", width <= 640 ? "18px" : "20px");
    expect(await action.evaluate((element) => element.closest(".mapboxgl-map, .map-controls"))).toBeNull();
  }
});

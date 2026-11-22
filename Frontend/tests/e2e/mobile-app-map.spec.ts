import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" },
      accessToken: "test", refreshToken: "test",
    }, version: 0 }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
  });
  await page.route(/^https?:\/\/[^/]+\/api\//, (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = path === "/api/place/home-location" ? null
      : path.includes("/batch") ? []
        : path.endsWith("/page") || path === "/api/place/travel/map" || path.startsWith("/api/library/album/media")
          ? { page: 1, offset: 0, total: 0, limit: 30, items: [], hasMore: false }
          : [];
    return route.fulfill({ json });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({
    json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {},
  }));
});

for (const width of [320, 390, 640, 767]) {
  test(`mobile map and saved/history navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/location");
    const action = page.locator(".page-action-bar .map-navigation__toolbar--add");
    await expect(action.getByRole("button", { name: "Add" })).toBeVisible();
    await expect.poll(async () => {
      const main = (await page.locator(".app-shell__main").boundingBox())!;
      const bar = (await action.boundingBox())!;
      const tabs = (await page.getByRole("navigation", { name: "Main navigation" }).boundingBox())!;
      return { right: Math.round(main.x + main.width - bar.x - bar.width), bottom: Math.round(tabs.y - bar.y - bar.height) };
    }).toEqual({ right: 12, bottom: 12 });
    const box = (await action.boundingBox())!;
    expect(Math.round(box.width)).toBe(width <= 640 ? 44 : 54);
    expect(Math.round(box.height)).toBe(width <= 640 ? 44 : 54);

    const views = page.getByRole("navigation", { name: "Place view" });
    await views.getByRole("button", { name: "Saved" }).click();
    await expect(page).toHaveURL(/\/location\/saved$/);
    await expect(page.getByRole("searchbox", { name: "Search saved places" })).toBeVisible();
    await views.getByRole("button", { name: "History" }).click();
    await expect(page).toHaveURL(/\/location\/history$/);
    await expect(page.getByRole("searchbox", { name: "Search visit history" })).toBeVisible();
    await views.getByRole("button", { name: "Map", exact: true }).click();
    await expect(action.getByRole("button", { name: "Add" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("mobile map and search bars hand off without gaps or ghost controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/location");
  const views = page.getByRole("navigation", { name: "Place view" });
  const action = page.locator(".page-action-bar .map-navigation__toolbar--add");
  await expect(action).toBeVisible();
  const surface = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.borderColor = "var(--surface)";
    document.body.append(probe);
    const color = getComputedStyle(probe).borderTopColor;
    probe.remove();
    return color;
  });
  await page.evaluate(() => {
    type BarFrame = { kind: string; time: number; first: string; last: string; width: string; color: string; duration: number };
    const state = window as Window & { barFrames: BarFrame[]; continuity: { visible: boolean; left: number; top: number; width: number }[];
      borders: { width: string; color: string }[]; ghosts: number[] };
    state.barFrames = [];
    state.continuity = [];
    state.borders = [];
    state.ghosts = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (Array.isArray(frames) && (this.classList.contains("map-navigation__toolbar") || this.classList.contains("page-action-bar"))) {
        const style = getComputedStyle(this);
        state.barFrames.push({
          kind: this.classList.contains("map-navigation__toolbar") ? "map" : "search",
          time: performance.now(), first: String(frames[0]?.clipPath ?? frames[0]?.transform ?? ""),
          last: String(frames.at(-1)?.clipPath ?? frames.at(-1)?.transform ?? ""),
          width: style.borderTopWidth, color: style.borderTopColor,
          duration: typeof options === "number" ? options : Number(options?.duration ?? 0),
        });
        const element = this;
        if (this.classList.contains("map-navigation__toolbar")) {
          const start = performance.now();
          const sample = () => {
            if (element.isConnected && element.getBoundingClientRect().width > 0) {
              const current = getComputedStyle(element);
              state.borders.push({ width: current.borderTopWidth, color: current.borderTopColor });
            }
            if (performance.now() - start < 200) requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        } else if (frames[0]?.transform === "translateY(100%)") {
          const start = performance.now();
          const sample = () => {
            state.ghosts.push(document.querySelectorAll("[data-location-view-exit], [data-collapsing-bar], [data-exiting], .page-action-bar__item > .map-navigation__toolbar").length);
            if (performance.now() - start < 200) requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        }
      }
      return original.call(this, frames, options);
    };
  });
  await views.getByRole("button", { name: "Saved" }).click();
  await expect(page.getByRole("searchbox", { name: "Search saved places" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as Window & { barFrames: { kind: string; first: string }[] }).barFrames
    .some((frame) => frame.kind === "search" && frame.first === "translateY(100%)"))).toBe(true);
  await page.waitForTimeout(250);
  await expect(page.locator("[data-location-view-exit], [data-collapsing-bar], [data-exiting]")).toHaveCount(0);
  await page.evaluate(() => {
    const state = window as Window & { continuity: { visible: boolean; left: number; top: number; width: number }[] };
    const start = performance.now();
    const sample = () => {
      const bars = [...document.querySelectorAll<HTMLElement>(".page-action-bar__item > .place__action-bar, [data-user-search-bridge]")].filter((bar) => {
        const style = getComputedStyle(bar);
        return style.visibility === "visible" && style.display !== "none" && Number(style.opacity) > 0.99 && bar.getBoundingClientRect().width > 10;
      });
      const rect = bars.at(-1)?.getBoundingClientRect();
      state.continuity.push({ visible: !!rect, left: rect?.left ?? 0, top: rect?.top ?? 0, width: rect?.width ?? 0 });
      if (performance.now() - start < 300) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await views.getByRole("button", { name: "History" }).click();
  await expect(page.getByRole("searchbox", { name: "Search visit history" })).toBeVisible();
  await page.waitForTimeout(350);
  const samples = await page.evaluate(() => (window as Window & { continuity: { visible: boolean; left: number; top: number; width: number }[] }).continuity);
  expect(samples.length).toBeGreaterThan(5);
  expect(samples.every((sample) => sample.visible)).toBe(true);
  for (const key of ["left", "top", "width"] as const) {
    expect(Math.max(...samples.map((sample) => sample[key])) - Math.min(...samples.map((sample) => sample[key]))).toBeLessThan(2);
  }
  await views.getByRole("button", { name: "Map", exact: true }).click();
  await expect(action).toBeVisible();
  await page.waitForTimeout(250);
  const frames = await page.evaluate(() => (window as Window & { barFrames: { kind: string; time: number; first: string; last: string; width: string; color: string; duration: number }[] }).barFrames);
  const mapExit = frames.find((frame) => frame.kind === "map" && frame.last === "inset(0 0 0 100%)");
  const searchEnter = frames.find((frame) => frame.kind === "search" && frame.first === "translateY(100%)");
  const searchExit = frames.find((frame) => frame.kind === "search" && frame.last === "translateY(100%)");
  const mapEnter = frames.find((frame) => frame.kind === "map" && frame.first === "inset(0 0 0 100%)");
  expect(mapExit).toBeDefined();
  expect(searchEnter).toBeDefined();
  expect(searchExit).toBeDefined();
  expect(mapEnter).toBeDefined();
  expect(searchEnter!.time - mapExit!.time).toBeGreaterThanOrEqual(240);
  expect(mapEnter!.time - searchExit!.time).toBeGreaterThanOrEqual(240);
  expect([mapExit, searchEnter, searchExit, mapEnter].every((frame) => frame?.duration === 200)).toBe(true);
  expect([mapExit, mapEnter].every((frame) => frame?.width === "2px" && frame.color === surface)).toBe(true);
  const motionSamples = await page.evaluate(() => {
    const state = window as Window & { borders: { width: string; color: string }[]; ghosts: number[] };
    return { borders: state.borders, ghosts: state.ghosts };
  });
  expect(motionSamples.borders.length).toBeGreaterThan(5);
  expect(motionSamples.borders.every((border) => border.width === "2px" && border.color === surface)).toBe(true);
  expect(motionSamples.ghosts.length).toBeGreaterThan(5);
  expect(motionSamples.ghosts.every((count) => count === 0)).toBe(true);
  await expect(page.locator("[data-location-view-exit], [data-collapsing-bar], [data-exiting], [data-user-search-bridge]")).toHaveCount(0);
});

test("mobile place marker opens its removal confirmation on a long press", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const place = { id: "p1", name: "Test place", address: "", note: "", rating: 0, latitude: 0, longitude: 0,
    markerIcon: "P", markerColor: "#168bd0", owner: { id: "u1", username: "viewer" }, mediaIds: [] };
  await page.route("**/api/place/map/page?**", (route) => route.fulfill({ json: { items: [place], page: 1, limit: 100, total: 1 } }));
  await page.route("**/api/place/p1", (route) => route.fulfill({ json: place }));
  await page.goto("/location");
  const pin = page.getByRole("button", { name: "Test place", exact: true }).first();
  await expect(pin).toBeVisible();
  const box = (await pin.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  const dialog = page.getByRole("alertdialog", { name: "Delete this place?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
});

test("mobile map navigation respects reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/location");
  const views = page.getByRole("navigation", { name: "Place view" });
  await expect(views).toBeVisible();
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    const state = window as Window & { actionDurations: number[]; navigations: number };
    state.actionDurations = [];
    state.navigations = 0;
    const push = history.pushState.bind(history);
    history.pushState = (...args) => { state.navigations++; return push(...args); };
    Element.prototype.animate = function (frames, options) {
      if (this.classList.contains("page-action-bar") || this.classList.contains("map-navigation__toolbar")) {
        const duration = typeof options === "number" ? options : Number(options?.duration ?? 0);
        state.actionDurations.push(duration);
      }
      return original.call(this, frames, options);
    };
  });
  await views.getByRole("button", { name: "Saved" }).click();
  await expect(page.getByRole("searchbox", { name: "Search saved places" })).toBeVisible();
  await expect(page).toHaveURL(/\/location\/saved$/);
  await expect(page.locator("[data-location-view-exit], [data-collapsing-bar], [data-exiting]")).toHaveCount(0);
  await views.getByRole("button", { name: "History" }).click();
  await expect(page.getByRole("searchbox", { name: "Search visit history" })).toBeVisible();
  await expect(page).toHaveURL(/\/location\/history$/);
  await expect(page.locator("[data-location-view-exit], [data-collapsing-bar], [data-exiting]")).toHaveCount(0);
  await views.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.locator(".page-action-bar .map-navigation__toolbar--add")).toBeVisible();
  await expect(page).toHaveURL(/\/location$/);
  await expect(page.locator("[data-location-view-exit], [data-collapsing-bar], [data-exiting]")).toHaveCount(0);
  const evidence = await page.evaluate(() => {
    const state = window as Window & { actionDurations: number[]; navigations: number };
    const bar = document.querySelector(".page-action-bar");
    return { navigations: state.navigations, durations: state.actionDurations, reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
      running: bar?.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running" && Number(animation.effect?.getComputedTiming().duration) > 0).length };
  });
  expect(evidence.navigations).toBe(3);
  expect(evidence.reduced).toBe(true);
  expect(evidence.durations.every((duration) => duration === 0)).toBe(true);
  expect(evidence.running).toBe(0);
});

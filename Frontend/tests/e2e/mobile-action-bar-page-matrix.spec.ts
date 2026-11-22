import { expect, test } from "@playwright/test";

const scenarios = [
  { from: "/", to: "/album", enter: "vertical" },
  { from: "/album", to: "/", exit: "vertical" },
  { from: "/album", to: "/location", resize: "collapse" },
  { from: "/location", to: "/album", resize: "expand" },
  { from: "/album", to: "/location/saved", exit: "vertical", enter: "search" },
  { from: "/location/saved", to: "/album", exit: "search", enter: "vertical" },
  { from: "/album", to: "/location/history", exit: "vertical", enter: "search" },
  { from: "/location/history", to: "/album", exit: "search", enter: "vertical" },
  { from: "/", to: "/users", enter: "search" },
  { from: "/users", to: "/", exit: "search" },
  { from: "/location/saved", to: "/", exit: "search" },
  { from: "/", to: "/location/saved", enter: "search" },
  { from: "/location/history", to: "/", exit: "search" },
  { from: "/", to: "/location/history", enter: "search" },
  { from: "/album", to: "/", exit: "vertical" },
  { from: "/", to: "/album", enter: "vertical" },
  { from: "/", to: "/album/a1", enter: "vertical" },
  { from: "/album/a1", to: "/", exit: "vertical" },
  { from: "/uploads", to: "/album", enter: "vertical" },
  { from: "/album", to: "/uploads", exit: "vertical" },
  { from: "/settings", to: "/users", enter: "search" },
  { from: "/users", to: "/settings", exit: "search" },
  { from: "/profile", to: "/album", enter: "vertical" },
  { from: "/album", to: "/profile", exit: "vertical" },
  { from: "/uploads", to: "/users", enter: "search" },
  { from: "/users", to: "/uploads", exit: "search" },
  { from: "/profile", to: "/users", enter: "search" },
  { from: "/users", to: "/profile", exit: "search" },
  { from: "/settings", to: "/album", enter: "vertical" },
  { from: "/album", to: "/settings", exit: "vertical" },
  { from: "/location/saved", to: "/users", same: true },
  { from: "/location/history", to: "/users", same: true },
  { from: "/users", to: "/location/saved", same: true },
  { from: "/users", to: "/location/history", same: true },
  { from: "/location/travel", to: "/", exit: "vertical" },
  { from: "/", to: "/location/travel", enter: "vertical" },
] as const;

for (const scenario of scenarios) {
  test(`mobile action bar ${scenario.from} to ${scenario.to}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
        user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test",
      }, version: 0 }));
      localStorage.setItem("shinigacim.animations-enabled", "true");
    });
    await page.route(/^https?:\/\/[^/]+\/api\//, (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/place/home-location") return route.fulfill({ json: null });
      if (path === "/api/user/me") return route.fulfill({ json: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" } });
      if (path === "/api/library/album/a1") return route.fulfill({ json: { id: "a1", name: "Album", caption: "", isPublic: false, owner: { id: "u1", username: "viewer" }, mediaCount: 0, previewMediaId: null, previewIsFavorited: false, customPreviewMediaId: null, containsMedia: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: null } });
      if (path.startsWith("/api/sync/upload") && path.endsWith("/batch")) return route.fulfill({ json: { offset: 0, limit: 30, totalItems: 0, items: [] } });
      if (path.endsWith("/page") || path.startsWith("/api/library/album/media") || path.startsWith("/api/library/album") || path === "/api/place/travel/map") {
        return route.fulfill({ json: { page: 1, offset: 0, total: 0, limit: 30, items: [], allCount: 0, pendingCount: 0, hasMore: false } });
      }
      return route.fulfill({ json: [] });
    });
    await page.route("**/hubs/**", (route) => route.abort());
    await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({ json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {} }));
    await page.goto(scenario.from);
    if (scenario.from === "/album") await expect(page.locator(".page-action-bar").getByRole("button", { name: "New album" })).toBeVisible();
    if (scenario.from === "/location") await expect(page.getByRole("button", { name: "Add", exact: true })).toBeVisible();
    if (scenario.from === "/users") await expect(page.getByRole("searchbox", { name: "Search users" })).toBeVisible();
    if (scenario.from === "/location/saved") await expect(page.getByRole("searchbox", { name: "Search saved places" })).toBeVisible();
    if (scenario.from === "/location/history") await expect(page.getByRole("searchbox", { name: "Search visit history" })).toBeVisible();
    if (scenario.from === "/album") await expect(page.locator(".page-action-bar").getByRole("button", { name: "New album" })).toBeVisible();
    if (scenario.from === "/location/travel") await expect(page.locator(".page-action-bar .map-navigation__toolbar")).toBeVisible();
    await page.waitForTimeout(350);
    await page.evaluate(() => {
      const original = Element.prototype.animate;
      (window as Window & { barAnimations: { kind: string; time: number; delay: number; frames: Keyframe[] }[] }).barAnimations = [];
      Element.prototype.animate = function (frames, options) {
        if (Array.isArray(frames) && (this.hasAttribute("data-collapsing-bar") || this.hasAttribute("data-user-transition-exit") || this.classList.contains("gallery-page__actions") || this.classList.contains("page-action-bar"))) {
          (window as Window & { barAnimations: { kind: string; time: number; delay: number; frames: Keyframe[] }[] }).barAnimations.push({
            kind: this.hasAttribute("data-collapsing-bar") || this.hasAttribute("data-user-transition-exit") ? "exit" : "enter",
            time: performance.now(), delay: typeof options === "object" ? options?.delay ?? 0 : 0, frames,
          });
        }
        return original.call(this, frames, options);
      };
    });
    if ("same" in scenario) await page.evaluate(() => {
      const samples: { visible: boolean; left: number; top: number; width: number }[] = [];
      (window as Window & { continuitySamples: typeof samples }).continuitySamples = samples;
      const start = performance.now();
      const sample = () => {
        const bars = [...document.querySelectorAll<HTMLElement>(".page-action-bar__item > .place__action-bar, [data-user-search-bridge]")].filter((bar) => {
          const style = getComputedStyle(bar);
          return style.visibility === "visible" && style.display !== "none" && Number(style.opacity) > 0.99 && Number(getComputedStyle(bar.parentElement!).opacity) > 0.99 && bar.getBoundingClientRect().width > 10;
        });
        const bounds = bars.at(-1)?.getBoundingClientRect();
        samples.push({ visible: !!bounds, left: bounds?.left ?? 0, top: bounds?.top ?? 0, width: bounds?.width ?? 0 });
        if (performance.now() - start < 500) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    const link = page.locator(`.bottom-navigation a[href="${scenario.to}"]`);
    if (await link.count()) await link.click();
    else await page.evaluate((path) => { history.pushState({}, "", path); window.dispatchEvent(new PopStateEvent("popstate")); }, scenario.to);
    await expect(page).toHaveURL(new RegExp(`${scenario.to === "/" ? "/" : scenario.to}$`));
    await page.waitForTimeout(800);
    const animations = await page.evaluate(() => (window as Window & { barAnimations: { kind: string; time: number; delay: number; frames: Keyframe[] }[] }).barAnimations);
    const exit = "exit" in scenario ? animations.find((item) => item.kind === "exit" && (scenario.exit === "vertical"
      ? item.frames.at(-1)?.width === "0px" || item.frames.at(-1)?.clipPath === "inset(0 0 0 100%)"
      : String(item.frames.at(-1)?.transform).startsWith("translateY("))) : undefined;
    const enter = "enter" in scenario ? animations.find((item) => item.kind === "enter" && (scenario.enter === "vertical"
      ? item.frames[0]?.clipPath === "inset(0 0 0 100%)"
      : String(item.frames[0]?.transform).startsWith("translateY("))) : undefined;
    if ("exit" in scenario) expect(exit, JSON.stringify(animations)).toBeDefined();
    if ("enter" in scenario) expect(enter, JSON.stringify(animations)).toBeDefined();
    if ("resize" in scenario) {
      const resize = animations.find((item) => {
        const start = Number.parseFloat(String(item.frames[0]?.height));
        const end = Number.parseFloat(String(item.frames.at(-1)?.height));
        return scenario.resize === "expand" ? end > start && start > 0 : start > end && end > 0;
      });
      expect(resize, JSON.stringify(animations)).toBeDefined();
    }
    if (exit && enter) expect(enter.time + enter.delay - exit.time).toBeGreaterThanOrEqual(190);
    if ("same" in scenario) {
      expect(animations.filter((item) => item.frames.some((frame) => frame.transform)), JSON.stringify(animations)).toEqual([]);
      const samples = await page.evaluate(() => (window as Window & { continuitySamples: { visible: boolean; left: number; top: number; width: number }[] }).continuitySamples);
      expect(samples.length).toBeGreaterThan(5);
      expect(samples.every((sample) => sample.visible), JSON.stringify(samples)).toBe(true);
      for (const key of ["left", "top", "width"] as const) expect(Math.max(...samples.map((sample) => sample[key])) - Math.min(...samples.map((sample) => sample[key]))).toBeLessThan(2);
    }
    await expect(page.locator("[data-user-transition-exit], [data-collapsing-bar], [data-exiting], [data-user-search-bridge]")).toHaveCount(0);
  });
}

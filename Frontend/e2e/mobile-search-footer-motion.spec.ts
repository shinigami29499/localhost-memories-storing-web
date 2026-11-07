import { expect, test } from "@playwright/test";

for (const [from, to] of [["/users", "/gallery"], ["/gallery", "/users"], ["/location/saved", "/location"], ["/location", "/location/saved"]]) {
  test(`mobile search footer moves together: ${from} to ${to}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({ state: { user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test" }, version: 0 }));
      localStorage.setItem("shinigacim.animations-enabled", "true");
    });
    await page.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/location/home-location") return route.fulfill({ json: null });
      if (path.endsWith("/page") || path.startsWith("/api/library/gallery") || path === "/api/location/travel/map") return route.fulfill({ json: { page: 1, offset: 0, total: 0, limit: 30, items: [], allCount: 0, pendingCount: 0, hasMore: false } });
      return route.fulfill({ json: [] });
    });
    await page.route("**/hubs/**", (route) => route.abort());
    await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({ json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {} }));
    await page.goto(from);
    if (from === "/users") await expect(page.getByRole("searchbox", { name: "Search users" })).toBeVisible();
    if (from === "/location/saved") await expect(page.getByRole("searchbox", { name: "Search saved places" })).toBeVisible();
    if (from === "/gallery") await expect(page.getByRole("button", { name: "Upload media" })).toBeVisible();
    if (from === "/location") await expect(page.getByRole("button", { name: "Add", exact: true })).toBeVisible();
    await page.waitForTimeout(350);
    await page.evaluate(() => {
      const original = Element.prototype.animate;
      (window as Window & { footerMotion: { start: number; end: number; offsets: number[]; widths: number[] }[] }).footerMotion = [];
      Element.prototype.animate = function (frames, options) {
        const animation = original.call(this, frames, options);
        if (this.classList.contains("page-action-bar") && Array.isArray(frames) && frames.some((frame) => frame.transform)) {
          const item = { start: performance.now(), end: 0, offsets: [] as number[], widths: [] as number[] };
          (window as Window & { footerMotion: typeof item[] }).footerMotion.push(item);
          const element = this;
          const sample = () => {
            const search = element.querySelector(".place__action-bar");
            if (element.isConnected && search) {
              const footer = element.getBoundingClientRect();
              const rect = search.getBoundingClientRect();
              item.offsets.push(rect.top - footer.top);
              item.widths.push(footer.width);
              if (animation.playState === "running") requestAnimationFrame(sample);
            }
          };
          requestAnimationFrame(sample);
          void animation.finished.then(() => { item.end = performance.now(); }).catch(() => undefined);
        }
        return animation;
      };
    });
    if (from.startsWith("/location") && to.startsWith("/location")) {
      await page.getByRole("group", { name: "Place view" }).getByRole("button", { name: to.endsWith("saved") ? "Saved" : "Map", exact: true }).click();
    } else {
      await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: to === "/users" ? "Users" : "Gallery" }).click();
    }
    await expect(page).toHaveURL(new RegExp(`${to}$`));
    await page.waitForTimeout(700);
    const motions = await page.evaluate(() => (window as Window & { footerMotion: { start: number; end: number; offsets: number[]; widths: number[] }[] }).footerMotion);
    expect(motions.length).toBeGreaterThan(0);
    const motion = motions.find((item) => item.offsets.length > 2);
    expect(motion, JSON.stringify(motions)).toBeDefined();
    expect(Math.max(...motion!.offsets) - Math.min(...motion!.offsets)).toBeLessThan(1);
    expect(Math.max(...motion!.widths) - Math.min(...motion!.widths)).toBeLessThan(1);
    await expect(page.locator("[data-user-transition-exit], [data-location-view-exit]")).toHaveCount(0);
  });
}

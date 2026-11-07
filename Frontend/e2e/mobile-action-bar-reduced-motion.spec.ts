import { expect, test } from "@playwright/test";

for (const mode of ["reduced-motion", "animations-disabled"] as const) {
  test(`mobile action bars honor ${mode}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    if (mode === "reduced-motion") await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((enabled) => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({ state: { user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test" }, version: 0 }));
      localStorage.setItem("shinigacim.animations-enabled", String(enabled));
    }, mode === "reduced-motion");
    await page.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/location/home-location") return route.fulfill({ json: null });
      if (path.endsWith("/page") || path.startsWith("/api/library/gallery")) return route.fulfill({ json: { page: 1, offset: 0, total: 0, limit: 30, items: [], allCount: 0, pendingCount: 0 } });
      return route.fulfill({ json: [] });
    });
    await page.route("**/hubs/**", (route) => route.abort());
    await page.goto("/users");
    await expect(page.getByRole("searchbox", { name: "Search users" })).toBeVisible();
    await page.evaluate(() => {
      const original = Element.prototype.animate;
      (window as Window & { actionMotions: number }).actionMotions = 0;
      Element.prototype.animate = function (frames, options) {
        if (this.hasAttribute("data-user-transition-exit") || this.hasAttribute("data-collapsing-bar") || this.classList.contains("gallery-page__actions") || this.classList.contains("place__action-bar") || this.classList.contains("page-action-bar__item")) (window as Window & { actionMotions: number }).actionMotions++;
        return original.call(this, frames, options);
      };
      const samples: number[] = [];
      (window as Window & { actionWidths: number[] }).actionWidths = samples;
      const start = performance.now();
      const sample = () => {
        const bar = document.querySelector<HTMLElement>(".page-action-bar__item:has(> .gallery-page__actions)");
        if (bar) samples.push(bar.getBoundingClientRect().width);
        if (performance.now() - start < 400) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.locator('.bottom-navigation a[href="/gallery"]').click();
    await expect(page.getByRole("button", { name: "Upload media" })).toBeVisible();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as Window & { actionMotions: number }).actionMotions)).toBe(0);
    const widths = await page.evaluate(() => (window as Window & { actionWidths: number[] }).actionWidths);
    expect(widths.length).toBeGreaterThan(2);
    const minimum = Math.min(...widths), maximum = Math.max(...widths);
    expect(widths.filter((width) => width > minimum + 2 && width < maximum - 2)).toEqual([]);
    await expect(page.locator("[data-user-transition-exit], [data-collapsing-bar], [data-exiting]")).toHaveCount(0);
  });
}

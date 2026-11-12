import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 1571, height: 1128 }, { width: 390, height: 844 }]) {
  test(`location map and actions clear the footer at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "" },
      accessToken: "test", refreshToken: "test",
    }, version: 0 })));
    await page.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/location/home-location") return route.fulfill({ json: null });
      if (path === "/api/location/travel/map") return route.fulfill({ json: { offset: 0, total: 0, items: [] } });
      if (path === "/api/location") return route.fulfill({ json: [{ id: "p1", name: "Place", markerColor: "#00AA00", markerIcon: "P", rating: 2, mediaIds: [], address: "", note: "", createdAt: "2026-01-01", owner: { id: "u1", username: "viewer" }, latitude: 10, longitude: 106 }] });
      if (path.startsWith("/api/library/gallery")) return route.fulfill({ json: { offset: 0, limit: 20, total: 0, items: [] } });
      return route.fulfill({ json: [] });
    });
    await page.route("**/hubs/**", (route) => route.abort());
    await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({ json:
      route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {},
    }));
    await page.goto("/location");
    const map = page.locator(".place__map-panel");
    const footer = page.locator(".page-action-bar");
    const toolbar = page.locator('.page-action-bar .map-navigation__toolbar');
    await expect(toolbar).toBeVisible();
    const bounds = await page.evaluate(() => {
      const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect().toJSON();
      return { map: box(".place__map-panel"), footer: box(".page-action-bar"), tabs: box(".place__view-switch"), toolbar: box('.page-action-bar .map-navigation__toolbar') };
    });
    if (viewport.width >= 768) {
      const main = await page.locator(".app-shell__main").boundingBox();
      expect(main).not.toBeNull();
      expect(bounds.footer.height).toBe(0);
      expect(bounds.toolbar.right).toBeCloseTo(main!.x + main!.width - 12, 0);
      expect(bounds.toolbar.bottom).toBeCloseTo(main!.y + main!.height - 12, 0);
      await expect(map).toHaveCSS("border-top-width", "2px");
    } else {
      expect(bounds.footer.top - bounds.map.bottom).toBeGreaterThanOrEqual(bounds.map.top - bounds.tabs.bottom - 1);
      expect(bounds.footer.top - bounds.map.bottom).toBeLessThanOrEqual(bounds.map.top - bounds.tabs.bottom + 1);
      expect(bounds.toolbar.bottom).toBeLessThan(bounds.footer.top);
      expect(bounds.footer.top - bounds.toolbar.bottom).toBeLessThanOrEqual(20);
    }
    const action = toolbar.getByRole("button", { name: "Add", exact: true });
    await expect(action).toBeVisible();
    await expect(action).toBeEnabled();
    await action.click();
  });
}

test("webview search stays in the page header", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() => localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
    user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "" },
    accessToken: "test", refreshToken: "test",
  }, version: 0 })));
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/location/saved/page" || path === "/api/location/history/page" || path === "/api/users/page")
      return route.fulfill({ json: { items: [], page: 1, limit: 30, total: 0 } });
    return route.fulfill({ json: [] });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  for (const [path, label] of [
    ["/location/saved", "Search saved places"],
    ["/location/history", "Search visit history"],
    ["/users", "Search users"],
    ["/users/pending", "Search users"],
    ["/users/blocked", "Search users"],
  ]) {
    await page.goto(path);
    await expect(page.locator(".app-topbar__actions").getByRole("searchbox", { name: label })).toBeVisible();
    await expect(page.locator(".page-action-bar .place__search-bar")).toHaveCount(0);
  }
});

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
    const toolbar = page.locator('.map-navigation[data-expanded="false"]');
    await expect(toolbar).toBeVisible();
    const bounds = await page.evaluate(() => {
      const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect().toJSON();
      return { map: box(".place__map-panel"), footer: box(".page-action-bar"), tabs: box(".place__view-switch"), toolbar: box('.map-navigation[data-expanded="false"]') };
    });
    expect(bounds.footer.top - bounds.map.bottom).toBeGreaterThanOrEqual(bounds.map.top - bounds.tabs.bottom - 1);
    expect(bounds.footer.top - bounds.map.bottom).toBeLessThanOrEqual(bounds.map.top - bounds.tabs.bottom + 1);
    expect(bounds.toolbar.top).toBeGreaterThanOrEqual(bounds.footer.top);
    expect(bounds.toolbar.bottom).toBeLessThanOrEqual(bounds.footer.bottom);
    const action = toolbar.getByRole("button", { name: "Add", exact: true });
    await expect(action).toBeVisible();
    await expect(action).toBeEnabled();
    await action.click();
  });
}

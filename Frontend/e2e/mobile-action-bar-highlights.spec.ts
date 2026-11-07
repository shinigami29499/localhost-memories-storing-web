import { expect, test, type Locator, type Page } from "@playwright/test";

async function checkHighlight(page: Page, bar: Locator, target: Locator) {
  const indicator = bar.locator('[data-slot="motion-highlight"]');
  await expect(indicator).toHaveCount(1);
  const before = (await indicator.boundingBox())!;
  await indicator.evaluate((node) => node.setAttribute("data-original-indicator", "true"));
  await target.click();
  await expect.poll(async () => Math.abs(((await indicator.boundingBox())?.x ?? before.x) - before.x)).toBeGreaterThan(15);
  await expect(indicator).toHaveAttribute("data-original-indicator", "true");
  await page.waitForTimeout(350);
  await expect(page.locator("[data-user-transition-exit], [data-collapsing-bar], [data-exiting], [data-user-search-bridge]")).toHaveCount(0);
}

test("mobile inner highlights preserve action-bar behavior", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: { user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test" }, version: 0 }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
  });
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/location/home-location") return route.fulfill({ json: null });
    if (path === "/api/library/album/a1") return route.fulfill({ json: { id: "a1", name: "Album", caption: "", isPublic: false, owner: { id: "u1", username: "viewer" }, mediaCount: 0, previewMediaId: null, previewIsFavorited: false, customPreviewMediaId: null, containsMedia: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: null } });
    if (path.endsWith("/page") || path.startsWith("/api/library/gallery") || path.startsWith("/api/library/album") || path === "/api/location/travel/map") return route.fulfill({ json: { page: 1, offset: 0, total: 0, limit: 30, items: [], allCount: 0, pendingCount: 0, hasMore: false } });
    return route.fulfill({ json: [] });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({ json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {} }));

  await page.goto("/gallery");
  const gallery = page.getByRole("navigation", { name: "Gallery", exact: true });
  await checkHighlight(page, gallery, gallery.getByRole("link", { name: "Album", exact: true }));
  await checkHighlight(page, gallery, gallery.getByRole("link", { name: "Trash", exact: true }));
  await checkHighlight(page, gallery, gallery.getByRole("link", { name: "Gallery", exact: true }));

  await page.goto("/location");
  const places = page.getByRole("group", { name: "Place view" });
  await checkHighlight(page, places, places.getByRole("button", { name: "Saved", exact: true }));
  await expect(page.getByRole("searchbox", { name: "Search saved places" })).toBeVisible();
  await checkHighlight(page, places, places.getByRole("button", { name: "History", exact: true }));
  await expect(page.getByRole("searchbox", { name: "Search visit history" })).toBeVisible();
  await checkHighlight(page, places, places.getByRole("button", { name: "Map", exact: true }));

  await page.goto("/users");
  const userTabs = page.getByRole("tablist", { name: "Filter users by status" });
  const userSearch = page.getByRole("searchbox", { name: "Search users" });
  await expect(userSearch).toBeVisible();
  await userSearch.evaluate((node) => node.setAttribute("data-original-search", "true"));
  await checkHighlight(page, userTabs, userTabs.getByRole("tab", { name: "Pending" }));
  await expect(userSearch).toHaveAttribute("data-original-search", "true");
  await checkHighlight(page, userTabs, userTabs.getByRole("tab", { name: "All users" }));
  await expect(userSearch).toHaveAttribute("data-original-search", "true");

  await page.goto("/gallery/album/a1");
  const mediaTabs = page.getByRole("tablist", { name: "Filter by media type" });
  await checkHighlight(page, mediaTabs, mediaTabs.getByRole("tab", { name: "Videos" }));
  await checkHighlight(page, mediaTabs, mediaTabs.getByRole("tab", { name: "Images" }));
});

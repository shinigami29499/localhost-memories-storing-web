import { expect, test } from "@playwright/test";

test("location action hover matches gallery", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
    user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "" },
    accessToken: "test", refreshToken: "test",
  }, version: 0 })));
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/location/home-location") return route.fulfill({ json: null });
    if (path === "/api/location/travel/map") return route.fulfill({ json: { offset: 0, total: 0, items: [] } });
    if (path === "/api/location") return route.fulfill({ json: [] });
    if (path.startsWith("/api/library/gallery")) return route.fulfill({ json: { offset: 0, limit: 20, total: 0, items: [] } });
    return route.fulfill({ json: [] });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({ json:
    route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {},
  }));

  const colors = async (selector: string) => {
    const button = page.locator(selector).first();
    await expect(button).toBeVisible();
    await button.hover();
    await page.waitForTimeout(300);
    return button.evaluate((element) => {
      const style = getComputedStyle(element);
      const icon = element.querySelector("svg");
      return { background: style.backgroundColor, color: style.color, icon: icon && getComputedStyle(icon).color };
    });
  };
  await page.goto("/gallery");
  const gallery = await colors('.page-action-bar button[aria-label="Upload media"]');
  await page.goto("/location");
  const location = await colors('.map-navigation__toolbar button[aria-label="Add"]');
  expect(location.background).toBe(gallery.background);
  expect(location.color).toBe(gallery.color);
  expect(location.icon).toBe(gallery.icon);
  expect(location.icon).toBeTruthy();
});

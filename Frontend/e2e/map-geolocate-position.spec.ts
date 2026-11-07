import { expect, test } from "@playwright/test";

for (const path of ["/location", "/location/travel"]) {
  for (const viewport of [{ width: 1200, height: 900 }, { width: 390, height: 844 }]) {
    test(`geolocation control sits at the left of ${path} at ${viewport.width}px`, async ({ page, context }) => {
      await page.setViewportSize(viewport);
      await context.grantPermissions(["geolocation"]);
      await context.setGeolocation({ latitude: 21, longitude: 105 });
      await page.addInitScript(() => localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
        user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "" }, accessToken: "test", refreshToken: "test",
      }, version: 0 })));
      await page.route("**/api/**", (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/api/location/home-location") return route.fulfill({ json: null });
        if (url.pathname.endsWith("/page") || url.pathname === "/api/location/travel/map") return route.fulfill({ json: { page: 1, offset: 0, total: 0, limit: 30, items: [] } });
        return route.fulfill({ json: [] });
      });
      await page.route("**/hubs/**", (route) => route.abort());
      await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({ json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {} }));
      await page.goto(path);
      const control = page.locator(".mapboxgl-ctrl-geolocate");
      await expect(control).toBeVisible();
      const mapBox = (await page.locator(".mapboxgl-map").boundingBox())!;
      const controlBox = (await control.boundingBox())!;
      const scenesBox = (await page.locator(".place__scenes, .locations__scenes").first().boundingBox())!;
      expect(Math.abs(controlBox.x - scenesBox.x)).toBeLessThanOrEqual(1);
      expect(mapBox.y + mapBox.height - controlBox.y - controlBox.height).toBeCloseTo(8, 0);
    });
  }
}

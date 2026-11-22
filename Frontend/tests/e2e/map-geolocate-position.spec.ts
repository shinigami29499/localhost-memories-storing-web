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
      await page.route(/^https?:\/\/[^/]+\/api\//, (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/api/place/home-location") return route.fulfill({ json: null });
        if (url.pathname.endsWith("/page") || url.pathname === "/api/place/travel/map") return route.fulfill({ json: { page: 1, offset: 0, total: 0, limit: 30, items: [] } });
        return route.fulfill({ json: [] });
      });
      await page.route("**/hubs/**", (route) => route.abort());
      await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({ json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {} }));
      await page.goto(path);
      const control = page.locator(".mapboxgl-ctrl-geolocate");
      await expect(control).toBeVisible();
      const controlGroup = page.locator(".mapboxgl-ctrl-group:has(.mapboxgl-ctrl-geolocate)");
      await expect(controlGroup).toHaveCSS("border-top-width", "2px");
      const colors = await page.evaluate(() => {
        const probe = document.createElement("div");
        probe.style.borderColor = "var(--border-control)";
        probe.style.backgroundColor = "var(--surface-raised)";
        probe.style.top = "var(--box-inset)";
        document.body.append(probe);
        const style = getComputedStyle(probe);
        const result = { border: style.borderTopColor, surface: style.backgroundColor, inset: style.top };
        probe.style.backgroundColor = "oklch(0.92 0 0)";
        const hover = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return { ...result, hover };
      });
      await expect(controlGroup).toHaveCSS("border-top-color", colors.border);
      await control.hover();
      await expect(control).toHaveCSS("background-color", colors.surface);
      const hoverFill = await control.evaluate((element) => {
        const style = getComputedStyle(element, "::before");
        return { background: style.backgroundColor, inset: style.top };
      });
      expect(hoverFill).toEqual({ background: colors.hover, inset: colors.inset });
      const mapBox = (await page.locator(".mapboxgl-map").boundingBox())!;
      const controlBox = (await controlGroup.boundingBox())!;
      const scenesBox = (await page.locator(".place__scenes, .locations__scenes").first().boundingBox())!;
      expect(Math.abs(controlBox.x - scenesBox.x)).toBeLessThanOrEqual(1);
      expect(mapBox.y + mapBox.height - controlBox.y - controlBox.height).toBeCloseTo(8, 0);
    });
  }
}

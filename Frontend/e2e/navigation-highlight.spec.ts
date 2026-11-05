import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" },
      accessToken: "test", refreshToken: "test",
    }, version: 0 }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
  });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/location/home-location") return route.fulfill({ json: null });
    if (path === "/api/users/page") {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return route.fulfill({ json: { items: [], page: 1, limit: 20, total: 0, allCount: 0, pendingCount: 0 } });
    }
    if (path.includes("/page") || path === "/api/location/travel/map" || path.startsWith("/api/library/gallery")) {
      return route.fulfill({ json: { items: [], offset: 0, page: 1, limit: 20, total: 0 } });
    }
    return route.fulfill({ json: [] });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.abort());
});

async function checkSlide(page: Page, barSelector: string, targetName: string) {
  const bar = page.locator(barSelector);
  const highlight = bar.locator('[data-slot="motion-highlight"]');
  await expect(highlight).toBeVisible();
  await highlight.evaluate((node) => node.setAttribute("data-test-original", "true"));
  const start = (await highlight.boundingBox())!;
  await bar.evaluate((node) => {
    const indicator = node.querySelector('[data-slot="motion-highlight"]')!;
    const samples: { x: number; y: number; connected: boolean }[] = [];
    (window as Window & { highlightSamples?: typeof samples }).highlightSamples = samples;
    node.addEventListener("click", () => {
      const started = performance.now();
      const sample = () => {
        samples.push({ x: indicator.getBoundingClientRect().x, y: indicator.getBoundingClientRect().y, connected: indicator.isConnected });
        if (performance.now() - started < 700) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }, { once: true, capture: true });
  });
  const target = bar.getByRole("link").filter({ hasText: targetName }).or(bar.getByRole("button").filter({ hasText: targetName })).or(bar.getByRole("tab").filter({ hasText: targetName }));
  await target.click();
  await expect(target).toHaveCSS("background-color", await highlight.evaluate((node) => getComputedStyle(node).backgroundColor));
  await page.waitForTimeout(750);
  const samples = await page.evaluate(() => (window as Window & { highlightSamples?: { x: number; y: number; connected: boolean }[] }).highlightSamples ?? []);
  const end = (await highlight.boundingBox())!;
  expect(samples.every((sample) => sample.connected), JSON.stringify(samples)).toBe(true);
  await expect(highlight).toHaveAttribute("data-test-original", "true");
  const distance = end.x - start.x;
  expect(Math.abs(distance)).toBeGreaterThan(30);
  expect(Math.max(...samples.map((sample) => Math.abs(sample.y - start.y))), JSON.stringify(samples)).toBeLessThan(1);
  expect(samples.filter((sample) => {
    const progress = (sample.x - start.x) / distance;
    return progress > 0.01 && progress < 0.99;
  }).length, JSON.stringify(samples)).toBeGreaterThan(2);
}

for (const width of [1280, 390]) {
  test(`gallery, location and users highlights slide at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/gallery");
    await checkSlide(page, ".gallery-page__media-toolbar", "Album");
    await checkSlide(page, ".gallery-page__media-toolbar", "Gallery");
    await page.goto("/location");
    await checkSlide(page, ".place__view-switch", "Saved");
    await checkSlide(page, ".place__view-switch", "History");
    await checkSlide(page, ".place__view-switch", "Map");
    await page.goto("/users");
    await expect(page.getByRole("tab", { name: /All users/ })).toContainText("0");
    await checkSlide(page, ".admin-users__filters", "Pending");
    await checkSlide(page, ".admin-users__filters", "All users");
  });
}

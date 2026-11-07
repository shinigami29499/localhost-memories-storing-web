import { expect, test } from "@playwright/test";

test("location action bar exits continuously when opening Home", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: { user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test" }, version: 0 }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
  });
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/location/home-location") return route.fulfill({ json: null });
    if (path.endsWith("/page") || path === "/api/location/travel/map") return route.fulfill({ json: { page: 1, offset: 0, limit: 30, total: 0, items: [], hasMore: false } });
    return route.fulfill({ json: [] });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({ json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {} }));
  await page.goto("/location");
  await expect(page.getByRole("button", { name: "Add", exact: true })).toBeVisible();
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const samples: { time: number; visible: boolean; width: number }[] = [];
    (window as Window & { exitSamples: typeof samples }).exitSamples = samples;
    const start = performance.now();
    const sample = () => {
      const element = document.querySelector<HTMLElement>("[data-collapsing-bar], .page-action-bar__item > .map-navigation__toolbar");
      const rect = element?.getBoundingClientRect();
      const style = element && getComputedStyle(element);
      const parent = element?.parentElement && getComputedStyle(element.parentElement);
      samples.push({ time: performance.now() - start, visible: !!rect && rect.width > 1 && rect.height > 1 && style?.display !== "none" && style?.visibility !== "hidden" && Number(style?.opacity) > 0 && parent?.display !== "none" && Number(parent?.opacity) > 0, width: rect?.width ?? 0 });
      if (performance.now() - start < 450) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.waitForTimeout(500);
  const samples = await page.evaluate(() => (window as Window & { exitSamples: { time: number; visible: boolean; width: number }[] }).exitSamples);
  const firstVisible = samples.findIndex((sample) => sample.visible);
  const lastVisible = samples.findLastIndex((sample) => sample.visible);
  expect(firstVisible).toBeGreaterThanOrEqual(0);
  expect(samples.slice(firstVisible, lastVisible + 1).every((sample) => sample.visible), JSON.stringify(samples)).toBe(true);
  expect(samples[lastVisible].time - samples[firstVisible].time).toBeGreaterThan(100);
  await expect(page.locator("[data-collapsing-bar], [data-user-transition-exit]")).toHaveCount(0);
});

import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 1571, height: 1270 }, { width: 390, height: 844 }]) {
test(`location transition includes the bottom controls at ${viewport.width}px`, async ({ page }) => {
  await page.setViewportSize(viewport);
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: { user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "" }, accessToken: "test", refreshToken: "test" }, version: 0 }));
    localStorage.setItem("shinigacim.page-transition", "iris");
  });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/location/home-location") return route.fulfill({ json: null });
    if (path === "/api/location") return route.fulfill({ json: [{ id: "p1", name: "Place", markerColor: "#00AA00", markerIcon: "P", rating: 2, mediaIds: [], address: "", note: "", createdAt: "2026-01-01", owner: { id: "u1", username: "viewer" }, latitude: 10, longitude: 106 }] });
    if (path === "/api/library/gallery") return route.fulfill({ json: { offset: 0, limit: 20, total: 0, items: [] } });
    return route.fulfill({ json: [] });
  });
  await page.goto("/location");
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await page.waitForTimeout(1000);
  const section = page.locator(".place__view-content > .page-transition");
  const search = section.locator(".place__search-bar");
  const sectionBox = await section.boundingBox();
  const searchBox = await search.boundingBox();
  expect(searchBox!.y + searchBox!.height).toBeLessThanOrEqual(sectionBox!.y + sectionBox!.height);
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.hasAttribute("data-page-transition-live-root"))).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement, "::view-transition-new(root)").display)).toBe("none");
  await expect(page.getByRole("button", { name: "Map", exact: true })).toHaveAttribute("aria-pressed", "true");
});
}

test("location tabs respond immediately while history loads", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: { user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "" }, accessToken: "test", refreshToken: "test" }, version: 0 }));
  });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/location/visits/all") {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return route.fulfill({ json: [] });
    }
    if (path === "/api/location/home-location") return route.fulfill({ json: null });
    if (path === "/api/library/gallery") return route.fulfill({ json: { offset: 0, limit: 20, total: 0, items: [] } });
    return route.fulfill({ json: [] });
  });
  await page.goto("/location");
  for (const name of ["Saved", "History", "Map", "History", "Saved", "Map"]) {
    const tab = page.getByRole("button", { name, exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-pressed", "true", { timeout: 500 });
  }
  await page.waitForTimeout(700);
  for (const name of ["Saved", "History", "Map", "History", "Saved", "Map"]) {
    await page.getByRole("button", { name, exact: true }).click();
    const positions = await page.evaluate(async () => {
      const values: number[] = [];
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const sample = () => {
          const highlight = document.querySelector('[data-slot="motion-highlight"]');
          if (highlight) values.push(highlight.getBoundingClientRect().x);
          if (performance.now() - start < 450) requestAnimationFrame(sample);
          else resolve();
        };
        requestAnimationFrame(sample);
      });
      return values;
    });
    expect(new Set(positions.map((x) => Math.round(x))).size).toBeGreaterThan(3);
  }
});

test("location empty-state descriptions align with their titles", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: { user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "" }, accessToken: "test", refreshToken: "test" }, version: 0 }));
  });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/location/home-location") return route.fulfill({ json: null });
    if (path === "/api/library/gallery") return route.fulfill({ json: { offset: 0, limit: 20, total: 0, items: [] } });
    return route.fulfill({ json: [] });
  });
  await page.goto("/location");
  for (const name of ["Saved", "History"]) {
    await page.getByRole("button", { name, exact: true }).click();
    const empty = page.locator(".place__view-content .empty-state");
    await expect(empty).toBeVisible();
    const box = await empty.boundingBox();
    const hint = await empty.locator(".empty-state__hint").boundingBox();
    expect(Math.abs((box!.x + box!.width / 2) - (hint!.x + hint!.width / 2))).toBeLessThan(1);
  }
});

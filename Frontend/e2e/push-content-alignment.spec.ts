import { expect, test } from "@playwright/test";

test("outgoing gallery stays vertically aligned when the page push starts", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: { user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test" }, version: 0 }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
  });
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/library/gallery") return route.fulfill({ json: { offset: 0, limit: 20, total: 1, items: [{ id: "m1", createdAt: "2026-11-07T12:00:00Z", mediaKind: "image", mimeType: "image/png", originalFilename: "photo.png", fileSizeBytes: 100, isFavorited: false }] } });
    if (path.endsWith("/page")) return route.fulfill({ json: { page: 1, total: 0, limit: 30, items: [], allCount: 0, pendingCount: 0 } });
    return route.fulfill({ json: [] });
  });
  await page.route("**/hubs/**", route => route.abort());
  await page.goto("/gallery");
  const heading = page.locator(".gallery-group__title").first();
  await expect(heading).toBeVisible();
  await page.waitForTimeout(500);
  const before = (await heading.boundingBox())!;
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      if (this.closest("[data-push-transition]")) {
        const heading = this.querySelector<HTMLElement>(".gallery-group__title");
        if (heading) (window as Window & { outgoingHeadingTop?: number }).outgoingHeadingTop = heading.getBoundingClientRect().top;
      }
      return original.apply(this, args);
    };
  });
  await page.getByRole("link", { name: "Users", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { outgoingHeadingTop?: number }).outgoingHeadingTop)).toBeDefined();
  const outgoingTop = await page.evaluate(() => (window as Window & { outgoingHeadingTop: number }).outgoingHeadingTop);
  expect(Math.abs(outgoingTop - before.y)).toBeLessThan(1);
});

for (const [source, selector] of [["/users", ".admin-users__table"], ["/location", ".place__workspace"]] as const) {
  test(`${source} snapshot keeps its original vertical position`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({ state: { user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test" }, version: 0 }));
      localStorage.setItem("shinigacim.animations-enabled", "true");
    });
    await page.route("**/api/**", route => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/location/home-location") return route.fulfill({ json: null });
      if (path === "/api/users/page") return route.fulfill({ json: { page: 1, total: 1, limit: 30, items: [{ id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" }], allCount: 1, pendingCount: 0 } });
      if (path.endsWith("/page") || path.startsWith("/api/library/gallery") || path === "/api/location/travel/map") return route.fulfill({ json: { page: 1, total: 0, limit: 30, items: [] } });
      return route.fulfill({ json: [] });
    });
    await page.route("**/hubs/**", route => route.abort());
    await page.route(/https:\/\/[^/]*mapbox\.com\//, route => route.fulfill({ json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {} }));
    await page.goto(source);
    const content = page.locator(selector).first();
    await expect(content).toBeVisible();
    await page.waitForTimeout(500);
    const before = (await content.boundingBox())!;
    await page.evaluate((query) => {
      const original = Element.prototype.animate;
      Element.prototype.animate = function (...args) {
        if (this.closest("[data-push-transition]")) {
          const target = this.querySelector<HTMLElement>(query);
          if (target) (window as Window & { outgoingTop?: number }).outgoingTop = target.getBoundingClientRect().top;
        }
        return original.apply(this, args);
      };
    }, selector);
    await page.getByRole("link", { name: "Gallery", exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as Window & { outgoingTop?: number }).outgoingTop)).toBeDefined();
    const outgoingTop = await page.evaluate(() => (window as Window & { outgoingTop: number }).outgoingTop);
    expect(Math.abs(outgoingTop - before.y)).toBeLessThan(1);
  });
}

for (const width of [390, 1280]) test(`gallery day tiles retain their positions when pushing to location at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: { user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test" }, version: 0 }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
  });
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/library/gallery") return route.fulfill({ json: { offset: 0, limit: 20, total: 3, items: ["2026-11-07", "2026-11-06", "2026-11-05"].map((date, i) => ({ id: `m${i}`, createdAt: `${date}T12:00:00Z`, mediaKind: "image", mimeType: "image/png", originalFilename: "photo.png", fileSizeBytes: 100, isFavorited: false })) } });
    if (path === "/api/location/home-location") return route.fulfill({ json: null });
    if (path.endsWith("/page") || path === "/api/location/travel/map") return route.fulfill({ json: { page: 1, total: 0, limit: 30, items: [] } });
    return route.fulfill({ json: [] });
  });
  await page.route("**/hubs/**", route => route.abort());
  await page.route(/https:\/\/[^/]*mapbox\.com\//, route => route.fulfill({ json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {} }));
  await page.goto("/gallery");
  const tiles = page.locator("[data-gallery-window-id]");
  await expect(tiles).toHaveCount(3);
  await page.waitForTimeout(600);
  const before = await tiles.evaluateAll(nodes => nodes.map(node => ({ id: node.getAttribute("data-gallery-window-id"), top: node.getBoundingClientRect().top })));
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      if (this.closest("[data-push-transition]")) {
        const tiles = [...this.querySelectorAll<HTMLElement>("[data-gallery-window-id]")];
        if (tiles.length) (window as Window & { outgoingTiles?: { id: string | null; top: number }[] }).outgoingTiles = tiles.map(tile => ({ id: tile.getAttribute("data-gallery-window-id"), top: tile.getBoundingClientRect().top }));
      }
      return original.apply(this, args);
    };
  });
  await page.getByRole("link", { name: "Locations", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { outgoingTiles?: unknown }).outgoingTiles)).toBeDefined();
  const after = await page.evaluate(() => (window as Window & { outgoingTiles: { id: string | null; top: number }[] }).outgoingTiles);
  expect(after.map(tile => tile.id)).toEqual(before.map(tile => tile.id));
  for (let i = 0; i < before.length; i++) expect(Math.abs(after[i].top - before[i].top), `tile ${before[i].id}`).toBeLessThan(1);
});

import { expect, test } from "@playwright/test";

for (const width of [1280, 1920, 2560]) test(`gallery tile highlights and scales together on hover at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" },
      accessToken: "test", refreshToken: "test",
    }, version: 0 }));
  });
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/file")) return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/>' });
    return route.fulfill({ json: path.startsWith("/api/library/gallery")
      ? { offset: 0, limit: 20, total: 1, items: [{ id: "m1", originalFilename: "image.jpg", mediaKind: "image", mimeType: "image/jpeg", fileSizeBytes: 100, createdAt: "2026-11-07T10:00:00Z", ownerUsername: "viewer", isFavorited: false }], hasMore: false }
      : [] });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.goto("/gallery");
  const tile = page.locator(".gallery-date-grid .media-tile").first();
  await expect(tile).toBeVisible();
  const before = await tile.boundingBox();
  await tile.hover();
  await expect(tile).toHaveCSS("background-color", "rgb(106, 63, 54)");
  await expect(tile.locator(".gallery-tile__info")).toHaveCSS("color", "rgb(244, 243, 238)");
  await expect.poll(async () => (await tile.boundingBox())!.width / before!.width).toBeCloseTo(1.09, 2);
  const bounds = await tile.evaluate((element) => {
    const tile = element.getBoundingClientRect();
    const row = element.closest(".gallery-day-row")!.getBoundingClientRect();
    return { top: tile.top - row.top, bottom: row.bottom - tile.bottom, left: tile.left - row.left, right: row.right - tile.right };
  });
  expect(bounds.top).toBeGreaterThanOrEqual(0);
  expect(bounds.bottom).toBeGreaterThanOrEqual(0);
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeGreaterThanOrEqual(0);
  await expect(tile.locator(".media-tile__preview")).toHaveCSS("transform", "none");
});

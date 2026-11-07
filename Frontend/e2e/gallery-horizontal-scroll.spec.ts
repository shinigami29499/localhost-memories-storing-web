import { expect, test } from "@playwright/test";

for (const path of ["/gallery", "/gallery/trash"]) {
  test(`horizontal media scrolling works on ${path}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
        user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" },
        accessToken: "test", refreshToken: "test",
      }, version: 0 }));
    });
    const items = Array.from({ length: 20 }, (_, i) => ({
      id: `media-${i}`, originalFilename: `image-${i}.jpg`, mediaKind: "image", mimeType: "image/jpeg",
      fileSizeBytes: 100, createdAt: "2026-11-06T10:00:00Z", isFavorited: false,
    }));
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith("/file")) return route.abort();
      return route.fulfill({ json: url.pathname.startsWith("/api/library/gallery")
        ? { offset: 0, limit: 20, total: items.length, items }
        : [] });
    });
    await page.route("**/hubs/**", (route) => route.abort());
    await page.goto(path);
    const row = page.locator(".gallery-date-grid--virtual").first();
    const tile = row.locator(".media-tile").first();
    await expect(tile).toBeVisible();
    await expect(tile).toHaveCSS("touch-action", "manipulation");
    const box = await tile.boundingBox();
    if (!box) throw new Error("Tile has no bounding box");
    const cdp = await context.newCDPSession(page);
    const y = box.y + box.height / 2;
    const startX = box.x + box.width * 0.8;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: startX, y }] });
    for (let distance = 20; distance <= 140; distance += 20) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: startX - distance, y }] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => row.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await context.close();
  });
}

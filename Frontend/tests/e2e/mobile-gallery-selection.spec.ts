import { expect, test } from "@playwright/test";

test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

test("touch drag selects media and preview returns focus", async ({ page, context }) => {
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "" },
      accessToken: "test", refreshToken: "test",
    }, version: 0 }));
    localStorage.setItem("shinigacim.animations-enabled", "false");
  });
  const items = Array.from({ length: 3 }, (_, index) => ({
    id: `m${index}`, mediaKind: "image", originalFilename: `photo${index}.png`,
    createdAt: "2026-11-09T10:00:00Z", isFavorited: false, ownerUsername: "viewer",
  }));
  const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");
  await page.route(/^https?:\/\/[^/]+\/api\//, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/file")) return route.fulfill({ contentType: "image/png", body: pixel });
    if (path === "/api/library/album") return route.fulfill({ json: [] });
    if (path === "/api/library/gallery") return route.fulfill({ json: { offset: 0, total: items.length, items } });
    return route.fulfill({ json: { items: [], offset: 0, total: 0 } });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.goto(process.env.MOBILE_E2E_URL ? `${process.env.MOBILE_E2E_URL}/gallery` : "/gallery");
  const tiles = items.map(({ id }) => page.locator(`[data-media-id="${id}"]`));
  await expect(tiles[2]).toBeVisible();
  const boxes = await Promise.all(tiles.map((tile) => tile.boundingBox()));
  const point = (index: number) => ({ x: boxes[index]!.x + boxes[index]!.width / 2, y: boxes[index]!.y + boxes[index]!.height / 2 });
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(0)] });
  await page.waitForTimeout(600);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(1)] });
  await expect(tiles[1]).toHaveAttribute("aria-pressed", "true");
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(2)] });
  await expect(tiles[2]).toHaveAttribute("aria-pressed", "true");
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  for (const tile of tiles) await expect(tile).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(tiles[0]).not.toHaveAttribute("aria-pressed", "true");
  await tiles[0].click();
  await page.getByRole("button", { name: "Close image preview" }).click();
  await expect(tiles[0]).toBeFocused();
});




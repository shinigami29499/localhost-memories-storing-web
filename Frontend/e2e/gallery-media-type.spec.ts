import { expect, test } from "@playwright/test";

for (const width of [320, 1280]) {
  test(`media type badges stay inside previews at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
        user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" },
        accessToken: "test", refreshToken: "test",
      }, version: 0 }));
    });
    await page.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      const items = ["image", "video"].map((mediaKind, index) => ({
        id: `m${index}`, mediaKind, mimeType: mediaKind === "image" ? "image/jpeg" : "video/mp4",
        originalFilename: `media${index}`, fileSizeBytes: 1, createdAt: "2026-11-07T12:00:00Z",
        isFavorited: false, ownerUsername: "viewer",
      }));
      return route.fulfill({ json: path === "/api/library/gallery" ? { offset: 0, limit: 20, total: 2, items } : [] });
    });
    await page.route("**/hubs/**", (route) => route.abort());
    await page.goto("/gallery");
    const tiles = page.locator(".media-tile");
    await expect(tiles).toHaveCount(2);
    for (const [index, label] of ["Image", "Video"].entries()) {
      const tile = tiles.nth(index);
      const badge = tile.locator(".media-tile__type");
      await expect(badge).toHaveAttribute("aria-label", label);
      const bounds = await badge.evaluate((element) => {
        const badge = element.getBoundingClientRect();
        const preview = element.closest(".gallery-tile__preview")!.getBoundingClientRect();
        const tile = element.closest(".media-tile")!.getBoundingClientRect();
        const info = element.closest(".media-tile")!.querySelector(".gallery-tile__info")!.getBoundingClientRect();
        return { right: preview.right - badge.right, bottom: preview.bottom - badge.bottom, top: preview.top - tile.top, gap: info.top - preview.bottom, background: getComputedStyle(element).backgroundColor, color: getComputedStyle(element).color };
      });
      expect(bounds.right).toBeGreaterThan(0);
      expect(bounds.right).toBeLessThanOrEqual(13);
      expect(bounds.bottom).toBeGreaterThan(0);
      expect(bounds.bottom).toBeLessThanOrEqual(13);
      expect(Math.abs(bounds.top)).toBeLessThanOrEqual(1);
      expect(Math.abs(bounds.gap)).toBeLessThanOrEqual(2);
      expect(bounds.background).toBe("rgb(244, 243, 238)");
      expect(bounds.color).toBe("rgb(106, 63, 54)");
      await tile.focus();
      await page.keyboard.press("Shift+Space");
      await expect(badge).toBeHidden();
      await page.keyboard.press("Shift+Space");
    }
  });
}

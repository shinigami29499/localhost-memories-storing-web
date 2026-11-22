import { expect, test } from "@playwright/test";

for (const width of [320, 390, 640, 641, 767]) {
  test(`gallery action bars match map sizing and offsets at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
        user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "" },
        accessToken: "test", refreshToken: "test",
      }, version: 0 }));
      localStorage.setItem("shinigacim.animations-enabled", "false");
    });
    const media = {
      id: "m1", mediaKind: "image", mimeType: "image/png", originalFilename: "alignment.png",
      fileSizeBytes: 128, createdAt: "2026-10-28T00:00:00Z", isFavorited: true, ownerId: "u1",
    };
    const album = {
      id: "a1", name: "Alignment album", caption: "", isPublic: false,
      owner: { id: "u1", username: "viewer" }, mediaCount: 1, previewMediaId: null,
      createdAt: "2026-10-28T00:00:00Z",
    };
    await page.route("**/hubs/**", (route) => route.abort());
    await page.route(/^https?:\/\/[^/]+\/api\//, (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/library/album/a1") return route.fulfill({ json: album });
      if (path === "/api/library/album/membership/query") return route.fulfill({ json: { items: [] } });
      if (path.endsWith("/file")) return route.fulfill({
        contentType: "image/png",
        body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64"),
      });
      return route.fulfill({ json: path.startsWith("/api/library/")
        ? { offset: 0, limit: 20, total: 1, items: [path === "/api/library/album/page" ? album : media], hasMore: false }
        : [] });
    });
    for (const path of ["/album", "/album/a1"]) {
      await page.goto(path);
      const bar = page.locator(".page-action-bar__item > .gallery-page__actions");
      await expect(bar).toBeVisible();
      const button = bar.locator(".gallery-selection-bar__action").first();
      const size = width <= 640 ? 40 : 50;
      await expect(button).toHaveCSS("width", `${size}px`);
      await expect(button).toHaveCSS("min-height", `${size}px`);
      await expect(button.locator("svg").first()).toHaveCSS("width", width <= 640 ? "18px" : "20px");
      await expect(bar).toHaveCSS("border-top-width", "2px");
      await expect(bar).toHaveCSS("padding", "0px");
      await expect.poll(async () => {
        const bounds = (await bar.boundingBox())!;
        const main = (await page.locator(".app-shell__main").boundingBox())!;
        return {
          width: Math.round(bounds.width),
          right: Math.round(main.x + main.width - bounds.x - bounds.width),
          bottom: Math.round(main.y + main.height - bounds.y - bounds.height),
        };
      }).toEqual({ width: size + 4, right: 12, bottom: 12 });
    }
  });
}

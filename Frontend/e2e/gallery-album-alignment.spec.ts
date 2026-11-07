import { expect, test } from "@playwright/test";

for (const width of [390, 700, 1440]) {
  test(`album and gallery date headings align at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" },
      accessToken: "test", refreshToken: "test",
    }, version: 0 })));
    const dates = ["2026-11-07T12:00:00Z", "2026-11-05T12:00:00Z", "2026-11-03T12:00:00Z"];
    const media = dates.map((createdAt, i) => ({ id: `m${i}`, createdAt, mediaKind: "image", mimeType: "image/png", originalFilename: "photo.png", fileSizeBytes: 100, isFavorited: false }));
    const albums = dates.map((createdAt, i) => ({ id: `a${i}`, name: `Album ${i}`, caption: "", isPublic: true, owner: { id: "u1", username: "viewer" }, mediaCount: 1, previewMediaId: null, createdAt }));
    await page.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/library/gallery") return route.fulfill({ json: { offset: 0, limit: 20, total: media.length, items: media } });
      if (path === "/api/library/album/page") return route.fulfill({ json: { items: albums, hasMore: false } });
      return route.fulfill({ json: [] });
    });
    await page.route("**/hubs/**", (route) => route.abort());
    const positions = async () => page.locator(".gallery-group__title").evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top));
    await page.goto("/gallery");
    await expect(page.locator(".gallery-group__title")).toHaveCount(3);
    const gallery = await positions();
    await page.goto("/gallery/album");
    await expect(page.locator(".gallery-group__title")).toHaveCount(3);
    const album = await positions();
    for (let i = 0; i < gallery.length; i++) expect(Math.abs(gallery[i] - album[i]), `heading ${i}: gallery ${gallery[i]}, album ${album[i]}`).toBeLessThan(2);
  });
}

import { expect, test } from "@playwright/test";

test("three gallery days fit in the mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" },
      accessToken: "test", refreshToken: "test",
    }, version: 0 }));
  });
  const items = Array.from({ length: 9 }, (_, i) => ({
    id: `media-${i}`, originalFilename: `image-${i}.jpg`, mediaKind: "image", mimeType: "image/jpeg",
    fileSizeBytes: 100, createdAt: `2026-11-0${7 - Math.floor(i / 3)}T10:00:00Z`, isFavorited: false,
  }));
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/file")) return route.abort();
    return route.fulfill({ json: path.startsWith("/api/library/gallery")
      ? { offset: 0, limit: 20, total: items.length, items, hasMore: false }
      : [] });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.goto("/gallery");
  const rows = page.locator(".gallery-date-grid--virtual");
  await expect(rows).toHaveCount(3);
  const bounds = await page.evaluate(() => {
    const scroll = document.querySelector(".gallery-page__media-scroll")!.getBoundingClientRect();
    const navigation = document.querySelector(".gallery-page__media-toolbar")!.getBoundingClientRect();
    const rows = Array.from(document.querySelectorAll(".gallery-date-grid--virtual"));
    const heading = document.querySelector(".gallery-group__title")!.getBoundingClientRect();
    return { top: scroll.top, bottom: scroll.bottom, gap: heading.top - navigation.bottom, first: rows[0].getBoundingClientRect().top,
      last: rows[2].querySelector(".media-tile")!.getBoundingClientRect().bottom };
  });
  expect(bounds.gap).toBeLessThanOrEqual(15);
  expect(bounds.first).toBeGreaterThanOrEqual(bounds.top);
  expect(bounds.last).toBeLessThanOrEqual(bounds.bottom);
});

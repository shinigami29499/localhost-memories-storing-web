import { expect, test } from "@playwright/test";

const media = Array.from({ length: 60 }, (_, index) => ({
  id: `11111111-1111-4111-8111-${String(index + 1).padStart(12, "0")}`,
  mediaKind: "image",
  mimeType: "image/png",
  originalFilename: `gallery-test-${index + 1}.png`,
  fileSizeBytes: 128,
  createdAt: "2026-10-28T00:00:00Z",
  updatedAt: "2026-10-28T00:00:00Z",
  isFavorited: false,
  ownerId: "22222222-2222-4222-8222-222222222222",
}));

test("PWA revisit renders cached gallery without downloading gallery pages again", async ({ page }) => {
  let galleryRequests = 0;
  let changeChecks = 0;
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({
      state: {
        user: { id: "viewer-1", username: "viewer", role: "user", status: "active", createdAt: "" },
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
      },
      version: 0,
    }));
    const originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => query === "(display-mode: standalone)"
      ? ({ matches: true, media: query, onchange: null, addListener() {}, removeListener() {},
        addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false } as MediaQueryList)
      : originalMatchMedia(query);
  });

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/library/gallery/changes") {
      changeChecks += 1;
      await route.fulfill({ json: { checkedAt: new Date().toISOString(), changes: [] } });
      return;
    }
    if (url.pathname === "/api/library/gallery") {
      galleryRequests += 1;
      await route.fulfill({ json: { offset: 0, limit: 20, total: media.length, items: media } });
      return;
    }
    if (url.pathname.endsWith("/file")) {
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64"),
      });
      return;
    }
    await route.fulfill({ json: [] });
  });

  await page.goto("/library/gallery");
  await expect(page.getByRole("button", { name: "Open gallery-test-1.png" })).toBeVisible();
  await expect.poll(() => galleryRequests).toBe(1);
  await expect.poll(() => page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("shinigacim-gallery", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const gallery = await new Promise<{ pages?: { items?: unknown[] }[] } | undefined>((resolve, reject) => {
      const request = database.transaction("galleries").objectStore("galleries").get("viewer-1:pictures:image");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return gallery?.pages?.[0]?.items?.length ?? 0;
  })).toBe(60);

  const scrollport = page.locator(".gallery-page__content");
  await scrollport.evaluate((element) => { element.scrollTop = 1600; element.dispatchEvent(new Event("scroll", { bubbles: true })); });
  await expect(page.locator('[data-media-id="11111111-1111-4111-8111-000000000001"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open gallery-test-60.png" })).toBeVisible();

  await scrollport.evaluate((element) => { element.scrollTop = 0; element.dispatchEvent(new Event("scroll", { bubbles: true })); });
  await expect(page.getByRole("button", { name: "Open gallery-test-1.png" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Open gallery-test-1.png" })).toBeVisible();
  await expect(page.getByText("Loading media…")).toBeHidden();
  await expect.poll(() => changeChecks).toBeGreaterThan(0);
  expect(galleryRequests).toBe(1);
});

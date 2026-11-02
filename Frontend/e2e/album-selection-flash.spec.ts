import { expect, test } from "@playwright/test";

const albumId = "9649fc10-9d1c-40c6-8487-320c91948349";
const media = Array.from({ length: 2 }, (_, index) => ({
  id: `11111111-1111-4111-8111-${String(index + 1).padStart(12, "0")}`,
  mediaKind: "image", mimeType: "image/png", originalFilename: `flash-test-${index + 1}.png`,
  fileSizeBytes: 128, createdAt: "2026-10-28T00:00:00Z", isFavorited: true,
  ownerId: "22222222-2222-4222-8222-222222222222",
}));

test("keeps the album selection and highlight stable when removing selected favorites", async ({ page }) => {
  let albumMediaRequests = 0;
  await page.addInitScript(() => localStorage.setItem("shinigacim-auth", JSON.stringify({
    state: { user: { id: "22222222-2222-4222-8222-222222222222", username: "viewer", role: "user", status: "active", createdAt: "" }, accessToken: "test", refreshToken: "test" }, version: 0,
  })));
  await page.route("**/api/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === `/api/library/album/${albumId}`) {
      await route.fulfill({ json: { id: albumId, name: "Flash album", caption: "", isPublic: false, owner: { id: "22222222-2222-4222-8222-222222222222", username: "viewer" }, mediaCount: 2, previewMediaId: null, previewIsFavorited: false, customPreviewMediaId: null, containsMedia: false, createdAt: "2026-10-28T00:00:00Z", updatedAt: null } });
      return;
    }
    if (pathname === `/api/library/album/${albumId}/media`) {
      albumMediaRequests += 1;
      await route.fulfill({ json: { offset: 0, limit: 20, total: media.length, items: media } });
      return;
    }
    if (pathname === "/api/library/gallery/favorites/batch") {
      media.forEach((item) => { item.isFavorited = false; });
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    if (pathname.endsWith("/file")) {
      await route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64") });
      return;
    }
    await route.fulfill({ json: [] });
  });

  await page.goto(`/library/album/${albumId}`);
  const tile = page.getByRole("button", { name: "Open flash-test-1.png" });
  await expect(tile).toBeVisible();
  await tile.focus();
  await page.keyboard.press("Shift+Space");
  const actionBar = page.locator(".gallery-selection-bar");
  const highlight = page.locator(".gallery-page__media-highlight");
  await expect(actionBar).toBeVisible();
  await expect(page.locator(".media-tile--selected")).toHaveCount(1);
  await highlight.evaluate((element) => element.setAttribute("data-test-stability", "retained"));
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Remove from favorites" }).click();
  await expect(page.getByRole("button", { name: "Add to favorites" })).toBeVisible();
  await expect(actionBar).toBeVisible();
  await expect(page.locator(".media-tile--selected")).toHaveCount(1);
  await expect(highlight).toHaveAttribute("data-test-stability", "retained");
  expect(albumMediaRequests).toBe(1);
});

import { expect, test } from "@playwright/test";

for (const width of [390, 1280]) test(`uploads and deletes media inside an album at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  const owner = { id: "viewer", username: "Viewer", role: "admin", status: "active", createdAt: "" };
  const albumId = "album-test";
  const albumPath = "/api/library/album/" + albumId;
  const createdAt = "2026-11-20T12:00:00Z";
  const file = { id: "test-photo", mediaKind: "image", originalFilename: "test.png", createdAt, isFavorited: false };
  let created = false;
  let hasMedia = false;
  let uploaded = false;
  let deletionIds: string[] | undefined;
  let uploadBody: { albumId: string; items: { id: string; originalFilename: string; contentType: string }[] } | undefined;
  const album = () => ({
    id: albumId, owner, createdAt, name: "Weekend", caption: "", isPublic: false,
    mediaCount: hasMedia ? 1 : 0, previewMediaId: null,
  });
  const uploadPath = "/api/sync/upload";
  const batchPath = uploadPath + "/batches/test-batch";
  const uploadItem = () => uploadBody && {
    ...uploadBody.items[0], uploadBatchId: "test-batch", status: uploaded ? "Success" : "Pending",
  };
  const batch = () => ({
    id: "test-batch", albumId, status: uploaded ? "Completed" : "Pending",
    completedAt: uploaded ? createdAt : null, successfulFiles: uploaded ? 1 : 0, failedFiles: 0,
    items: [uploadItem()],
  });

  await page.addInitScript((user) => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({
      state: { user, accessToken: "test", refreshToken: "test" }, version: 0,
    }));
    localStorage.setItem("shinigacim.animations-enabled", "false");
  }, owner);
  await page.route(/^https?:\/\/[^/]+\/hubs\//, (route) => route.abort());
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/library/album/page")
      return route.fulfill({ json: { items: created ? [album()] : [], hasMore: false } });
    if (path === "/api/library/album" && request.method() === "POST") {
      created = true;
      return route.fulfill({ status: 201, json: album() });
    }
    if (path === albumPath)
      return route.fulfill({ json: album() });
    if (path === albumPath + "/media")
      return route.fulfill({ json: { offset: 0, total: hasMedia ? 1 : 0, items: hasMedia ? [file] : [] } });
    if (path === "/api/sync/upload/batches" && request.method() === "POST") {
      uploadBody = request.postDataJSON();
      return route.fulfill({ status: 201, json: batch() });
    }
    if (path === uploadPath + "/active")
      return route.fulfill({ json: uploadBody && !uploaded ? [batch()] : [] });
    if (path === uploadPath + "/queue")
      return route.fulfill({ json: uploadBody && !uploaded ? [uploadItem()] : [] });
    if (path === batchPath)
      return route.fulfill({ json: batch() });
    if (path.startsWith(batchPath + "/items/") && path.endsWith("/file")) {
      uploaded = true;
      hasMedia = true;
      return route.fulfill({ json: uploadItem() });
    }
    if (path.startsWith(batchPath + "/items/"))
      return route.fulfill({ json: uploadItem() });
    if (path === albumPath + "/media/batch/remove") {
      deletionIds = request.postDataJSON().mediaIds;
      hasMedia = false;
      return route.fulfill({ json: album() });
    }
    if (path.endsWith("/file"))
      return route.fulfill({ contentType: "image/png", body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64",
      ) });
    return route.fulfill({ json: [] });
  });

  for (const legacyPath of ["/gallery/favorites", "/library/gallery/favorites"]) {
    await page.goto(legacyPath);
    await expect(page).toHaveURL(/\/gallery$/);
  }
  await expect(page).toHaveURL(/\/gallery$/);
  await expect(page.getByRole("link", { name: "Favorites", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Trash", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add media", exact: true })).toHaveCount(0);
  await expect(page.locator(".gallery-page__actions")).toHaveCount(0);
  await page.getByRole("button", { name: "New album", exact: true }).click();
  const form = page.getByRole("dialog");
  await form.getByRole("textbox").fill("Weekend");
  await form.getByRole("button", { name: "Create", exact: true }).click();

  await expect(page).toHaveURL(/\/gallery\/album\/album-test$/);
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Add media", exact: true }).click();
  await (await chooser).setFiles({ name: "test.png", mimeType: "image/png", buffer: Buffer.from("file") });
  await expect.poll(() => uploadBody).toMatchObject({ albumId, items: [{ originalFilename: "test.png" }] });

  const tile = page.getByRole("button", { name: "Open test.png" });
  await expect(tile).toBeVisible();
  await tile.focus();
  await page.keyboard.press("Shift+Space");
  await page.getByRole("button", { name: "Delete from album", exact: true }).click();
  const confirmation = page.getByRole("alertdialog");
  await expect(confirmation).toContainText("permanently deleted");
  expect(deletionIds).toBeUndefined();
  await confirmation.getByRole("button", { name: "Delete from album", exact: true }).click();
  await expect.poll(() => deletionIds).toEqual([file.id]);
  await expect(tile).toHaveCount(0);
});

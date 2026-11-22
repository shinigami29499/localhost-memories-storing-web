import { expect, test } from "@playwright/test";

test("owner can remove a located photo's location from its desktop deep link", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  const photo = { id: "photo", ownerId: "u1", originalFilename: "photo.jpg", mediaKind: "image", createdAt: "2026-01-01T00:00:00Z",
    isFavorited: false, location: { latitude: 0, longitude: 0 } as { latitude: number; longitude: number } | null };
  const writes: unknown[] = [];
  let releaseWrite!: () => void;
  await page.addInitScript(() => localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
    user: { id: "u1", username: "viewer", role: "user", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test",
  }, version: 0 })));
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/place/travel/photo" && request.method() === "PUT") {
      writes.push(request.postDataJSON());
      await new Promise<void>((resolve) => { releaseWrite = resolve; });
      photo.location = null;
      return route.fulfill({ status: 204 });
    }
    if (path === "/api/place/home-location") return route.fulfill({ json: null });
    if (path === "/api/library/album/media/photo") return route.fulfill({ json: photo });
    if (path === "/api/place/travel/map") return route.fulfill({ json: { offset: 0, total: 1, items: [photo] } });
    if (path.endsWith("/page") || path.startsWith("/api/library/album/media")) return route.fulfill({ json: { offset: 0, total: 0, items: [] } });
    return route.fulfill({ json: [] });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({
    json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {},
  }));
  await page.goto("/location/travel?mediaId=photo");
  const remove = page.getByRole("button", { name: "Remove location" });
  await expect(remove).toBeVisible();
  await remove.click();
  const confirmation = page.getByRole("alertdialog", { name: "Remove this location?" });
  await expect(confirmation).toBeVisible();
  expect(writes).toEqual([]);
  await confirmation.getByRole("button", { name: "Cancel" }).click();
  await expect(confirmation).toBeHidden();
  expect(writes).toEqual([]);
  await remove.click();
  await confirmation.getByRole("button", { name: "Remove location" }).click();
  await expect.poll(() => writes).toEqual([{ latitude: null, longitude: null }]);
  await expect(remove).toBeDisabled();
  await expect(page.getByText("Only the uploader or an administrator can change this location.")).toHaveCount(0);
  releaseWrite();
  await expect(confirmation).toBeHidden();
  await expect(remove).toHaveCount(0);
});


test("other users cannot remove a photo location", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  const photo = { id: "photo", ownerId: "owner", originalFilename: "photo.jpg", mediaKind: "image", createdAt: "2026-01-01T00:00:00Z",
    isFavorited: false, location: { latitude: 0, longitude: 0 } };
  await page.addInitScript(() => localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
    user: { id: "other", username: "viewer", role: "user", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test",
  }, version: 0 })));
  await page.route(/^https?:\/\/[^/]+\/api\//, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/place/home-location") return route.fulfill({ json: null });
    if (path === "/api/library/album/media/photo") return route.fulfill({ json: photo });
    if (path === "/api/place/travel/map") return route.fulfill({ json: { offset: 0, total: 1, items: [photo] } });
    if (path.endsWith("/page") || path.startsWith("/api/library/album/media")) return route.fulfill({ json: { offset: 0, total: 0, items: [] } });
    return route.fulfill({ json: [] });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({
    json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {},
  }));
  await page.goto("/location/travel?mediaId=photo");
  await expect(page.getByText("Only the uploader or an administrator can change this location.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove location" })).toHaveCount(0);
});


test("owner can reach the editor from a focused photo marker", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  const photo = { id: "photo", ownerId: "u1", originalFilename: "photo.jpg", mediaKind: "image", createdAt: "2026-01-01T00:00:00Z",
    isFavorited: false, location: { latitude: 0, longitude: 0 } };
  await page.addInitScript(() => localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
    user: { id: "u1", username: "viewer", role: "user", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test",
  }, version: 0 })));
  await page.route(/^https?:\/\/[^/]+\/api\//, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/place/home-location") return route.fulfill({ json: null });
    if (path === "/api/library/album/media/photo") return route.fulfill({ json: photo });
    if (path === "/api/place/travel/map") return route.fulfill({ json: { offset: 0, total: 1, items: [photo] } });
    if (path.endsWith("/page") || path.startsWith("/api/library/album/media")) return route.fulfill({ json: { offset: 0, total: 0, items: [] } });
    return route.fulfill({ json: [] });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({
    json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {},
  }));
  await page.goto("/location/travel?focusMediaId=photo");
  await page.getByRole("button", { name: "photo.jpg", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove location" })).toBeVisible();
});


test("web phone retains read-only photo locations", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const photo = { id: "photo", ownerId: "u1", originalFilename: "photo.jpg", mediaKind: "image", createdAt: "2026-01-01T00:00:00Z",
    isFavorited: false, location: { latitude: 0, longitude: 0 } };
  await page.addInitScript(() => localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
    user: { id: "u1", username: "viewer", role: "user", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test",
  }, version: 0 })));
  await page.route(/^https?:\/\/[^/]+\/api\//, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/place/home-location") return route.fulfill({ json: null });
    if (path === "/api/library/album/media/photo") return route.fulfill({ json: photo });
    if (path === "/api/place/travel/map") return route.fulfill({ json: { offset: 0, total: 1, items: [photo] } });
    if (path.endsWith("/page") || path.startsWith("/api/library/album/media")) return route.fulfill({ json: { offset: 0, total: 0, items: [] } });
    return route.fulfill({ json: [] });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({
    json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {},
  }));
  await page.goto("/location/travel?focusMediaId=photo");
  await page.getByRole("button", { name: "photo.jpg", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Remove location" })).toHaveCount(0);
});


test("owner can retry a failed move to a changed map coordinate", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  const photo = { id: "photo", ownerId: "u1", originalFilename: "photo.jpg", mediaKind: "image", createdAt: "2026-01-01T00:00:00Z",
    isFavorited: false, location: { latitude: 0, longitude: 0 } };
  const writes: { latitude: number; longitude: number }[] = [];
  await page.addInitScript(() => localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
    user: { id: "u1", username: "viewer", role: "user", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test",
  }, version: 0 })));
  await page.route(/^https?:\/\/[^/]+\/api\//, (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/place/travel/photo" && request.method() === "PUT") {
      writes.push(request.postDataJSON());
      if (writes.length === 1) return route.fulfill({ status: 500, contentType: "application/problem+json", body: JSON.stringify({ title: "Write failed", detail: "Please retry the location change." }) });
      photo.location = writes.at(-1)!;
      return route.fulfill({ status: 204 });
    }
    if (path === "/api/place/home-location") return route.fulfill({ json: null });
    if (path === "/api/library/album/media/photo") return route.fulfill({ json: photo });
    if (path === "/api/place/travel/map") return route.fulfill({ json: { offset: 0, total: 1, items: [photo] } });
    if (path.endsWith("/page") || path.startsWith("/api/library/album/media")) return route.fulfill({ json: { offset: 0, total: 0, items: [] } });
    return route.fulfill({ json: [] });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({
    json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {},
  }));
  await page.goto("/location/travel?mediaId=photo");
  const coordinate = page.locator(".locations__picked strong").last();
  await expect(coordinate).toHaveText("0.000000, 0.000000", { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Confirm", exact: true })).toBeEnabled();
  await page.locator(".mapboxgl-canvas").click({ position: { x: 100, y: 100 }, force: true });
  await expect(coordinate).not.toHaveText("0.000000, 0.000000");
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  const dialog = page.getByRole("alertdialog", { name: "Move this photo?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Move photo" }).click();
  await expect.poll(() => writes.length).toBe(1);
  await expect(dialog).toBeVisible();
  await expect(page.getByText("Please retry the location change.")).toBeVisible();
  expect(writes[0].latitude !== 0 || writes[0].longitude !== 0).toBe(true);
  await dialog.getByRole("button", { name: "Move photo" }).click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1]).toEqual(writes[0]);
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/focusMediaId=photo/);
});

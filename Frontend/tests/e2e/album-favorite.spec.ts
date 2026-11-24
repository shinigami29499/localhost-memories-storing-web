import { expect, test } from "@playwright/test";

test.use({ timezoneId: "Asia/Ho_Chi_Minh" });

for (const motion of ["on", "off", "reduced"] as const) {
test(`album favorite hover, pending feedback and no completion zoom (${motion})`, async ({ page }) => {
  await page.setViewportSize({ width: motion === "on" ? 1024 : 390, height: 844 });
  await page.emulateMedia({
    reducedMotion: motion === "reduced" ? "reduce" : "no-preference",
    colorScheme: motion === "off" ? "dark" : "light",
  });
  await page.clock.setFixedTime(new Date("2026-11-21T04:00:00Z"));
  const owner = { id: "viewer", username: "Alex", role: "user", status: "active", createdAt: "" };
  await page.addInitScript(({ user, motion }) => {
    localStorage.setItem("shinigacim.animations-enabled", String(motion !== "off"));
    localStorage.setItem("shinigacim-auth", JSON.stringify({
      state: { user, accessToken: "test", refreshToken: "test" }, version: 0,
    }));
  }, { user: owner, motion });

  let isFavorited = false;
  let markFavoriteStarted: () => void = () => {};
  let finishFavoriteRequest: () => void = () => {};
  const favoriteStarted = new Promise<void>((resolve) => { markFavoriteStarted = resolve; });
  const favoriteGate = new Promise<void>((resolve) => { finishFavoriteRequest = resolve; });
  const album = {
    id: "album-1",
    name: "Mountain weekend",
    owner,
    createdAt: "2026-11-21T03:00:00Z",
    previewMediaId: null,
    mediaCount: 1,
    caption: "",
    isPublic: false,
    previewIsFavorited: false,
    customPreviewMediaId: null,
    containsMedia: true,
  };

  await page.route(/^https?:\/\/[^/]+\/hubs\//, (route) => route.abort());
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/library/album/page") {
      return route.fulfill({
        json: { items: [{ ...album, isFavorited }], hasMore: false, nextCursor: null },
      });
    }
    if (path === "/api/library/album/album-1/favorite" && request.method() === "POST") {
      markFavoriteStarted();
      await favoriteGate;
      isFavorited = true;
      return route.fulfill({ status: 204 });
    }
    if (path === "/api/library/album/album-1/favorite" && request.method() === "DELETE") {
      isFavorited = false;
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ json: [] });
  });

  await page.goto("/album");
  const addFavorite = page.getByRole("button", { name: "Add to favorites" });
  await expect(addFavorite).toBeVisible();
  const openAlbum = page.getByRole("link", { name: "Open album Mountain weekend" });
  const favoriteBounds = (await addFavorite.boundingBox())!;
  const openBounds = (await openAlbum.boundingBox())!;
  expect(favoriteBounds.x + favoriteBounds.width).toBeLessThan(openBounds.x);
  expect(favoriteBounds.width).toBe(40);
  expect(favoriteBounds.height).toBe(40);
  await expect(addFavorite).toHaveCSS("border-radius", "50%");
  const heart = addFavorite.locator("svg");
  const initialTransform = await heart.evaluate((element) => getComputedStyle(element).transform);
  await addFavorite.hover({ position: { x: 4, y: 20 } });
  if (motion === "on") {
    await expect.poll(() => heart.evaluate((element) => getComputedStyle(element).transform)).not.toBe(initialTransform);
  } else {
    await expect(heart).toHaveCSS("transform", initialTransform);
  }
  await page.mouse.move(0, 0);
  await addFavorite.click();
  await favoriteStarted;
  await expect(addFavorite).toBeDisabled();
  await expect(addFavorite).toHaveAttribute("aria-busy", "true");
  await expect(addFavorite.locator(".spinner__wheel")).toBeVisible();
  await expect(addFavorite).toHaveCSS("opacity", "1");
  const spinner = addFavorite.locator(".spinner__wheel");
  const firstRotation = await spinner.evaluate((element) => getComputedStyle(element).transform);
  if (motion === "reduced") {
    await expect(spinner).toHaveCSS("transform", "none");
  } else {
    await expect.poll(() => spinner.evaluate((element) => getComputedStyle(element).transform)).not.toBe(firstRotation);
  }

  await page.mouse.move(0, 0);
  const reveal = page.evaluate(async () => {
    const scales: number[] = [];
    const start = performance.now();
    while (performance.now() - start < 500) {
      const heart = document.querySelector(".album-date-card__favorite-heart");
      if (heart) scales.push(parseFloat(getComputedStyle(heart).scale) || 1);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    return scales;
  });
  finishFavoriteRequest();
  const removeFavorite = page.getByRole("button", { name: "Remove from favorites" });
  await expect(removeFavorite).toHaveAttribute("aria-pressed", "true");
  await expect(removeFavorite).toHaveCSS("background-color", "rgb(249, 227, 228)");
  await expect(removeFavorite.locator("svg")).toHaveCSS("color", "rgb(237, 72, 82)");
  await expect(removeFavorite.locator(".spinner__wheel")).toHaveCount(0);
  await expect(removeFavorite.locator("svg")).toHaveAttribute("fill", "currentColor");
  const scales = await reveal;
  expect(scales.length).toBeGreaterThan(0);
  expect(scales.every((scale) => scale === 1)).toBe(true);
  await expect(removeFavorite.locator("svg")).toHaveCSS("scale", "none");
  await page.screenshot({ path: test.info().outputPath(`favorite-${motion}.png`) });
  const refreshed = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/library/album/page");
  await removeFavorite.evaluate((element: HTMLButtonElement) => element.click());
  await refreshed;
  await expect(page.getByRole("button", { name: "Add to favorites" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Add to favorites" })).toBeEnabled();
});
}

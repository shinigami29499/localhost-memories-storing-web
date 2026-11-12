import { expect, test } from "@playwright/test";

for (const width of [390, 1280]) {
  for (const fromFavorites of [false, true]) {
    test(`gallery switches before media response at ${width}px from ${fromFavorites ? "favorites" : "gallery"}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(() => {
        localStorage.setItem("shinigacim-auth", JSON.stringify({
          state: {
            user: { id: "viewer", username: "viewer", role: "user", status: "active", createdAt: "" },
            accessToken: "test",
            refreshToken: "test",
          },
          version: 0,
        }));
        localStorage.setItem("shinigacim.animations-enabled", "true");
      });
      let releaseResponse!: () => void;
      const responseGate = new Promise<void>((resolve) => { releaseResponse = resolve; });
      let releaseRefresh!: () => void;
      const refreshGate = new Promise<void>((resolve) => { releaseRefresh = resolve; });
      let holdRefresh = false;
      let refreshRequests = 0;
      const source = fromFavorites ? "/gallery/favorites" : "/gallery";
      const destination = fromFavorites ? "/gallery" : "/gallery/favorites";
      const destinationApi = `/api/library${destination}`;
      let destinationRequests = 0;
      await page.route("**/hubs/**", (route) => route.abort());
      await page.route("**/api/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === destinationApi) {
          destinationRequests += 1;
          await responseGate;
        }
        if (path === `/api/library${source}` && holdRefresh) {
          refreshRequests += 1;
          await refreshGate;
        }
        await route.fulfill({
          json: path.startsWith("/api/library/gallery")
            ? { offset: 0, limit: 20, total: 0, items: [] }
            : [],
        });
      });
      try {
        await page.goto(source);
        await expect(page.getByText(fromFavorites ? "No favorites yet" : "No media yet", { exact: true })).toBeVisible();
        await page.locator(".page-action-bar").getByRole("link", { name: fromFavorites ? "Gallery" : "Favorites", exact: true }).click();
        await expect.poll(() => destinationRequests).toBe(1);
        await expect(page).toHaveURL(new RegExp(`${destination}$`));
        await expect(page.getByText("Loading media...", { exact: true })).toBeVisible();
        await expect(page.getByText(fromFavorites ? "No favorites yet" : "No media yet", { exact: true })).toBeHidden();
        releaseResponse();
        await expect(page.getByText(fromFavorites ? "No media yet" : "No favorites yet", { exact: true })).toBeVisible();
        holdRefresh = true;
        await page.locator(".page-action-bar").getByRole("link", { name: fromFavorites ? "Favorites" : "Gallery", exact: true }).click();
        await expect.poll(() => refreshRequests).toBe(1);
        await expect(page).toHaveURL(new RegExp(`${source}$`));
        await expect(page.getByText(fromFavorites ? "No favorites yet" : "No media yet", { exact: true })).toBeVisible();
        await expect(page.getByText("Loading media...", { exact: true })).toBeHidden();
      } finally {
        releaseResponse();
        releaseRefresh();
      }
    });
  }
}

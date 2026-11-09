import { expect, test } from "@playwright/test";

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`Home empty state keeps page gutters and album navigation at ${width}px`, async ({ page }) => {
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
      localStorage.setItem("shinigacim.animations-enabled", "false");
    });
    await page.route("**/hubs/**", (route) => route.abort());
    await page.route("**/api/**", (route) => route.fulfill({
      json: new URL(route.request().url()).pathname === "/api/library/album/page"
        ? { items: [], nextCursor: null, hasMore: false }
        : [],
    }));

    await page.goto("/");
    const emptyState = page.locator(".home-page .empty-state");
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText("No albums yet");
    const spacing = await emptyState.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const content = element.closest(".home-page__content")!;
      const contentBounds = content.getBoundingClientRect();
      return {
        left: bounds.left - contentBounds.left,
        right: contentBounds.right - bounds.right,
        top: bounds.top - contentBounds.top,
        overflow: content.scrollWidth - content.clientWidth,
      };
    });
    expect(spacing.left).toBeGreaterThan(0);
    expect(spacing.right).toBeGreaterThan(0);
    expect(spacing.top).toBeGreaterThan(0);
    expect(spacing.overflow).toBe(0);

    await emptyState.getByRole("link", { name: "Go to albums" }).click();
    await expect(page).toHaveURL(/\/(?:library|gallery)\/album$/);
    const albumsEmptyState = page.locator(".album-page .empty-state");
    await expect(albumsEmptyState).toBeVisible();
    if (width <= 640) {
      const bounds = await albumsEmptyState.boundingBox();
      expect(bounds!.x).toBeCloseTo(spacing.left, 0);
      expect(width - bounds!.x - bounds!.width).toBeCloseTo(spacing.right, 0);
    }
  });
}

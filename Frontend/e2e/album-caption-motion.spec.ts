import { expect, test } from "@playwright/test";

for (const width of [390, 1024]) {
  test(`caption expands without zoom at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({ state: { user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test" }, version: 0 }));
      localStorage.setItem("shinigacim.animations-enabled", "true");
    });
    await page.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/location/home-location") return route.fulfill({ json: null });
      if (path === "/api/library/album/a1") return route.fulfill({ json: { id: "a1", name: "Album", caption: "A long caption with enough words to fill several lines. ".repeat(30), isPublic: false, owner: { id: "u1", username: "viewer" }, mediaCount: 0, previewMediaId: null, createdAt: "2026-01-01T00:00:00Z" } });
      return route.fulfill({ json: { items: [], total: 0, hasMore: false } });
    });
    await page.route("**/hubs/**", (route) => route.abort());
    await page.goto("/gallery/album/a1");
    const button = page.locator(".album-hero__caption-button");
    const captionArea = page.locator(".album-hero__caption-expand");
    await expect(page.getByText("Show more")).toBeVisible();
    const initialHeight = (await captionArea.boundingBox())!.height;
    await button.hover();
    await page.mouse.down();
    await page.waitForTimeout(160);
    expect(await button.evaluate((node) => getComputedStyle(node).scale)).toBe("1");
    await page.mouse.up();
    if (width < 768) {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      expect(await dialog.evaluate((node) => getComputedStyle(node).transitionProperty)).toBe("opacity");
      expect(await dialog.evaluate((node) => getComputedStyle(node).transform)).toBe("none");
      await dialog.getByRole("button", { name: "Close" }).click();
      await expect(dialog).toHaveCount(0);
      return;
    }
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const expanded = page.locator(".album-hero__caption-expand");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    expect((await captionArea.boundingBox())!.height).toBeGreaterThanOrEqual(initialHeight - 1);
    await expect.poll(async () => (await captionArea.boundingBox())!.height).toBeGreaterThan(initialHeight + 20);
    expect(await expanded.evaluate((node) => getComputedStyle(node).transform)).toBe("none");
    await page.waitForTimeout(250);
    const fullHeight = (await captionArea.boundingBox())!.height;
    await page.locator(".album-hero__caption-button").click();
    await expect(button).toHaveAttribute("aria-expanded", "false");
    const collapseHeights = await captionArea.evaluate(async (node) => {
      const samples: number[] = [];
      const start = performance.now();
      while (performance.now() - start < 280) {
        samples.push(node.getBoundingClientRect().height);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
      return samples;
    });
    expect(collapseHeights[0]).toBeGreaterThan(fullHeight * 0.7);
    expect(collapseHeights.at(-1)).toBeCloseTo(initialHeight, 0);
    expect(collapseHeights.every((height, index) => index === 0 || height <= collapseHeights[index - 1] + 1)).toBe(true);
    await expect(page.getByText("Show more")).toBeVisible();
  });
}

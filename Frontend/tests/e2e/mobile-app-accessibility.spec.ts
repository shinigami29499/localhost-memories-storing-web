import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" },
      accessToken: "test", refreshToken: "test",
    }, version: 0 }));
  });
  await page.route(/^https?:\/\/[^/]+\/api\//, (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = path.endsWith("/page") || path.startsWith("/api/library/gallery")
      ? { items: [], total: 0, offset: 0, page: 1, limit: 30, hasMore: false }
      : path.endsWith("home-location") ? null : [];
    return route.fulfill({ json });
  });
  await page.route(/\/hubs\//, (route) => route.abort());
});

for (const width of [320, 390]) {
  test(`mobile theme persistence, focus return and overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.goto("/gallery");
    await expect(page.getByText("No media yet")).toBeVisible();
    const more = page.getByRole("button", { name: "More", exact: true });
    await more.click();
    const dialog = page.getByRole("dialog", { name: "More" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("radio", { name: "Dark" }).check();
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "dark");
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(more).toBeFocused();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "dark");
    await more.click();
    await dialog.getByRole("radio", { name: "System" }).check();
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "light");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "dark");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

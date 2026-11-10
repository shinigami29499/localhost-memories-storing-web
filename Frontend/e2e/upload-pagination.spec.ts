import { expect, test } from "@playwright/test";

for (const width of [390, 1280]) {
  test(`upload pagination matches profile and changes pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
        user: { id: "u1", username: "viewer", role: "user", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test",
      }, version: 0 }));
    });
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/users/me") return route.fulfill({ json: { id: "u1", username: "viewer", role: "user", status: "active", createdAt: "2026-01-01" } });
      if (url.pathname.endsWith("/batches")) {
        const offset = Number(url.searchParams.get("offset") ?? 0);
        return route.fulfill({ json: { totalItems: 100, items: [{ id: `batch-${offset}`, status: "Completed", username: null, canManage: true, createdAt: "2026-10-28T00:00:00Z", completedAt: null, totalFiles: 0, successfulFiles: 0, failedFiles: 0, cancelledFiles: 0, items: [] }] } });
      }
      return route.fulfill({ json: [] });
    });
    await page.route("**/hubs/**", (route) => route.abort());
    await page.goto("/profile");
    const profile = page.getByRole("navigation", { name: "Avatar pagination" });
    await expect(profile).toBeVisible({ timeout: 20_000 });
    const style = await profile.getByRole("button", { name: "Page 1", exact: true }).evaluate((element) => {
      const css = getComputedStyle(element);
      return { background: css.backgroundColor, radius: css.borderRadius, shadow: css.boxShadow };
    });
    await profile.getByRole("button", { name: "Next page" }).click();
    await expect(profile.getByRole("button", { name: "Page 2", exact: true })).toHaveAttribute("aria-current", "page");
    await page.goto("/uploads");
    const uploads = page.getByRole("navigation", { name: "upload batches pagination" });
    await expect(uploads).toBeVisible();
    const uploadStyle = await uploads.getByRole("button", { name: "Page 1", exact: true }).evaluate((element) => {
      const css = getComputedStyle(element);
      return { background: css.backgroundColor, radius: css.borderRadius, shadow: css.boxShadow };
    });
    expect(uploadStyle).toEqual(style);
    await expect(uploads.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await uploads.getByRole("button", { name: "Next page" }).click();
    await expect(uploads.getByRole("button", { name: "Page 2", exact: true })).toHaveAttribute("aria-current", "page");
    await uploads.getByRole("button", { name: "Previous page" }).click();
    await expect(uploads.getByRole("button", { name: "Page 1", exact: true })).toHaveAttribute("aria-current", "page");
  });
}

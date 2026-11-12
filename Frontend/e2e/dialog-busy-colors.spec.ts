import { expect, test } from "@playwright/test";

for (const [action, width] of [["Change role for", 390], ["Block", 1280]] as const) {
  test(`dialog buttons keep their colors while ${action.toLowerCase()} is pending`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
        user: { id: "admin", username: "admin", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test",
      }, version: 0 }));
      localStorage.setItem("shinigacim.animations-enabled", "false");
    });

    const user = { id: "u1", username: "xim", role: "user", status: "active", createdAt: "2026-01-01" };
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/users/u1/role" || path === "/api/users/u1/disable") {
        await pending;
        return route.fulfill({ json: user });
      }
      if (path === "/api/users/page") return route.fulfill({ json: { page: 1, limit: 30, total: 1, items: [user] } });
      return route.fulfill({ json: [] });
    });
    await page.route("**/hubs/**", (route) => route.abort());
    await page.goto("/users");
    await page.getByRole("button", { name: `${action} xim`, exact: true }).click();
    const dialog = page.getByRole("alertdialog");
    const buttons = dialog.locator(".dialog-actions > button");
    await expect(buttons).toHaveCount(2);
    const colors = () => buttons.evaluateAll((elements) => elements.map((element) => {
      const style = getComputedStyle(element);
      return [style.backgroundColor, style.color, style.borderColor, style.opacity];
    }));
    const before = await colors();
    await dialog.getByRole("button", { name: `${action} xim`, exact: true }).click();
    await expect(buttons.nth(0)).toBeDisabled();
    await expect(buttons.nth(1)).toHaveAttribute("aria-busy", "true");
    expect(await colors()).toEqual(before);
    release();
    await expect(dialog).toHaveCount(0);
  });
}

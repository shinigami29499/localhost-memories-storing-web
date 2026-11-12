import { expect, test } from "@playwright/test";

for (const width of [768, 1440]) {
  test(`header filters use shared nested controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem("shinigacim.animations-enabled", "true");
      localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
        user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" },
        accessToken: "test", refreshToken: "test",
      }, version: 0 }));
    });
    await page.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      return route.fulfill({ json: path.endsWith("/page")
        ? { page: 1, offset: 0, total: 0, limit: 30, items: [], allCount: 0, pendingCount: 0, hasMore: false }
        : [] });
    });
    await page.route("**/hubs/**", (route) => route.abort());
    await page.goto("/users");
    const trigger = page.getByRole("button", { name: "Filters", exact: true });
    await trigger.click();
    const popup = page.locator(".header-filters__popup");
    await expect(popup.getByRole("heading", { name: "Filters" })).toBeVisible();
    await expect(popup).toHaveCSS("background-color", "rgb(244, 243, 238)");
    expect((await popup.boundingBox())!.width).toBeLessThanOrEqual(340);
    for (const action of await popup.locator(".dialog-action").all()) {
      await expect(action).toHaveCSS("white-space", "nowrap");
      expect(await action.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
    await expect(popup.getByRole("button", { name: "Clear filters" })).toHaveCSS("background-color", "rgb(255, 235, 237)");
    const role = popup.getByRole("combobox", { name: "Role" });
    const field = popup.locator(".select-field");
    const chevron = role.locator("svg path");
    await field.locator(".select-field__label").hover();
    await expect(role).toHaveCSS("background-color", "rgb(244, 243, 238)");
    await expect.poll(() => chevron.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
    await role.hover();
    await expect(role).toHaveCSS("background-color", "rgb(248, 228, 190)");
    await expect.poll(() => chevron.evaluate((element) => getComputedStyle(element).transform)).not.toBe("none");
    await field.hover({ position: { x: 2, y: 2 } });
    await expect(role).toHaveCSS("background-color", "rgb(244, 243, 238)");
    await expect.poll(() => chevron.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
    await role.click();
    const dropdown = page.locator(".select-field__popup");
    await expect(dropdown).toBeVisible();
    await expect.poll(async () => {
      const triggerBounds = (await role.boundingBox())!;
      const dropdownBounds = (await dropdown.boundingBox())!;
      return dropdownBounds.y - triggerBounds.y - triggerBounds.height;
    }).toBeGreaterThanOrEqual(3);
    await page.getByRole("option", { name: "admin", exact: true }).click();
    await expect(role).toHaveText("admin");
    await expect(popup).toBeVisible();
    await popup.getByRole("button", { name: "From", exact: true }).click();
    const calendar = page.locator(".date-picker__popup");
    await expect(calendar).toBeVisible();
    await expect(calendar).toHaveCSS("background-color", "rgb(106, 63, 54)");
    expect((await calendar.boundingBox())!.width).toBeLessThanOrEqual(252);
    const todayButton = calendar.locator('[aria-current="date"]');
    await todayButton.hover();
    await expect(todayButton).toHaveCSS("background-color", "rgb(248, 228, 190)");
    await expect(todayButton).toHaveCSS("border-top-color", "rgb(244, 243, 238)");
    const today = await calendar.locator('[aria-current="date"]').getAttribute("data-date");
    await calendar.locator('[aria-current="date"]').click();
    await expect(calendar).toBeHidden();
    await expect(popup).toBeVisible();
    await popup.getByRole("button", { name: "To", exact: true }).click();
    await expect(calendar.locator(`button[data-date="${today}"]`)).toBeEnabled();
    const previousDay = await calendar.locator(`button[data-date="${today}"]`).evaluate((element) => {
      const buttons = [...element.parentElement!.querySelectorAll<HTMLButtonElement>("[data-date]")];
      return buttons[buttons.findIndex((button) => button === element) - 1]?.dataset.date;
    });
    if (previousDay) await expect(calendar.locator(`button[data-date="${previousDay}"]`)).toBeDisabled();
    await calendar.locator(`button[data-date="${today}"]`).click();
    await expect(calendar).toBeHidden();
    await popup.getByRole("button", { name: /^From:/ }).click();
    const selectedDay = calendar.locator(`button[data-date="${today}"]`);
    await page.mouse.move(0, 0);
    await expect(selectedDay).toHaveCSS("background-color", "rgb(244, 243, 238)");
    await expect(selectedDay).toHaveCSS("border-top-color", "rgb(244, 243, 238)");
    const nextDay = await calendar.locator(`button[data-date="${today}"]`).evaluate((element) => {
      const buttons = [...element.parentElement!.querySelectorAll<HTMLButtonElement>("[data-date]")];
      return buttons[buttons.findIndex((button) => button === element) + 1]?.dataset.date;
    });
    if (nextDay) await expect(calendar.locator(`button[data-date="${nextDay}"]`)).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(calendar).toBeHidden();
    await expect(popup).toBeVisible();
    await popup.getByRole("button", { name: "Apply filters" }).click();
    await expect(popup).toBeHidden();
    await page.locator(".header-filters__trigger").click();
    await expect(role).toHaveText("admin");
    await expect(popup.getByRole("button", { name: /^From:/ })).toBeVisible();
    await popup.getByRole("button", { name: "Clear filters" }).click();
    await expect(role).toHaveText("All");
    await expect(popup.getByRole("button", { name: "From", exact: true })).toBeVisible();
    const bounds = await popup.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await popup.getByRole("button", { name: "Close", exact: true }).click();
    await expect(popup).toBeHidden();
    await expect(page.locator(".header-filters__trigger")).toBeFocused();
  });
}

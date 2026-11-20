import { expect, test } from "@playwright/test";

test("inline user search and separate role, status, and date filters", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date("2026-06-15T12:00:00"));
  await page.addInitScript(() => localStorage.setItem("shinigacim-auth", JSON.stringify({ state: { user: { id: "admin", username: "admin", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test" }, version: 0 })));
  const users = [
    { id: "a", username: "Alice", createdAt: "2026-01-01", role: "admin", status: "active" },
    { id: "b", username: "Alina", createdAt: "2026-06-01", role: "user", status: "pending_approval" },
    { id: "c", username: "Bob", createdAt: "2026-08-01", role: "user", status: "disabled" },
    { id: "d", username: "Alison", createdAt: "2026-06-01", role: "user", status: "rejected" },
  ].map((user) => ({ ...user, lastSeenAt: null }));
  await page.route(/^https?:\/\/[^/]+\/api\//, route => route.fulfill({ json: new URL(route.request().url()).pathname === "/api/users" ? users : [] }));
  await page.route("**/hubs/**", route => route.abort());
  await page.goto("/users");
  const rows = page.locator(".mobile-users__item");
  await expect(rows).toHaveCount(3);
  await page.setViewportSize({ width: 390, height: 420 });
  const scroller = page.locator(".mobile-users__content");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  const [scrollerBox, navigationBox] = await Promise.all([scroller.boundingBox(), navigation.boundingBox()]);
  expect(scrollerBox!.y + scrollerBox!.height).toBeGreaterThan(navigationBox!.y + navigationBox!.height);
  await scroller.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  const lastRow = await rows.last().boundingBox();
  expect(lastRow!.y + lastRow!.height).toBeLessThan(navigationBox!.y);
  await page.setViewportSize({ width: 390, height: 844 });
  await scroller.evaluate((element) => { element.scrollTop = 0; });
  const input = page.getByRole("searchbox", { name: "Search users" });
  const back = page.getByRole("button", { name: "Back", exact: true });
  const title = page.getByRole("heading", { name: "User", exact: true });
  const search = page.getByRole("search");
  const trigger = search.getByRole("button", { name: "Filters" });
  const [backBox, titleBox, searchBox, filterBox] = await Promise.all([back.boundingBox(), title.boundingBox(), search.boundingBox(), trigger.boundingBox()]);
  expect(backBox!.x + backBox!.width).toBeLessThan(titleBox!.x);
  expect(backBox!.y + backBox!.height / 2).toBe(titleBox!.y + titleBox!.height / 2);
  expect(backBox!.y + backBox!.height).toBeLessThan(searchBox!.y);
  expect(filterBox!.x + filterBox!.width).toBeLessThan(searchBox!.x + searchBox!.width);
  expect(filterBox!.y + filterBox!.height / 2).toBe(searchBox!.y + searchBox!.height / 2);
  await expect(page.getByRole("button", { name: "Add user" })).toHaveCount(0);
  expect(await page.locator(".mobile-users").evaluate((element) => {
    const style = getComputedStyle(element, "::after");
    return { height: style.height, pointerEvents: style.pointerEvents };
  })).toEqual({ height: "24px", pointerEvents: "none" });
  for (const name of ["Approve Alina", "Reject Alina", "Resume Bob", "Delete Bob"]) {
    const action = page.getByRole("button", { name, exact: true });
    await expect(action).toHaveCSS("height", "40px");
    await expect(action).toHaveCSS("border-top-width", "0px");
    await expect(action).toHaveCSS("box-shadow", "none");
  }
  for (const name of ["Reject Alina", "Delete Bob"]) {
    const action = page.getByRole("button", { name });
    await action.hover();
    await expect(action).toHaveCSS("--user-action-surface", "#ebaaa2");
    await page.mouse.down();
    await expect(action).toHaveCSS("--user-action-surface", /oklch\(/);
    await page.mouse.move(0, 0);
    await page.mouse.up();
  }
  await rows.first().getByRole("button", { name: "Alice", exact: true }).last().click();
  const profile = page.getByRole("dialog", { name: "Alice" });
  const profileClose = profile.getByRole("button", { name: "Close" });
  const closeBackground = await profileClose.evaluate((element) => getComputedStyle(element).backgroundColor);
  const closeColor = await profileClose.evaluate((element) => getComputedStyle(element).color);
  await profileClose.hover();
  await expect(profileClose).toHaveCSS("background-color", closeBackground);
  await expect(profileClose).toHaveCSS("color", closeColor);
  await profileClose.click();
  await expect(profile).not.toBeVisible();
  await input.click();
  await expect(input).toBeFocused();
  await input.fill("Al");
  await expect(rows).toHaveCount(3);
  await input.fill("Ali");
  await expect(rows).toHaveCount(2);
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Filters" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close" })).toHaveCount(0);
  expect(await dialog.getByRole("heading", { name: "User", exact: true }).boundingBox()).toEqual(titleBox);
  expect(await dialog.evaluate((element) => getComputedStyle(element, "::backdrop").backdropFilter)).toBe("blur(12px)");
  await dialog.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/users$/);
  await expect(trigger).toBeFocused();
  await trigger.click();
  const userTile = dialog.getByRole("group", { name: "Role" }).locator("label").filter({ hasText: /^User$/ });
  await expect(userTile).toHaveCSS("box-shadow", /0px 5px 12px 0px inset/);
  const insetShadow = await userTile.evaluate((tile) => getComputedStyle(tile).boxShadow);
  await userTile.click();
  await expect(userTile).not.toHaveCSS("box-shadow", insetShadow);
  await dialog.getByText("Status", { exact: true }).click();
  await expect(dialog.getByRole("checkbox", { name: "Rejected" })).toHaveCount(0);
  await dialog.getByText("Pending", { exact: true }).click();
  await dialog.getByText("Joined date", { exact: true }).click();
  await dialog.getByRole("button", { name: /June 1st, 2026/ }).click();
  await dialog.getByRole("button", { name: "Search", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Alina");
  await trigger.click();
  await dialog.getByRole("button", { name: "Clear all" }).click();
  await expect(dialog.getByRole("checkbox", { name: "User" })).not.toBeChecked();
  await dialog.getByText("Status", { exact: true }).click();
  await expect(dialog.getByRole("checkbox", { name: "Pending" })).not.toBeChecked();
  await dialog.getByRole("button", { name: "Search", exact: true }).click();
  await expect(rows).toHaveCount(2);
  await back.click();
  await expect(page).toHaveURL(/\/$/);
});

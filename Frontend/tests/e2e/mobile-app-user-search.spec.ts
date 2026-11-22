import { expect, test, type Locator, type WebSocketRoute } from "@playwright/test";

const readFill = (control: Locator) => control.evaluate((element) => getComputedStyle(element).backgroundColor);
const expectFillBorder = async (control: Locator) => {
  await expect(control).toHaveCSS("border-top-color", await readFill(control));
};

test("inline user search and separate role, status, and date filters", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.clock.setFixedTime(new Date("2026-06-15T12:00:00"));
  await page.addInitScript(() => localStorage.setItem("shinigacim-auth", JSON.stringify({ state: { user: { id: "admin", username: "admin", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test" }, version: 0 })));
  const users = [
    { id: "a", username: "Alice", createdAt: "2026-01-01", role: "admin", status: "active" },
    { id: "b", username: "Alina", createdAt: "2026-06-01", role: "user", status: "pending_approval" },
    { id: "c", username: "Bob", createdAt: "2026-08-01", role: "user", status: "disabled" },
    { id: "d", username: "Alison", createdAt: "2026-06-01", role: "user", status: "rejected" },
  ].map((user) => ({ ...user, lastSeenAt: null }));
  await page.route(/^https?:\/\/[^/]+\/api\//, route => route.fulfill({ json: new URL(route.request().url()).pathname === "/api/user" ? users : [] }));
  await page.route("**/hubs/**", route => route.abort());
  await page.goto("/users?source=bookmark#directory");
  await expect(page).toHaveURL(/\/user\?source=bookmark#directory$/);
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
  const [titleBox, searchBox, filterBox] = await Promise.all([title.boundingBox(), search.boundingBox(), trigger.boundingBox()]);
  await expect(back).toHaveCount(0);
  expect(titleBox!.y + titleBox!.height).toBeLessThan(searchBox!.y);
  expect(filterBox!.x + filterBox!.width).toBeLessThan(searchBox!.x + searchBox!.width);
  expect(filterBox!.y + filterBox!.height / 2).toBe(searchBox!.y + searchBox!.height / 2);
  const elevatedFill = "rgb(48, 48, 48)";
  await expect(search).toHaveCSS("background-color", elevatedFill);
  await expect(search).toHaveCSS("box-shadow", /rgba\(0, 0, 0, 0\.12\).*rgba\(0, 0, 0, 0\.24\)/);
  await expectFillBorder(search);
  await search.hover();
  await expect(search).not.toHaveCSS("border-top-color", await readFill(search));
  await page.mouse.move(0, 0);
  await expectFillBorder(search);
  await expect(page.getByRole("button", { name: "Add user" })).toHaveCount(0);
  expect(await page.locator(".mobile-users").evaluate((element) => {
    const style = getComputedStyle(element, "::after");
    return { height: style.height, pointerEvents: style.pointerEvents };
  })).toEqual({ height: "24px", pointerEvents: "none" });
  for (const [username, actionNames] of [["Alina", ["Approve Alina", "Reject Alina"]], ["Bob", ["Resume Bob", "Delete Bob"]]] as const) {
    const row = rows.filter({ hasText: username });
    await expect(row.getByRole("button")).toHaveCount(2);
    await row.getByRole("button", { name: username, exact: true }).last().click();
    const details = page.getByRole("dialog", { name: username });
    for (const name of actionNames) {
      await expect(details.getByRole("button", { name, exact: true })).toHaveCSS("height", "40px");
    }
    const destructiveAction = actionNames[1];
    await details.getByRole("button", { name: destructiveAction, exact: true }).click();
    const confirmation = details.getByRole("alertdialog", { name: destructiveAction + "?" });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(confirmation).not.toBeVisible();
    await details.getByRole("button", { name: "Close", exact: true }).click();
    await expect(details).not.toBeVisible();
  }
  await rows.first().getByRole("button", { name: "Alice", exact: true }).last().click();
  const profile = page.getByRole("dialog", { name: "Alice" });
  await expect(profile).toHaveCSS("background-color", elevatedFill);
  const profileClose = profile.getByRole("button", { name: "Close" });
  const closeBackground = await profileClose.evaluate((element) => getComputedStyle(element).backgroundColor);
  const closeColor = await profileClose.evaluate((element) => getComputedStyle(element).color);
  await profileClose.hover();
  await expect(profileClose).toHaveCSS("background-color", closeBackground);
  await expect(profileClose).toHaveCSS("color", closeColor);
  await page.mouse.down();
  await expect(profileClose).toHaveCSS("background-color", closeBackground);
  await expect(profileClose).toHaveCSS("color", closeColor);
  await page.mouse.up();
  await expect(profile).not.toBeVisible();
  await input.click();
  await expect(input).toBeFocused();
  await expect(search).toHaveCSS("background-color", elevatedFill);
  await expect(search).toHaveCSS("border-top-color", "rgb(245, 245, 245)");
  await expect(search).toHaveCSS("box-shadow", /inset/);
  await expect(search).toHaveCSS("box-shadow", /rgba\(0, 0, 0, 0\.24\).*rgba\(255, 255, 255, 0\.12\)/);
  await input.fill("Al");
  await expect(rows).toHaveCount(3);
  await input.fill("Ali");
  await expect(rows).toHaveCount(2);
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Filters" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close" })).toHaveCount(0);
  const dialogTitle = (await dialog.getByRole("heading", { name: "User", exact: true }).boundingBox())!;
  expect(dialogTitle.y).toBe(titleBox!.y);
  expect(dialogTitle.x).toBeGreaterThan(titleBox!.x);
  const panels = dialog.locator(".mobile-user-search__content > details");
  await page.mouse.move(0, 0);
  for (const panel of await panels.all()) {
    await expect(panel).toHaveCSS("background-color", elevatedFill);
    await expectFillBorder(panel);
  }
  await panels.first().locator("summary").hover();
  await expect(panels.first()).not.toHaveCSS("border-top-color", await readFill(panels.first()));
  expect(await dialog.evaluate((element) => getComputedStyle(element, "::backdrop").backdropFilter)).toBe("blur(12px)");
  await dialog.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/user$/);
  await expect(trigger).toBeFocused();
  await expectFillBorder(search);
  await trigger.click();
  const userTile = dialog.getByRole("group", { name: "Role" }).locator("label").filter({ hasText: /^User$/ });
  await expect(userTile).toHaveCSS("background-color", "rgb(28, 28, 28)");
  await expect(userTile).not.toHaveCSS("border-top-color", await readFill(userTile));
  await expect(userTile).toHaveCSS("box-shadow", /0px 5px 12px 0px inset/);
  const insetShadow = await userTile.evaluate((tile) => getComputedStyle(tile).boxShadow);
  await userTile.click();
  await expect(rows).toHaveCount(2);
  await expect(userTile).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(userTile).toHaveCSS("color", "rgb(28, 28, 28)");
  await expect(userTile).not.toHaveCSS("box-shadow", insetShadow);
  await expect(userTile).not.toHaveCSS("border-top-color", "rgb(255, 255, 255)");
  await page.mouse.move(0, 0);
  await expectFillBorder(userTile);
  await dialog.getByText("Status", { exact: true }).click();
  await expect(dialog.getByRole("checkbox", { name: "Rejected" })).toHaveCount(0);
  const pendingDot = dialog.locator(".mobile-user-search__status-dot--pending");
  await expect(pendingDot).toHaveCSS("background-color", "rgb(255, 177, 36)");
  await dialog.getByText("Pending", { exact: true }).click();
  await expect(pendingDot).toHaveCSS("background-color", "rgb(246, 162, 26)");
  await dialog.getByText("Joined date", { exact: true }).click();
  const year = dialog.locator(".range-picker__selectors .select-field__trigger").first();
  await expect(year).toHaveCSS("background-color", elevatedFill);
  await expect(year).not.toHaveCSS("border-top-color", await readFill(year));
  await year.click();
  await page.mouse.move(0, 0);
  await expect(year).toHaveCSS("background-color", elevatedFill);
  await expect(dialog.locator(".select-field__popup")).toHaveCSS("background-color", elevatedFill);
  await expectFillBorder(year);
  await expectFillBorder(dialog.locator(".select-field__popup"));
  await dialog.getByRole("option", { name: "2026", exact: true }).click();
  await dialog.getByRole("button", { name: /June 1st, 2026/ }).click();
  await expect(rows).toHaveCount(2);
  await dialog.getByRole("button", { name: "Search", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Alina");
  await trigger.click();
  await expect(dialog.getByRole("checkbox", { name: "User" })).toBeChecked();
  await dialog.getByRole("button", { name: "Clear all" }).click();
  await expect(rows).toHaveCount(1);
  await expect(dialog.getByRole("checkbox", { name: "User" })).not.toBeChecked();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(rows).toHaveCount(1);
  await trigger.click();
  await expect(dialog.getByRole("checkbox", { name: "User" })).toBeChecked();
  await dialog.getByText("Status", { exact: true }).click();
  await expect(dialog.getByRole("checkbox", { name: "Pending" })).toBeChecked();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(userTile).toHaveCSS("background-color", "rgb(34, 34, 34)");
  await expect(userTile).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(pendingDot).toHaveCSS("background-color", "rgb(255, 177, 36)");
  await dialog.getByRole("button", { name: "Clear all" }).click();
  await expect(dialog.getByRole("checkbox", { name: "Pending" })).not.toBeChecked();
  await expect(pendingDot).toHaveCSS("background-color", "rgb(246, 162, 26)");
  await dialog.getByRole("button", { name: "Search", exact: true }).click();
  await expect(rows).toHaveCount(2);
  await navigation.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("dismisses filters from blank space while leaving the side gutters and calendar scrollable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("shinigacim-auth", JSON.stringify({
    state: {
      user: { id: "admin", username: "admin", role: "admin", status: "active", createdAt: "2026-01-01" },
      accessToken: "test",
      refreshToken: "test",
    },
    version: 0,
  })));
  await page.route(/^https?:\/\/[^/]+\/api\//, route => route.fulfill({ json: [] }));
  await page.route("**/hubs/**", route => route.abort());
  await page.goto("/user");

  const trigger = page.getByRole("button", { name: "Filters" });
  const dialog = page.getByRole("dialog", { name: "Filters" });
  const blank = dialog.locator(".mobile-user-search__dismiss-area");
  await trigger.click();
  await dialog.getByText("S-Admin", { exact: true }).click();
  const area = (await blank.boundingBox())!;
  const centerX = Math.round(area.x + area.width / 2);
  const centerY = Math.round(area.y + area.height / 2);
  await page.mouse.click(area.x - 4, centerY);
  await page.mouse.click(area.x + area.width + 4, centerY);
  await expect(dialog).toBeVisible();
  await page.mouse.click(centerX, centerY);
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog.getByRole("checkbox", { name: "S-Admin" })).not.toBeChecked();
  const touch = await page.context().newCDPSession(page);
  await touch.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  async function gesture(x: number, y: number, distance: number) {
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    if (distance) {
      await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + distance / 2 }] });
      await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + distance }] });
    }
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  }

  await gesture(area.x - 4, centerY, -72);
  await gesture(centerX, centerY, 72);
  await expect(dialog).toBeVisible();
  await gesture(centerX, centerY, -72);
  await expect(dialog).toBeHidden();
  await trigger.click();
  await gesture(centerX, centerY, 0);
  await expect(dialog).toBeHidden();

  await page.setViewportSize({ width: 390, height: 440 });
  await trigger.click();
  await dialog.getByText("Joined date", { exact: true }).click();
  const scroll = dialog.locator(".mobile-user-search__content");
  const scrollBox = (await scroll.boundingBox())!;
  await gesture(centerX, Math.round(scrollBox.y + scrollBox.height - 24), -96);
  await expect.poll(() => scroll.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await expect(dialog).toBeVisible();
});

test("updates a user's online dot from SignalR without reloading the directory", async ({ page }) => {
  const now = new Date("2026-06-15T12:00:00Z");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(now);
  await page.addInitScript(() => localStorage.setItem("shinigacim-auth", JSON.stringify({
    state: { user: { id: "viewer", username: "Viewer", role: "user", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test" },
    version: 0,
  })));
  await page.route(/^https?:\/\/[^/]+\/api\//, route => route.fulfill({
    json: new URL(route.request().url()).pathname === "/api/user"
      ? [{ id: "alice", username: "Alice", role: "user", status: "active", createdAt: "2026-01-01", lastSeenAt: null }]
      : {},
  }));
  await page.route("**/hubs/notifications/negotiate?*", route => route.fulfill({
    json: { negotiateVersion: 1, connectionId: "test", connectionToken: "test", availableTransports: [
      { transport: "WebSockets", transferFormats: ["Text"] },
    ] },
  }));
  const frame = (message: object) => JSON.stringify(message) + "\u001e";
  let socket: WebSocketRoute | undefined;
  await page.routeWebSocket(/\/hubs\/notifications(?:\?|$)/, route => {
    route.onMessage((message) => {
      for (const payload of String(message).split("\u001e").filter(Boolean)) {
        const invocation = JSON.parse(payload);
        if (invocation.protocol === "json") route.send(frame({}));
        if (invocation.target === "TrackActivity") {
          route.send(frame({ type: 3, invocationId: invocation.invocationId }));
          socket = route;
        }
      }
    });
  });
  await page.goto("/user");
  const alice = page.getByRole("listitem").filter({ hasText: "Alice" });
  const dot = alice.getByRole("img", { name: "Online" });
  await expect(alice).toBeVisible();
  await expect(dot).toHaveCount(0);
  await expect.poll(() => Boolean(socket)).toBe(true);

  const sendPresence = (online: boolean, seconds: number) => socket!.send(frame({
    type: 1,
    target: "UserPresenceChanged",
    arguments: [{ userId: "alice", username: "Alice", online, lastSeenAt: new Date(now.getTime() + seconds * 1000).toISOString() }],
  }));
  sendPresence(true, 1);
  await expect(dot).toBeVisible();
  sendPresence(false, 2);
  await expect(dot).toHaveCount(0);
  sendPresence(true, 3);
  await expect(dot).toBeVisible();
});

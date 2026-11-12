import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("shinigacim-auth")) return;
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "admin", username: "admin", role: "admin", status: "active", createdAt: "2026-01-01" },
      accessToken: "test", refreshToken: "test",
    }, version: 0 }));
  });
  const users = [
    { id: "active", username: "member-with-a-very-long-username", status: "active" },
    { id: "pending", username: "pending", status: "pending_approval" },
    { id: "blocked", username: "blocked", status: "disabled" },
    { id: "admin", username: "admin", status: "active", role: "admin" },
  ].map((user) => ({
    role: "user", ...user, createdAt: "2026-01-01T00:00:00Z", lastSeenAt: new Date().toISOString(),
  }));
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/users/page") return route.fulfill({ json: { items: users, page: 1, limit: 30, total: users.length } });
    if (path === "/api/users") return route.fulfill({ json: users });
    return route.fulfill({ json: {} });
  });
  await page.route("**/hubs/**", (route) => route.abort());
});

test("mobile users keep actions inline without expanding or exposing dates", async ({ page }) => {
  await page.goto("/users");
  const rows = page.locator(".admin-users__table tbody tr");
  await expect(rows).toHaveCount(4);
  for (const width of [320, 390, 640, 767]) {
    await page.setViewportSize({ width, height: 844 });
    for (const row of await rows.all()) {
      const identity = row.locator(".admin-users__identity");
      await expect(identity).toBeVisible();
      await expect(row.locator("td").nth(3)).toBeHidden();
      await expect(row.locator("td").nth(4)).toBeHidden();
      const before = await row.boundingBox();
      await identity.click();
      await expect(row).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(row).toHaveCSS("transform", "none");
      await expect(row).not.toHaveClass(/expanded/);
      await expect(row.locator("td").nth(3)).toBeHidden();
      await expect(row.locator("td").nth(4)).toBeHidden();
      expect((await row.boundingBox())!.height).toBe(before!.height);
      for (const button of await row.locator("button").all()) {
        await expect(button).toBeVisible();
        await button.focus();
        await expect(row).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
        if (!(await button.getAttribute("class"))?.includes("btn--danger-solid")) {
          await expect(button).toHaveCSS("border-top-width", "1px");
          await expect(button).toHaveCSS("border-top-style", "solid");
        }
        const box = (await button.boundingBox())!;
        expect(box.y).toBeGreaterThanOrEqual(before!.y);
        expect(box.y + box.height).toBeLessThanOrEqual(before!.y + before!.height);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
    }
    await expect.poll(() => rows.evaluateAll((elements) => elements.every((element) => {
      const box = element.getBoundingClientRect();
      return box.left >= 0 && box.right <= window.innerWidth;
    }))).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await rows.first().getByRole("button", { name: "Block member-with-a-very-long-username", exact: true }).click();
  await expect(page.getByRole("alertdialog", { name: "Block member-with-a-very-long-username?" })).toBeVisible();
});

test("desktop users retain dates and inline controls", async ({ page }) => {
  await page.goto("/users");
  const row = page.locator(".admin-users__table tbody tr").first();
  for (const width of [768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(row.locator("td").nth(3)).toBeVisible();
    await expect(row.locator("td").nth(4)).toBeVisible();
    await expect(row.getByRole("button", { name: "Delete member-with-a-very-long-username" })).toBeVisible();
    await expect(row.locator(".admin-users__identity")).toBeVisible();
  }
});

test("mobile non-admin users have no moderation actions or expansion", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "viewer", username: "viewer", role: "user", status: "active", createdAt: "2026-01-01" },
      accessToken: "test", refreshToken: "test",
    }, version: 0 }));
  });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/users");
  const rows = page.locator(".admin-users__table tbody tr");
  await expect(rows).toHaveCount(4);
  await expect(rows.locator("button")).toHaveCount(0);
  await rows.first().locator(".admin-users__identity").click();
  await expect(rows.first().locator("td").nth(3)).toBeHidden();
  await expect(rows.first().locator("td").nth(4)).toBeHidden();
  await expect.poll(() => rows.evaluateAll((elements) => elements.every((element) => {
    const box = element.getBoundingClientRect();
    return box.left >= 0 && box.right <= window.innerWidth;
  }))).toBe(true);
});

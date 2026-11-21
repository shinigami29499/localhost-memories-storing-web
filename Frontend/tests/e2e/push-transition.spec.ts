import { expect, test } from "@playwright/test";

async function setup(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: { user: { id: "me", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test" }, version: 0 }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
  });
  await page.route(/^https?:\/\/[^/]+\/api\//, (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/users/page") {
      const pending = url.searchParams.get("pendingOnly") === "true";
      return route.fulfill({ json: { page: 1, limit: 30, total: 1, allCount: 1, pendingCount: 1, items: [{ id: pending ? "pending" : "active", username: pending ? "Pending Person" : "Active Person", role: "user", status: pending ? "pending_approval" : "active", createdAt: "2026-01-01" }] } });
    }
    return route.fulfill({ json: [] });
  });
  await page.route("**/hubs/**", (route) => route.abort());
}

test("highlight push starts with old data and leaves controls stationary", async ({ page }) => {
  await setup(page);
  await page.goto("/users");
  await expect(page.getByText("Active Person").first()).toBeVisible();
  const toolbar = page.locator(".admin-users__toolbar");
  const actionBar = page.locator(".page-action-bar");
  const before = await Promise.all([toolbar.boundingBox(), actionBar.boundingBox()]);
  await page.getByRole("tab", { name: "Pending" }).click();
  const exit = page.locator('[data-push-transition="exit"]');
  await expect(exit).toHaveCount(1);
  await expect(exit).toContainText("Active Person");
  await expect(exit).not.toContainText("Pending Person");
  await expect(page.locator("#main-content .admin-users__table").first()).toContainText("Pending Person");
  const during = await Promise.all([toolbar.boundingBox(), actionBar.boundingBox()]);
  expect(Math.abs(before[0]!.x - during[0]!.x)).toBeLessThan(1);
  expect(Math.abs(before[1]!.x - during[1]!.x)).toBeLessThan(1);
  await expect(exit).toHaveCount(0);
});

test("page push captures outgoing page and cleans up after rapid swaps", async ({ page }) => {
  await setup(page);
  await page.goto("/users");
  await expect(page.getByText("Active Person").first()).toBeVisible();
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      if (this.id === "main-content" && Array.isArray(args[0])
        && args[0].some((frame) => frame.transform === "translateX(100%)")) {
        this.setAttribute("data-test-push-started", "true");
      }
      return original.apply(this, args);
    };
  });
  await page.getByRole("link", { name: "Gallery" }).click();
  const exit = page.locator('[data-push-transition="exit"]');
  await expect(exit).toHaveCount(1);
  await expect(exit).toContainText("Active Person");
  await expect(exit).not.toContainText("No albums yet");
  await expect(page.locator("#main-content")).toHaveAttribute("data-test-push-started", "true");
  await page.getByRole("link", { name: "Users", exact: true }).click();
  await expect(exit).toHaveCount(1);
  await expect(exit).toHaveCount(0);
});

test("reduced motion avoids push snapshots", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setup(page);
  await page.goto("/users");
  await expect(page.getByText("Active Person").first()).toBeVisible();
  await page.getByRole("tab", { name: "Pending" }).click();
  await expect(page.getByText("Pending Person").first()).toBeVisible();
  await expect(page.locator('[data-push-transition="exit"]')).toHaveCount(0);
});


test("page push includes the highlight when the next page has none", async ({ page }) => {
  await setup(page);
  await page.goto("/users");
  await expect(page.getByText("Active Person").first()).toBeVisible();
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      if (this.id === "main-content") {
        (window as Window & { oldBar?: boolean }).oldBar = !!document.querySelector('[data-push-transition="exit"] .navigation-highlight-bar');
      }
      return original.apply(this, args);
    };
  });
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { oldBar?: boolean }).oldBar)).toBe(true);
});

test("page changes swap the header without changing its accessible name", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await setup(page);
  await page.goto("/users");
  await expect(page.getByRole("heading", { name: "Users", exact: true })).toBeVisible();
  await expect(page.getByText("Active Person").first()).toBeVisible();
  await page.getByRole("link", { name: "Gallery", exact: true }).click();
  const header = page.locator(".app-topbar__title");
  await expect(header.locator('[data-slot="swapping-text-in"]').first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gallery", exact: true })).toBeAttached();
  expect(errors.filter((message) => message.includes("flushSync"))).toEqual([]);
});

test("reduced motion leaves header and highlight text static", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setup(page);
  await page.goto("/users");
  await expect(page.getByText("Active Person").first()).toBeVisible();
  await page.getByRole("link", { name: "Gallery", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gallery", exact: true })).toBeVisible();
  await expect(page.locator('[data-slot="swapping-text-in"]')).toHaveCount(0);
});

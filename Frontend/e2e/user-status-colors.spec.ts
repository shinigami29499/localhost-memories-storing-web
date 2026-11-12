import { expect, test } from "@playwright/test";

test("user status dots distinguish blocked, pending, offline, and online", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "admin", username: "admin", role: "admin", status: "active", createdAt: "2026-01-01" },
      accessToken: "test", refreshToken: "test",
    }, version: 0 }));
  });
  const users = [
    { id: "blocked", username: "blocked", status: "disabled", lastSeenAt: new Date().toISOString() },
    { id: "pending", username: "pending", status: "pending_approval", lastSeenAt: new Date().toISOString() },
    { id: "offline", username: "offline", status: "active", lastSeenAt: null },
    { id: "online", username: "online", status: "active", lastSeenAt: new Date().toISOString() },
  ].map((user) => ({ ...user, role: "user", createdAt: "2026-01-01T00:00:00Z" }));
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/users/page") return route.fulfill({ json: { items: users, page: 1, limit: 30, total: users.length } });
    if (path === "/api/users") return route.fulfill({ json: users });
    return route.fulfill({ json: {} });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.goto("/users");
  for (const [label, color] of [
    ["Blocked", "rgb(219, 43, 11)"],
    ["Pending approval", "rgb(198, 93, 0)"],
    ["Offline", "rgb(107, 114, 128)"],
    ["Online", "rgb(47, 132, 42)"],
  ]) {
    const dot = page.locator(`.user-presence[aria-label="${label}"] > span`);
    await expect(dot).toBeVisible();
    await expect(dot).toHaveCSS("background-color", color);
  }
});

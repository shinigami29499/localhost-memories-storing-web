import { expect, test } from "@playwright/test";

test("mobile transition keeps the chevron and selected text size while a page loads", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test",
    }, version: 0 }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
  });
  await page.route("**/api/**", (route) => route.fulfill({ json: { page: 1, offset: 0, limit: 30, total: 0, items: [], hasMore: false } }));
  await page.route("**/hubs/**", (route) => route.abort());
  let release!: () => void;
  const loading = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/src/pages/users/UsersPage.tsx*", async (route) => { await loading; await route.continue(); });
  await page.goto("/gallery");
  const original = page.locator(".page-highlight .navigation-highlight > [aria-current=page]").first();
  const fontSize = await original.evaluate((element) => getComputedStyle(element).fontSize);
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Users", exact: true }).click();
  const bridge = page.locator("[data-highlight-bridge]");
  await expect(bridge).toBeVisible();
  await expect(bridge.locator(".page-highlight__toggle")).toBeVisible();
  await expect(bridge.locator(".navigation-highlight > [aria-current=page]").first()).toHaveCSS("font-size", fontSize);
  release();
  await expect(bridge).toHaveCount(0);
  await expect(page.locator(".page-highlight__toggle")).toBeVisible();
});

for (const width of [390, 1280]) {
  test(`page highlights match Gallery at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
        user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test",
      }, version: 0 }));
      localStorage.setItem("shinigacim.animations-enabled", "false");
    });
    await page.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/location/home-location") return route.fulfill({ json: null });
      return route.fulfill({ json: { page: 1, offset: 0, limit: 30, total: 0, items: [], allCount: 0, pendingCount: 0, hasMore: false } });
    });
    await page.route("**/hubs/**", (route) => route.abort());
    await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({ json: { version: 8, sources: {}, layers: [] } }));
    const sizes: number[] = [];
    for (const path of ["/gallery", "/location/saved", "/users"]) {
      await page.goto(path);
      const bar = page.locator(".page-highlight .navigation-highlight-bar");
      await expect(bar).toBeVisible();
      sizes.push((await bar.boundingBox())!.height);
      const toggle = page.locator(".page-highlight__toggle");
      if (width < 768) {
        await expect(toggle).toBeVisible();
        const topbar = (await page.locator(".app-topbar").boundingBox())!;
        const box = (await bar.boundingBox())!;
        expect(Math.abs(box.y - topbar.y - topbar.height)).toBeLessThan(1);
        expect(box.x).toBeLessThan(0);
        expect(box.x + box.width).toBeGreaterThan(width);
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
      } else await expect(toggle).toBeHidden();
    }
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThan(1);
  });
}

test("mobile highlight collapse persists across page transitions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test",
    }, version: 0 }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
  });
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/location/home-location") return route.fulfill({ json: null });
    return route.fulfill({ json: { page: 1, offset: 0, limit: 30, total: 0, items: [], allCount: 0, pendingCount: 0, hasMore: false } });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({ json: { version: 8, sources: {}, layers: [] } }));
  await page.goto("/gallery");
  await page.locator(".page-highlight__toggle").click();
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  for (const [name, path] of [["Locations", "/location"], ["Users", "/users"], ["Gallery", "/gallery"]]) {
    await nav.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    const highlight = page.locator(".page-highlight").filter({ has: page.locator(".page-highlight__toggle") }).last();
    await expect(highlight.locator(".page-highlight__toggle")).toHaveAttribute("aria-expanded", "false");
    await expect(highlight.locator(".page-highlight__navigation")).toHaveCSS("height", "0px");
    await expect(page.locator("[data-highlight-bridge]")).toHaveCount(0);
  }
  await page.locator(".page-highlight__toggle").click();
  await nav.getByRole("link", { name: "Users", exact: true }).click();
  await expect(page.locator(".page-highlight__toggle").last()).toHaveAttribute("aria-expanded", "true");
});

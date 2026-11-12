import { expect, test } from "@playwright/test";

test("mobile gallery highlight meets the topbar and screen edges", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "u1", username: "viewer", role: "user", status: "active", createdAt: "2026-01-01" },
      accessToken: "test", refreshToken: "test",
    }, version: 0 }));
    localStorage.setItem("shinigacim.animations-enabled", "false");
  });
  await page.route("**/api/**", (route) => route.fulfill({ json: { offset: 0, limit: 20, total: 0, items: [], hasMore: false } }));
  await page.route("**/hubs/**", (route) => route.abort());
  await page.goto("/gallery");
  const bar = page.locator(".gallery-layout__header .navigation-highlight-bar");
  await expect(bar).toBeVisible();
  const rects = await page.evaluate(() => {
    const rect = (selector: string) => {
      const bounds = document.querySelector(selector)!.getBoundingClientRect();
      return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom };
    };
    return { topbar: rect(".app-topbar"), bar: rect(".gallery-layout__header .navigation-highlight-bar"), selected: rect('.gallery-layout__header a[aria-current="page"]') };
  });
  expect(rects.bar.top).toBe(rects.topbar.bottom);
  await expect(bar).toHaveCSS("padding-top", "3.2px");
  expect(rects.bar.left).toBeLessThan(0);
  expect(rects.bar.right).toBeGreaterThan(390);
  expect(rects.selected.left).toBeLessThan(0);
  expect(rects.selected.right).toBe(195);
  await page.getByRole("link", { name: "Album", exact: true }).click();
  await expect(page.getByRole("link", { name: "Album", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "Hide gallery navigation" })).toBeInViewport();
  const album = await page.getByRole("link", { name: "Album", exact: true }).boundingBox();
  expect(album!.x + album!.width).toBeGreaterThan(390);
  const toggle = page.getByRole("button", { name: "Hide gallery navigation" });
  await expect(toggle).toHaveCSS("border-top-left-radius", "0px");
  await expect(toggle).toHaveCSS("border-top-right-radius", "0px");
  await expect(toggle).not.toHaveCSS("border-bottom-left-radius", "0px");
  expect((await toggle.boundingBox())!.y).toBe((await bar.boundingBox())!.y + (await bar.boundingBox())!.height);
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Show gallery navigation" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#gallery-navigation")).toHaveAttribute("inert", "");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Hide gallery navigation" })).toHaveAttribute("aria-expanded", "true");
  const gaps = await page.evaluate(async () => {
    const header = document.querySelector<HTMLElement>(".gallery-layout__header")!;
    const bar = header.querySelector<HTMLElement>(".navigation-highlight-bar")!;
    const toggle = header.querySelector<HTMLButtonElement>(".page-highlight__toggle")!;
    header.querySelector<HTMLElement>(".page-highlight")!.dataset.animationEnabled = "true";
    document.documentElement.dataset.motion = "on";
    const samples: number[] = [];
    const positions: number[] = [];
    const sample = () => new Promise<void>((resolve) => {
      const start = performance.now();
      const frame = () => {
        const barBounds = bar.getBoundingClientRect();
        const toggleBounds = toggle.getBoundingClientRect();
        positions.push(toggleBounds.top);
        if (barBounds.bottom > header.getBoundingClientRect().top + 1) samples.push(Math.abs(barBounds.bottom - toggleBounds.top));
        if (performance.now() - start < 260) requestAnimationFrame(frame); else resolve();
      };
      requestAnimationFrame(frame);
    });
    toggle.click();
    await sample();
    toggle.click();
    await sample();
    return { samples, positions };
  });
  expect(gaps.samples.length).toBeGreaterThan(4);
  expect(Math.max(...gaps.samples)).toBeLessThan(1);
  expect(new Set(gaps.positions.map((position) => Math.round(position))).size).toBeGreaterThan(4);
  await expect(page.locator(".page-highlight__navigation")).toHaveCSS("transition-timing-function", "ease-out");
  await page.locator(".page-highlight__toggle").click();
  await expect(page.locator(".page-highlight__navigation")).toHaveCSS("transition-timing-function", "ease-in");
  await page.screenshot({ path: "test-results/mobile-gallery-highlight.png" });
});


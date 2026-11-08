import { expect, test } from "@playwright/test";

const paths = ["/gallery", "/location", "/users"] as const;
const names: Record<string, string> = { "/gallery": "Gallery", "/location": "Locations", "/users": "Users" };
for (const shifted of [false, true]) for (const from of paths) for (const to of paths) {
  if (from === to) continue;
  test(`${from} to ${to} keeps a visible highlight${shifted ? " from another index" : ""}`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({ state: { user: { id: "me", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test" }, version: 0 }));
      localStorage.setItem("shinigacim.animations-enabled", "true");
    });
    await page.route("**/api/**", route => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/location/home-location") return route.fulfill({ json: null });
      if (path.endsWith("/page") || path === "/api/location/travel/map" || path.startsWith("/api/library/gallery")) return route.fulfill({ json: { page: 1, total: 0, limit: 30, items: [], allCount: 0, pendingCount: 0 } });
      return route.fulfill({ json: [] });
    });
    await page.route("**/hubs/**", route => route.abort());
    await page.route(/https:\/\/[^/]*mapbox\.com\//, route => route.fulfill({ json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {} }));
    await page.goto(from);
    await expect(page.locator("#main-content .navigation-highlight__indicator").first()).toBeVisible();
    if (shifted) {
      await page.locator("#main-content .navigation-highlight:not(.navigation-highlight-overlay .navigation-highlight) > [data-highlight]").nth(1).click();
      await expect(page.locator("#main-content .navigation-highlight:not(.navigation-highlight-overlay .navigation-highlight) > [data-active=true]")).toHaveCount(1);
    }
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      const samples: { path: string; bar: boolean; indicator: boolean; opacity: number; moving: boolean; offset: number; bridge: boolean }[] = [];
      (window as Window & { barSamples: typeof samples }).barSamples = samples;
      const start = performance.now();
      const sample = () => {
        const bar = document.querySelector<HTMLElement>('[data-highlight-bridge]') ?? document.querySelector<HTMLElement>('#main-content .navigation-highlight-bar');
        const indicator = bar?.querySelector<HTMLElement>('.navigation-highlight__indicator');
        const visible = (node: HTMLElement | null | undefined) => !!node && node.getBoundingClientRect().width > 1 && getComputedStyle(node).visibility === 'visible';
        const nav = bar?.querySelector<HTMLElement>(".navigation-highlight:not(.navigation-highlight-overlay .navigation-highlight)");
        const selected = nav?.querySelector<HTMLElement>('[data-active="true"]');
        const navRect = nav?.getBoundingClientRect();
        const offset = navRect && indicator && selected ? (indicator.getBoundingClientRect().left - selected.getBoundingClientRect().left) / navRect.width : 0;
        samples.push({ offset, bridge: !!bar?.hasAttribute("data-highlight-bridge"), path: location.pathname, bar: visible(bar), indicator: visible(indicator), opacity: indicator ? Number(getComputedStyle(indicator).opacity) : 0, moving: (document.querySelector<HTMLElement>("#main-content [data-push-page-content]")?.getAnimations().length ?? 0) > 0 });
        if (performance.now() - start < 1500) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.getByRole("link", { name: names[to], exact: true }).click();
    await expect(page).toHaveURL(new RegExp(to.replaceAll('/', '\\/') + '$'));
    await page.waitForTimeout(500);
    const samples = (await page.evaluate(() => (window as Window & { barSamples: { path: string; bar: boolean; indicator: boolean; opacity: number }[] }).barSamples)).filter(s => s.path === to);
    expect(samples.length).toBeGreaterThan(5);
    expect(samples.every(s => s.bar && s.indicator && s.opacity > .8)).toBe(true);
    expect(samples.some(s => s.moving)).toBe(true);
    await expect(page.locator("[data-highlight-bridge]")).toHaveCount(0);
    if (shifted) expect(Math.max(...samples.filter(s => !s.bridge).map(s => s.offset))).toBeGreaterThan(.15);
  });
}


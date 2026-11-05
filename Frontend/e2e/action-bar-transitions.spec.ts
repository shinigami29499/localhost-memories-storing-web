import { expect, test, type Page } from "@playwright/test";

async function settled(page: Page) {
  await expect(page.locator("#main-content > .page-transition")).not.toHaveAttribute("data-transition-loading", "true");
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter((animation) =>
    animation.playState === "running" && (animation.effect as KeyframeEffect)?.pseudoElement?.startsWith("::view-transition"),
  ).length)).toBe(0);
}

async function sidebar(page: Page, path: string) {
  const link = page.locator(`.sidebar a[href="${path}"]`);
  if (!await link.isVisible()) await page.locator(".sidebar__toggle").click();
  await link.click();
}

for (const width of [1280, 390]) {
  for (const effect of ["iris", "push"]) {
    test(`action bar sequence at ${width}px with ${effect}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((effect) => {
        localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
          user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" },
          accessToken: "test", refreshToken: "test",
        }, version: 0 }));
        localStorage.setItem("shinigacim.page-transition", effect);
        localStorage.setItem("shinigacim.animations-enabled", "true");
      }, effect);
      await page.route("**/api/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/api/location/home-location") return route.fulfill({ json: null });
        if (path === "/api/users") return route.fulfill({ json: [
          { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" },
          { id: "u2", username: "pending-user", role: "user", status: "pending_approval", createdAt: "2026-01-01" },
        ] });
        if (path.startsWith("/api/library/gallery")) return route.fulfill({ json: { offset: 0, limit: 20, total: 0, items: [] } });
        return route.fulfill({ json: [] });
      });
      await page.route("**/hubs/**", (route) => route.abort());
      await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({ json:
        route.request().url().includes("/styles/v1/")
          ? { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#1c1f23" } }] }
          : {},
      }));
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/gallery");
      await settled(page);
      const bar = page.locator(".page-action-bar");
      await expect(bar.getByRole("button", { name: "Upload media", exact: true })).toBeVisible();
      const primary = await bar.getByRole("button", { name: "Upload media", exact: true }).elementHandle();
      await page.evaluate(() => {
        const samples: unknown[] = [];
        (window as Window & { actionBarSamples?: unknown[] }).actionBarSamples = samples;
        document.addEventListener("click", () => {
          const start = performance.now();
          const sample = () => {
            const bar = document.querySelector(".page-action-bar");
            samples.push({ time: performance.now(), url: location.pathname,
              width: bar?.querySelector(".gallery-selection-bar")?.getBoundingClientRect().width ?? 0,
              hidden: Boolean(bar?.closest('[inert], [aria-hidden="true"]')),
              nested: Boolean(bar?.closest(".page-transition")),
              pseudoDisplay: getComputedStyle(document.documentElement, "::view-transition-new(app-action-bar)").display,
              pseudoZ: getComputedStyle(document.documentElement, "::view-transition-group(app-action-bar)").zIndex,
              labels: Array.from(bar?.querySelectorAll("button, a") ?? []).map((node) => node.getAttribute("aria-label")),
            });
            if (performance.now() - start < 900) requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        }, true);
      });
      const galleryNav = page.getByRole("navigation", { name: "Gallery", exact: true });
      await galleryNav.getByRole("link", { name: "Album", exact: true }).click();
      await expect(bar.getByRole("button", { name: "New album", exact: true })).toBeVisible();
      expect(await primary!.evaluate((node) => node.isConnected)).toBe(true);
      await page.screenshot({ path: test.info().outputPath("gallery-album-during.png") });
      await settled(page);
      await bar.getByRole("button", { name: "New album", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
      await galleryNav.getByRole("link", { name: "Trash", exact: true }).click();
      await settled(page);
      await expect(bar.locator("button, a")).toHaveCount(0);
      await page.screenshot({ path: test.info().outputPath("gallery-trash.png") });

      await sidebar(page, "/location");
      await page.waitForTimeout(100);
      await page.screenshot({ path: test.info().outputPath("gallery-location-during.png") });
      await settled(page);
      for (const tab of ["Map", "Saved", "History"]) {
        const button = page.getByRole("button", { name: tab, exact: true });
        if (tab !== "Map") await button.click();
        await expect(button).toHaveAttribute("aria-pressed", "true");
        await page.waitForTimeout(100);
        await page.screenshot({ path: test.info().outputPath(`location-${tab.toLowerCase()}-during.png`) });
        await expect(page.locator(".place__view-content > .page-transition")).not.toHaveAttribute("data-transition-loading", "true");
        await settled(page);
        await expect(bar.locator("button, a")).toHaveCount(0);
        if (tab === "Map") await expect(page.locator(".map-navigation").getByRole("button", { name: "Add", exact: true })).toBeVisible();
      }
      await sidebar(page, "/users");
      await settled(page);
      for (const tab of ["All users", "Pending"]) {
        const button = page.getByRole("tab", { name: new RegExp(tab) });
        if (tab === "Pending") await button.click();
        await expect(button).toHaveAttribute("aria-selected", "true");
        await page.screenshot({ path: test.info().outputPath(`users-${tab.toLowerCase().replaceAll(" ", "-")}.png`) });
        await settled(page);
        await expect(bar.locator("button, a")).toHaveCount(0);
      }
      // Return to a populated bar after pages with no gallery actions.
      await sidebar(page, "/gallery");
      await settled(page);
      await expect(bar.getByRole("button", { name: "Upload media", exact: true })).toBeVisible();
      await expect(bar.getByRole("link", { name: "Favorites", exact: true })).toBeVisible();
      const samples = await page.evaluate(() => (window as Window & { actionBarSamples?: { nested: boolean; hidden: boolean; pseudoZ: string }[] }).actionBarSamples ?? []);
      await test.info().attach("action-bar-frames", { body: JSON.stringify(samples, null, 2), contentType: "application/json" });
      expect(samples.some((sample) => sample.nested)).toBe(false);
      expect(errors).toEqual([]);
    });
  }
}

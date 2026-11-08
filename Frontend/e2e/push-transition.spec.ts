import { expect, test } from "@playwright/test";

async function setup(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: { user: { id: "me", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test" }, version: 0 }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
  });
  await page.route("**/api/**", (route) => {
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
  await page.getByRole("link", { name: "Gallery" }).click();
  const exit = page.locator('[data-push-transition="exit"]');
  await expect(exit).toHaveCount(1);
  await expect(exit).toContainText("Active Person");
  await expect(exit).not.toContainText("No media yet");
  await expect(exit.locator(".navigation-highlight-bar")).toHaveCount(0);
  const bar = page.locator(".gallery-layout__header .navigation-highlight-bar");
  await expect(bar).toBeVisible();
  expect(await page.locator("#main-content").evaluate((element) => element.getAnimations().length)).toBe(0);
  expect(await page.locator(".gallery-layout__content").evaluate((element) => element.getAnimations().length)).toBeGreaterThan(0);
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


test("gallery highlight keeps the old section during the push", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: { user: { id: "me", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test" }, version: 0 }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
  });
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path.endsWith("/page") || path.includes("gallery") || path.includes("album") ? { page: 1, total: 0, limit: 30, items: [] } : [] });
  });
  await page.route("**/hubs/**", route => route.abort());
  await page.goto("/gallery");
  await expect(page.getByText("No media yet")).toBeVisible();
  const tabs = page.locator(".gallery-layout__header");
  const before = await tabs.boundingBox();
  await tabs.getByRole("link", { name: "Album" }).click();
  const exit = page.locator('[data-push-transition="exit"]');
  await expect(exit).toHaveCount(1);
  await expect(exit).toContainText("No media yet");
  expect(Math.abs(before!.x - (await tabs.boundingBox())!.x)).toBeLessThan(1);
  await expect(exit).toHaveCount(0);
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

test("page change moves highlight from the old index to the new index", async ({ page }) => {
  await setup(page);
  await page.goto("/users");
  await expect(page.getByText("Active Person").first()).toBeVisible();
  await page.getByRole("tab", { name: "Pending" }).click();
  await expect(page.getByText("Pending Person").first()).toBeVisible();
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const samples: { left: number; width: number; target: number }[] = [];
    (window as Window & { highlightSamples: typeof samples }).highlightSamples = samples;
    const start = performance.now();
    const sample = () => {
      const nav = document.querySelector<HTMLElement>(".gallery-layout__header .navigation-highlight:not(.navigation-highlight-overlay .navigation-highlight)");
      const indicator = nav?.querySelector<HTMLElement>(".navigation-highlight__indicator");
      const active = nav?.querySelector<HTMLElement>('[data-active="true"]');
      if (nav && indicator && active) {
        const navRect = nav.getBoundingClientRect();
        const rect = indicator.getBoundingClientRect();
        samples.push({ left: (rect.left - navRect.left) / navRect.width, width: rect.width / navRect.width, target: (active.getBoundingClientRect().left - navRect.left) / navRect.width });
      }
      if (performance.now() - start < 1500) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.getByRole("link", { name: "Gallery", exact: true }).click();
  await expect(page.locator(".gallery-layout__header")).toBeVisible();
  await page.waitForTimeout(650);
  const samples = await page.evaluate(() => (window as Window & { highlightSamples: { left: number; target: number }[] }).highlightSamples);
  expect(samples.length).toBeGreaterThan(5);
  expect(Math.max(...samples.map((sample) => sample.left - sample.target))).toBeGreaterThan(0.2);
  expect(Math.abs(samples.at(-1)!.left - samples.at(-1)!.target)).toBeLessThan(0.03);
});

test("page changes swap header and highlight labels without changing accessible names", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await setup(page);
  await page.goto("/users");
  await expect(page.getByRole("heading", { name: "Users", exact: true })).toBeVisible();
  await expect(page.getByText("Active Person").first()).toBeVisible();
  await page.getByRole("link", { name: "Gallery", exact: true }).click();
  const header = page.locator(".app-topbar__title");
  await expect(header.locator('[data-slot="swapping-text-in"]').first()).toBeVisible();
  const tabs = page.locator(".gallery-layout__header .navigation-highlight:not(.navigation-highlight-overlay .navigation-highlight)");
  await expect(tabs.locator('[data-slot="swapping-text-in"]').first()).toBeAttached();
  await expect(page.getByRole("heading", { name: "Gallery", exact: true })).toBeAttached();
  await expect(tabs.getByRole("link", { name: "Gallery", exact: true })).toBeAttached();
  await expect(page.locator('.navigation-highlight-overlay [data-slot="swapping-text-in"]').first()).toBeAttached();
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

test("highlight text starts with outgoing characters and swaps once to the new label", async ({ page }) => {
  await setup(page);
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/location/home-location") return route.fulfill({ json: null });
    if (path.endsWith("/page") || path.startsWith("/api/library/gallery") || path === "/api/location/travel/map") return route.fulfill({ json: { page: 1, total: 0, limit: 30, items: [] } });
    return route.fulfill({ json: [] });
  });
  await page.route(/https:\/\/[^/]*mapbox\.com\//, route => route.fulfill({ json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {} }));
  await page.goto("/gallery");
  await expect(page.getByRole("link", { name: "Gallery", exact: true }).last()).toBeVisible();
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const changes: { from: string; to: string }[] = [];
    (window as Window & { textChanges: typeof changes }).textChanges = changes;
    const capture = () => {
      const label = document.querySelector<HTMLElement>('#main-content .place__view-switch .navigation-highlight:not(.navigation-highlight-overlay .navigation-highlight) [data-swap-label-index="0"]');
      if (!label) return;
      const from = [...label.querySelectorAll('[data-slot="swapping-text-out"]')].map(node => node.textContent).join("");
      const to = [...label.querySelectorAll('[data-slot="swapping-text-in"]')].map(node => node.textContent).join("");
      if (from && to && (!changes.length || changes.at(-1)!.from !== from || changes.at(-1)!.to !== to)) changes.push({ from, to });
    };
    document.addEventListener("highlight-text-handoff-primed", (event) => {
      const bar = event.target as HTMLElement;
      queueMicrotask(() => {
        const source = bar.querySelector<HTMLElement>('.navigation-highlight:not(.navigation-highlight-overlay .navigation-highlight) [data-swap-label-index="0"] [data-slot="swapping-text"] > .sr-only');
        const overlay = bar.querySelector<HTMLElement>('.navigation-highlight-overlay [data-swap-label-index="0"] [data-slot="swapping-text"] > .sr-only');
        (window as Window & { primedText?: { source?: string; overlay?: string } }).primedText = { source: source?.textContent ?? undefined, overlay: overlay?.textContent ?? undefined };
      });
    }, { once: true });
    const observer = new MutationObserver(capture);
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 2000);
  });
  await page.getByRole("link", { name: "Locations", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { textChanges: unknown[] }).textChanges.length)).toBeGreaterThan(0);
  const changes = await page.evaluate(() => (window as Window & { textChanges: { from: string; to: string }[] }).textChanges);
  expect(changes[0]).toEqual({ from: "Gllery", to: "Mp" });
  expect(await page.evaluate(() => (window as Window & { primedText?: unknown }).primedText)).toEqual({ source: "Gallery", overlay: "Gallery" });
  await page.waitForTimeout(600);
  const allChanges = await page.evaluate(() => (window as Window & { textChanges: { from: string; to: string }[] }).textChanges);
  expect(allChanges).toEqual([{ from: "Gllery", to: "Mp" }]);
});

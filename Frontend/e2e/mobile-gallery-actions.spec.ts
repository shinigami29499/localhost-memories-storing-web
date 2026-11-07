import { expect, test } from "@playwright/test";

test("mobile gallery actions stay anchored across gallery sections", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" },
      accessToken: "test", refreshToken: "test",
    }, version: 0 }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
  });
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path.startsWith("/api/library/gallery") || path.startsWith("/api/library/album") ? { offset: 0, limit: 20, total: 0, items: [], hasMore: false } : [] });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.goto("/gallery");
  const bar = page.locator(".page-action-bar");
  const nav = page.getByRole("navigation", { name: "Gallery", exact: true });
  const galleryActions = bar.locator(".page-action-bar__item > .gallery-page__actions");
  await expect(galleryActions.getByRole("button", { name: "Upload media" })).toBeVisible();
  await expect(galleryActions).toHaveCSS("border-top-width", "2px");
  await expect(galleryActions).toHaveCSS("border-top-color", "rgb(244, 243, 238)");
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    (window as Window & { mobileExitFrames: Keyframe[][]; mobileExitRects: number[][] }).mobileExitFrames = [];
    (window as Window & { mobileExitRects: number[][] }).mobileExitRects = [];
    Element.prototype.animate = function (frames, options) {
      if ((this.hasAttribute("data-collapsing-bar") || this.classList.contains("gallery-page__actions")) && Array.isArray(frames)) {
        (window as Window & { mobileExitFrames: Keyframe[][] }).mobileExitFrames.push(frames);
        // A bar sliding in from the right is intentionally offset until its entry ends.
        if (frames[0]?.clipPath !== "inset(0 0 0 100%)") {
          const rect = this.getBoundingClientRect();
          (window as Window & { mobileExitRects: number[][] }).mobileExitRects.push([rect.width, rect.height, rect.right, rect.bottom]);
        }
      }
      return original.call(this, frames, options);
    };
  });
  for (const [section, action] of [["Album", "New album"], ["Trash", ""], ["Album", "New album"], ["Gallery", "Upload media"], ["Trash", ""], ["Gallery", "Upload media"]]) {
    await nav.getByRole("link", { name: section, exact: true }).click();
    if (action) {
      const button = bar.getByRole("button", { name: action, exact: true });
      await expect(button).toBeVisible();
      await expect.poll(async () => { const box = await bar.locator(".page-action-bar__item > .gallery-page__actions").boundingBox(); return Math.round((box?.x ?? 0) + (box?.width ?? 0)); }).toBe(378);
      await expect.poll(async () => await bar.locator("[data-collapsing-bar], [data-exiting]").count()).toBe(0);
    } else {
      await expect(bar.locator(".page-action-bar__item > .gallery-page__actions")).toBeHidden();
    }
  }
  const frames = await page.evaluate(() => (window as Window & { mobileExitFrames: Keyframe[][] }).mobileExitFrames);
  expect(frames.some(([start, end]) => Number.parseFloat(String(start.height)) > Number.parseFloat(String(end.height)))).toBe(true);
  expect(frames.some(([start, end]) => Number.parseFloat(String(start.width)) > 0 && end.width === "0px")).toBe(true);
  expect(frames.some(([start, end]) => Number.parseFloat(String(start.height)) > 0 && Number.parseFloat(String(end.height)) > Number.parseFloat(String(start.height)))).toBe(true);
  const rects = await page.evaluate(() => (window as Window & { mobileExitRects: number[][] }).mobileExitRects);
  expect(rects.every(([width, height, right, bottom]) => width > 0 && height > 0 && Math.round(right) === 378 && bottom > 0), JSON.stringify(rects)).toBe(true);
});


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
    (window as Window & { collapseSamples: number[][] }).collapseSamples = [];
    Element.prototype.animate = function (frames, options) {
      if ((this.hasAttribute("data-collapsing-bar") || this.classList.contains("gallery-page__actions")) && Array.isArray(frames)) {
        (window as Window & { mobileExitFrames: Keyframe[][] }).mobileExitFrames.push(frames);
        // A bar sliding in from the right is intentionally offset until its entry ends.
        if (frames[0]?.clipPath !== "inset(0 0 0 100%)") {
          const rect = this.getBoundingClientRect();
          (window as Window & { mobileExitRects: number[][] }).mobileExitRects.push([rect.width, rect.height, rect.right, rect.bottom]);
        }
      }
      const animation = original.call(this, frames, options);
      if (this.hasAttribute("data-collapsing-bar")) {
        const element = this;
        const sample = () => {
          const rect = element.getBoundingClientRect();
          (window as Window & { collapseSamples: number[][] }).collapseSamples.push([rect.width, rect.height, rect.right, rect.bottom, Number(getComputedStyle(element).opacity)]);
          if (element.isConnected && animation.playState === "running") requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }
      return animation;
    };
  });
  for (const [section, action] of [["Album", "New album"], ["Trash", ""], ["Album", "New album"], ["Gallery", "Upload media"], ["Trash", ""], ["Gallery", "Upload media"]]) {
    const sampleCount = await page.evaluate(() => (window as Window & { collapseSamples: number[][] }).collapseSamples.length);
    await nav.getByRole("link", { name: section, exact: true }).click();
    if (action) {
      const button = bar.getByRole("button", { name: action, exact: true });
      await expect(button).toBeVisible();
      await expect.poll(async () => { const box = await bar.locator(".page-action-bar__item > .gallery-page__actions").boundingBox(); return Math.round((box?.x ?? 0) + (box?.width ?? 0)); }).toBe(378);
      await expect.poll(async () => await bar.locator("[data-collapsing-bar], [data-exiting]").count()).toBe(0);
    } else {
      await expect(bar.locator(".page-action-bar__item > .gallery-page__actions")).toBeHidden();
      await page.waitForTimeout(250);
      const collapse = await page.evaluate((start) => (window as Window & { collapseSamples: number[][] }).collapseSamples.slice(start), sampleCount);
      expect(collapse.some(([width, height, right, bottom]) => width > 4 && width < 44 && height > 0 && Math.round(right) === 378 && Math.round(bottom) === 764), JSON.stringify(collapse)).toBe(true);
      await expect(bar.locator("[data-collapsing-bar]")).toHaveCount(0);
    }
  }
  const frames = await page.evaluate(() => (window as Window & { mobileExitFrames: Keyframe[][] }).mobileExitFrames);
  expect(frames.some(([start, end]) => Number.parseFloat(String(start.width)) > 0 && end.width === "0px")).toBe(true);
  const samples = await page.evaluate(() => (window as Window & { collapseSamples: number[][] }).collapseSamples);
  const visibleSamples = samples.filter(([width, height, , , opacity]) => width > 4 && height > 0 && opacity > 0);
  expect(visibleSamples.length, JSON.stringify(samples)).toBeGreaterThan(5);
  expect(visibleSamples.every(([, , right, bottom]) => Math.round(right) === 378 && Math.round(bottom) === 764), JSON.stringify(samples)).toBe(true);
  const rects = await page.evaluate(() => (window as Window & { mobileExitRects: number[][] }).mobileExitRects);
  expect(rects.every(([width, height, right, bottom]) => width > 0 && height > 0 && Math.round(right) === 378 && bottom > 0), JSON.stringify(rects)).toBe(true);
});

for (const width of [320, 390, 640, 641, 767]) {
  test(`gallery action bars match map sizing and offsets at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
        user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "" },
        accessToken: "test", refreshToken: "test",
      }, version: 0 }));
      localStorage.setItem("shinigacim.animations-enabled", "false");
    });
    const media = {
      id: "m1", mediaKind: "image", mimeType: "image/png", originalFilename: "alignment.png",
      fileSizeBytes: 128, createdAt: "2026-10-28T00:00:00Z", isFavorited: true, ownerId: "u1",
    };
    const album = {
      id: "a1", name: "Alignment album", caption: "", isPublic: false,
      owner: { id: "u1", username: "viewer" }, mediaCount: 1, previewMediaId: null,
      createdAt: "2026-10-28T00:00:00Z",
    };
    await page.route("**/hubs/**", (route) => route.abort());
    await page.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/library/album/a1") return route.fulfill({ json: album });
      if (path.endsWith("/file")) return route.fulfill({
        contentType: "image/png",
        body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64"),
      });
      return route.fulfill({ json: path.startsWith("/api/library/")
        ? { offset: 0, limit: 20, total: 1, items: [path === "/api/library/album/page" ? album : media], hasMore: false }
        : [] });
    });
    for (const path of ["/gallery", "/gallery/favorites", "/gallery/album", "/gallery/trash", "/gallery/album/a1"]) {
      await page.goto(path);
      if (path === "/gallery/trash" || path === "/gallery/album/a1") {
        const tile = page.getByRole("button", { name: "Open alignment.png" });
        await expect(tile).toBeVisible();
        await tile.focus();
        await page.keyboard.press("Shift+Space");
      }
      const bar = page.locator(".page-action-bar__item > .gallery-page__actions");
      await expect(bar).toBeVisible();
      const button = bar.locator(".gallery-selection-bar__action").first();
      const size = width <= 640 ? 40 : 50;
      await expect(button).toHaveCSS("width", `${size}px`);
      await expect(button).toHaveCSS("min-height", `${size}px`);
      await expect(button.locator("svg").first()).toHaveCSS("width", width <= 640 ? "18px" : "20px");
      await expect(bar).toHaveCSS("border-top-width", "2px");
      await expect(bar).toHaveCSS("padding", "0px");
      await expect.poll(async () => {
        const bounds = (await bar.boundingBox())!;
        const main = (await page.locator(".app-shell__main").boundingBox())!;
        return {
          width: Math.round(bounds.width),
          right: Math.round(main.x + main.width - bounds.x - bounds.width),
          bottom: Math.round(main.y + main.height - bounds.y - bounds.height),
        };
      }).toEqual({ width: size + 4, right: Math.round(width / 100 + 8), bottom: 16 });
    }
  });
}

import { expect, test } from "@playwright/test";

test.describe("mobile layout viewport", () => {
  test.use({ isMobile: true, viewport: { width: 412, height: 900 } });

  test("pending previews use mobile geometry even when overflow expands innerWidth", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({
        state: {
          user: { id: "viewer", username: "viewer", role: "admin", status: "active", createdAt: "" },
          accessToken: "test", refreshToken: "test",
        }, version: 0,
      }));
      localStorage.setItem("shinigacim.animations-enabled", "false");
    });
    let releasePreview!: () => void;
    const previewGate = new Promise<void>((resolve) => { releasePreview = resolve; });
    await page.route("**/hubs/**", (route) => route.abort());
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/file")) {
        await previewGate;
        return route.fulfill({
          contentType: "image/png",
          body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64"),
        });
      }
      if (path === "/api/library/album/page") return route.fulfill({ json: { items: [], nextCursor: null, hasMore: false } });
      return route.fulfill({ json: path === "/api/library/gallery" ? {
        offset: 0, total: 5, items: Array.from({ length: 5 }, (_, index) => ({
          id: `media-${index}`, mediaKind: "image", originalFilename: `image-${index}.jpg`,
          isFavorited: false, createdAt: "2026-11-09T12:00:00Z", ownerUsername: "viewer",
        })),
      } : [] });
    });
    try {
      await page.goto("/library/gallery");
      await expect(page.locator('[data-media-id="media-0"] img')).toBeVisible();
      await page.getByRole("link", { name: "Home", exact: true }).last().click();
      await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
      await page.evaluate(() => {
        const overflow = document.createElement("div");
        overflow.style.cssText = "position:absolute;left:0;top:0;width:1200px;height:1px;pointer-events:none";
        document.body.append(overflow);
      });
      const viewport = await page.evaluate(() => ({
        innerWidth: window.innerWidth, layoutWidth: document.documentElement.clientWidth,
        mobile: window.matchMedia("(max-width: 767px)").matches,
      }));
      expect(viewport.mobile).toBe(true);
      expect(viewport.innerWidth).toBeGreaterThan(767);
      expect(viewport.layoutWidth).toBe(412);
      await page.getByRole("link", { name: "Gallery", exact: true }).last().click();
      const cell = page.locator('[data-gallery-window-id="media-0"]');
      await expect(cell.locator("img")).toBeVisible();
      await expect.poll(() => cell.evaluate((element) => {
        const row = element.closest<HTMLElement>(".gallery-day-row")!;
        return Math.abs(element.getBoundingClientRect().width - (row.clientWidth - 2 * 4.12 - 2 * 4) / 3);
      })).toBeLessThan(1);
      expect(await cell.evaluate((element) => parseFloat(element.style.top))).toBeCloseTo(4.5, 1);
      const before = await cell.boundingBox();
      releasePreview();
      await expect.poll(() => cell.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
      const after = await cell.boundingBox();
      expect(after!.width).toBeCloseTo(before!.width, 1);
      expect(after!.height).toBeCloseTo(before!.height, 1);
    } finally {
      releasePreview();
    }
  });
});

test("cached tiles have mobile size before the row can be measured", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({
      state: {
        user: { id: "viewer", username: "viewer", role: "admin", status: "active", createdAt: "" },
        accessToken: "test", refreshToken: "test",
      }, version: 0,
    }));
    const clientWidth = Object.getOwnPropertyDescriptor(Element.prototype, "clientWidth")!;
    Object.defineProperty(Element.prototype, "clientWidth", {
      ...clientWidth,
      get() {
        return this.classList.contains("gallery-day-row") ? 0 : clientWidth.get!.call(this);
      },
    });
    const NativeResizeObserver = ResizeObserver;
    window.ResizeObserver = class extends NativeResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        super((entries, observer) => callback(entries.filter((entry) => !entry.target.classList.contains("gallery-day-row")), observer));
      }
    };
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/file")) return route.abort("internetdisconnected");
    return route.fulfill({ json: path === "/api/library/gallery" ? {
      offset: 0, total: 1, items: [{
        id: "media-0", mediaKind: "image", originalFilename: "image.jpg",
        isFavorited: false, createdAt: "2026-11-09T12:00:00Z", ownerUsername: "viewer",
      }],
    } : [] });
  });
  await page.goto("/library/gallery");
  const tile = page.locator('[data-media-id="media-0"]');
  await expect(tile.locator(".media-tile__retry")).toBeVisible();
  const dimensions = await tile.evaluate((element) => ({
    tile: element.getBoundingClientRect().width,
    row: element.closest<HTMLElement>(".gallery-day-row")!.getBoundingClientRect().width,
  }));
  expect(dimensions.tile).toBeCloseTo((dimensions.row - 2 * 3.9 - 2 * 4) / 3, 0);
});

test("gallery updates desktop row geometry when the viewport becomes mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({
      state: {
        user: { id: "viewer", username: "viewer", role: "admin", status: "active", createdAt: "" },
        accessToken: "test", refreshToken: "test",
      }, version: 0,
    }));
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/file")) return route.abort("internetdisconnected");
    return route.fulfill({ json: path === "/api/library/gallery" ? {
      offset: 0, total: 1, items: [{
        id: "media-0", mediaKind: "image", originalFilename: "image.jpg",
        isFavorited: false, createdAt: "2026-11-09T12:00:00Z", ownerUsername: "viewer",
      }],
    } : [] });
  });
  await page.goto("/library/gallery");
  await page.addStyleTag({ content: ".gallery-day-row { width: 390px !important; }" });
  const cell = page.locator('[data-gallery-window-id="media-0"]');
  await expect(page.locator('[data-media-id="media-0"] .media-tile__retry')).toBeVisible();
  await expect.poll(() => cell.evaluate((element) => element.style.top)).toBe("8px");
  await page.setViewportSize({ width: 390, height: 900 });
  await expect.poll(() => cell.evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo((390 - 2 * 3.9 - 2 * 4) / 3, 0);
  await expect.poll(() => cell.evaluate((element) => parseFloat(element.style.top))).toBeCloseTo(4.5, 1);
});

for (const connection of ["offline", "slow"] as const) {
  test(`cached gallery tiles retain their size when returning ${connection}`, async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({
        state: {
          user: { id: "viewer", username: "viewer", role: "admin", status: "active", createdAt: "" },
          accessToken: "test", refreshToken: "test",
        }, version: 0,
      }));
      localStorage.setItem("shinigacim.animations-enabled", "true");
    });
    let returning = false;
    let releaseRequests!: () => void;
    const requestGate = new Promise<void>((resolve) => { releaseRequests = resolve; });
    await page.route("**/hubs/**", (route) => route.abort());
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (returning && connection === "slow" && (path === "/api/library/gallery" || path.endsWith("/file"))) await requestGate;
      if (path.endsWith("/file")) return route.abort("internetdisconnected");
      if (path === "/api/library/album/page") return route.fulfill({ json: { items: [], nextCursor: null, hasMore: false } });
      return route.fulfill({ json: path === "/api/library/gallery" ? {
        offset: 0, total: 15, items: Array.from({ length: 15 }, (_, index) => ({
          id: `media-${index}`, mediaKind: "image", originalFilename: `image-${index}.jpg`,
          isFavorited: false, createdAt: new Date(Date.UTC(2026, 10, 9 - Math.floor(index / 3), 12)).toISOString(),
          ownerUsername: "viewer", location: { latitude: 21, longitude: 105, city: "Ha Noi" },
        })),
      } : [] });
    });
    await page.goto("/library/gallery");
    const tile = page.locator('[data-media-id="media-0"]:not([data-push-transition] [data-media-id])');
    await expect(tile.locator(".media-tile__retry")).toBeVisible();
    const before = await tile.boundingBox();
    const rowWidth = await tile.evaluate((element) => element.closest<HTMLElement>(".gallery-day-row")!.clientWidth);
    expect(before!.width).toBeCloseTo((rowWidth - 2 * 3.9 - 2 * 4) / 3, 0);
    await page.getByRole("link", { name: "Home", exact: true }).last().click();
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
    await expect(page.locator('[data-push-transition="exit"]')).toHaveCount(0);
    returning = true;
    if (connection === "offline") await context.setOffline(true);
    try {
      await page.evaluate(() => {
        const samples: number[] = [];
        (window as Window & { tileWidthSamples?: number[] }).tileWidthSamples = samples;
        const sample = () => {
          const current = document.querySelector<HTMLElement>('[data-media-id="media-0"]:not([data-push-transition] [data-media-id])');
          if (current) samples.push(current.getBoundingClientRect().width);
          if (samples.length < 60) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      await page.getByRole("link", { name: "Gallery", exact: true }).last().click();
      if (connection === "offline") await expect(tile.locator(".media-tile__retry")).toBeVisible();
      else await expect(tile.locator("img")).toBeVisible();
      await expect.poll(async () => (await tile.boundingBox())?.width ?? 0).toBeCloseTo(before!.width, 1);
      const after = await tile.boundingBox();
      expect(after!.height).toBeCloseTo(before!.height, 1);
      await expect.poll(() => page.evaluate(() => (window as Window & { tileWidthSamples?: number[] }).tileWidthSamples?.length ?? 0)).toBeGreaterThan(0);
      const samples = await page.evaluate(() => (window as Window & { tileWidthSamples?: number[] }).tileWidthSamples ?? []);
      expect(Math.min(...samples)).toBeGreaterThan(before!.width - 1);
      const captionFits = await tile.evaluate((element) => {
        const title = element.querySelector<HTMLElement>(".gallery-tile__title")!.getBoundingClientRect();
        const author = element.querySelector<HTMLElement>(".gallery-tile__author")!.getBoundingClientRect();
        const bounds = element.getBoundingClientRect();
        return title.top >= bounds.top && author.bottom <= bounds.bottom + 1;
      });
      expect(captionFits).toBe(true);
    } finally {
      releaseRequests();
      await context.setOffline(false);
    }
  });
}

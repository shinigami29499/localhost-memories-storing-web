import { expect, test } from "@playwright/test";

for (const width of [320, 390]) {
  test(`mobile gallery loads later days without horizontal scrolling at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 740 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
        user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" },
        accessToken: "test", refreshToken: "test",
      }, version: 0 }));
    });
    const items = [3, 3, 25, 3].flatMap((count, day) => Array.from({ length: count }, (_, index) => ({
      id: `day-${day}-${index}`, originalFilename: `image-${day}-${index}.jpg`, mediaKind: "image", mimeType: "image/jpeg",
      fileSizeBytes: 100, createdAt: new Date(Date.UTC(2026, 10, 12 - day, 10)).toISOString(), isFavorited: false,
    })));
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith("/file")) return route.abort();
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const limit = Number(url.searchParams.get("limit") ?? 5);
      return route.fulfill({ json: url.pathname.startsWith("/api/library/gallery")
        ? { offset, limit, total: items.length, items: items.slice(offset, offset + limit) }
        : [] });
    });
    await page.route("**/hubs/**", (route) => route.abort());
    await page.goto("/gallery");
    const groups = page.locator("[data-gallery-row]");
    await expect(groups).toHaveCount(4);
    const rows = page.locator(".gallery-day-row");
    expect(await rows.evaluateAll((elements) => elements.every((element) => element.scrollLeft === 0))).toBe(true);

    const scrollport = page.locator(".gallery-page__content");
    const box = await scrollport.boundingBox();
    if (!box) throw new Error("Gallery scrollport has no bounding box");
    await expect.poll(() => scrollport.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeGreaterThan(0);
    const cdp = await context.newCDPSession(page);
    const startY = box.y + box.height - 80;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: width / 2, y: startY }] });
    for (let distance = 20; distance <= 300; distance += 20) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: width / 2, y: startY - distance }] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => scrollport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    const lastTile = groups.last().locator(".media-tile").first();
    await expect(lastTile).toBeInViewport({ ratio: 1 });
    expect(await rows.evaluateAll((elements) => elements.every((element) => element.scrollLeft === 0))).toBe(true);
    await context.close();
  });
}

for (const path of ["/gallery", "/gallery/trash"]) {
  test(`horizontal media scrolling works on ${path}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
        user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" },
        accessToken: "test", refreshToken: "test",
      }, version: 0 }));
    });
    const items = Array.from({ length: 40 }, (_, i) => ({
      id: `media-${i}`, originalFilename: `image-${i}.jpg`, mediaKind: "image", mimeType: "image/jpeg",
      fileSizeBytes: 100, createdAt: i < 20 ? "2026-11-06T10:00:00Z" : new Date(Date.UTC(2026, 10, 25 - i)).toISOString(), isFavorited: false,
    }));
    await page.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith("/file")) return route.abort();
      return route.fulfill({ json: url.pathname.startsWith("/api/library/gallery")
        ? { offset: 0, limit: 20, total: items.length, items }
        : [] });
    });
    await page.route("**/hubs/**", (route) => route.abort());
    await page.goto(path);
    const row = page.locator(".gallery-date-grid--virtual").first();
    const tile = row.locator(".media-tile").first();
    const rowShell = page.locator(".gallery-day-row-shell").first();
    await expect(tile).toBeVisible();
    await expect(rowShell).toHaveAttribute("data-scroll-end", "true");
    await expect.poll(() => rowShell.evaluate((element) => getComputedStyle(element, "::after").opacity)).toBe("1");
    await expect(tile).toHaveCSS("touch-action", "manipulation");
    const box = await tile.boundingBox();
    if (!box) throw new Error("Tile has no bounding box");
    const cdp = await context.newCDPSession(page);
    const y = box.y + box.height / 2;
    const startX = box.x + box.width * 0.8;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: startX, y }] });
    for (let distance = 20; distance <= 140; distance += 20) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: startX - distance, y }] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => row.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await expect(rowShell).toHaveAttribute("data-scroll-start", "true");
    await row.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
      element.dispatchEvent(new Event("scroll"));
    });
    await expect(rowShell).not.toHaveAttribute("data-scroll-end", "true");
    await expect.poll(() => rowShell.evaluate((element) => getComputedStyle(element, "::after").opacity)).toBe("0");
    if (path === "/gallery") {
      const verticalCue = page.locator(".gallery-page__scroll-cue--down");
      const scrollport = page.locator(".gallery-page__content");
      await expect(verticalCue).toHaveAttribute("data-visible", "true");
      await expect(verticalCue).toHaveCSS("opacity", "1");
      await scrollport.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
        element.dispatchEvent(new Event("scroll"));
      });
      await expect(verticalCue).not.toHaveAttribute("data-visible", "true");
    }
    await context.close();
  });
}

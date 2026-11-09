import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

function media(index: number, day = 0) {
  return {
    id: `media-${index}`, mediaKind: index % 5 === 0 ? "video" : "image",
    originalFilename: `image-${index}.jpg`, isFavorited: false,
    createdAt: new Date(Date.UTC(2026, 10, 9 - day)).toISOString(),
    ownerUsername: "viewer",
  };
}

async function authenticate(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({
      state: {
        user: { id: "viewer", username: "viewer", role: "user", status: "active", createdAt: "" },
        accessToken: "test", refreshToken: "test",
      }, version: 0,
    }));
    localStorage.setItem("shinigacim.animations-enabled", "false");
  });
  await page.route("**/hubs/**", (route) => route.abort());
}

for (const width of [390, 1280]) {
  test(`gallery bounds mounted media across 100 dates at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await authenticate(page);
    const items = Array.from({ length: 1000 }, (_, index) => media(index, Math.floor(index / 10)));
    await page.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/file")) return route.fulfill({ contentType: "image/png", body: pixel });
      return route.fulfill({ json: path === "/api/library/gallery"
        ? { offset: 0, total: items.length, items } : [] });
    });
    await page.goto("/library/gallery");
    await expect(page.locator("[data-gallery-row]")).toHaveCount(100);
    await expect.poll(() => page.locator(".media-tile").count()).toBeLessThan(140);
    const initial = await page.locator(".media-tile").count();
    const scrollport = page.locator(".gallery-page__media-scroll");
    for (let cycle = 0; cycle < 3; cycle += 1) {
      await scrollport.evaluate((element) => { element.scrollTop = element.scrollHeight; });
      await expect(page.locator('[data-media-id="media-990"]')).toBeVisible();
      await expect.poll(() => page.locator(".media-tile").count()).toBeLessThan(140);
      await expect(page.locator('[data-media-id="media-0"]')).toHaveCount(0);
      await scrollport.evaluate((element) => { element.scrollTop = 0; });
      await expect(page.locator('[data-media-id="media-0"]')).toBeVisible();
      await expect.poll(() => page.locator(".media-tile").count()).toBeLessThan(140);
    }
    expect(await page.locator("video").count()).toBe(0);
    console.log(JSON.stringify({ width, records: 1000, initialMounted: initial, finalMounted: await page.locator(".media-tile").count() }));
  });
}

test("gallery captions stay readable on mobile without changing desktop sizes", async ({ page }) => {
  await authenticate(page);
  const items = [{ ...media(0), location: { latitude: 21, longitude: 105, city: "Ha Noi" } }];
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/file")) return route.fulfill({ contentType: "image/png", body: pixel });
    return route.fulfill({ json: path === "/api/library/gallery"
      ? { offset: 0, total: 1, items } : [] });
  });
  await page.goto("/library/gallery");
  for (const width of [320, 390, 767, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const tile = page.locator('[data-media-id="media-0"]');
    await expect(tile).toBeVisible();
    await expect.poll(() => tile.evaluate((element) => {
      const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const title = element.querySelector<HTMLElement>(".gallery-tile__title")!;
      const author = element.querySelector<HTMLElement>(".gallery-tile__author")!;
      return {
        title: parseFloat(getComputedStyle(title).fontSize) / rootSize,
        author: parseFloat(getComputedStyle(author).fontSize) / rootSize,
      };
    })).toEqual({ title: 0.75, author: 0.675 });
    const fits = await tile.evaluate((element) => {
      const info = element.querySelector(".gallery-tile__info")!.getBoundingClientRect();
      const title = element.querySelector(".gallery-tile__title")!.getBoundingClientRect();
      const author = element.querySelector(".gallery-tile__author")!.getBoundingClientRect();
      return title.top >= info.top && author.bottom <= element.getBoundingClientRect().bottom + 1;
    });
    expect(fits).toBe(true);
  }
});

test("gallery prefetches without draining a long horizontal group", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await authenticate(page);
  const offsets: number[] = [];
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/file")) return route.fulfill({ contentType: "image/png", body: pixel });
    if (url.pathname !== "/api/library/gallery") return route.fulfill({ json: [] });
    const offset = Number(url.searchParams.get("offset"));
    const limit = Number(url.searchParams.get("limit"));
    offsets.push(offset);
    return route.fulfill({ json: {
      offset, total: 1000, items: Array.from({ length: limit }, (_, index) => media(offset + index)),
    } });
  });
  await page.goto("/library/gallery");
  await expect(page.locator('[data-media-id="media-0"]')).toBeVisible();
  await expect.poll(() => [...new Set(offsets)]).toEqual([0, 20]);
  await page.waitForTimeout(300);
  expect([...new Set(offsets)]).toEqual([0, 20]);
  expect(offsets.filter((offset) => offset === 20)).toHaveLength(1);
  const row = page.locator(".gallery-day-row");
  await row.evaluate((element) => {
    element.scrollLeft = element.scrollWidth - element.clientWidth * 3;
  });
  await expect.poll(() => [...new Set(offsets)]).toEqual([0, 20, 40]);
  expect(offsets.filter((offset) => offset === 40)).toHaveLength(1);
  await expect.poll(() => row.locator(".media-tile").count()).toBeLessThan(20);
});

test("gallery reuses buttons and waits for scroll idle without changing tile geometry", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await authenticate(page);
  const items = Array.from({ length: 200 }, (_, index) => media(index));
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/file")) return route.fulfill({ contentType: "image/png", body: pixel });
    return route.fulfill({ json: path === "/api/library/gallery"
      ? { offset: 0, total: items.length, items } : [] });
  });
  await page.goto("/library/gallery");
  const first = page.locator('[data-media-id="media-0"]');
  await expect(first).toBeVisible();
  await expect(first.locator("img")).toHaveCount(1);
  const button = await first.elementHandle();
  if (!button) throw new Error("Initial gallery button was not mounted");
  const before = await button.boundingBox();
  const row = page.locator(".gallery-day-row");
  await row.evaluate(async (element) => {
    element.scrollLeft = 4000;
    element.dispatchEvent(new Event("scroll"));
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  expect(await button.evaluate((element) => element.isConnected)).toBe(true);
  expect(await button.getAttribute("data-media-id")).not.toBe("media-0");
  expect(await row.locator("img").count()).toBe(0);
  await expect.poll(() => row.locator("img").count()).toBeGreaterThan(0);
  const after = await button.boundingBox();
  expect(after?.width).toBeCloseTo(before!.width, 1);
  expect(after?.height).toBeCloseTo(before!.height, 1);
});

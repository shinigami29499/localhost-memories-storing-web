import { expect, test } from "@playwright/test";

for (const width of [320, 360, 375, 390, 393, 414, 430, 640, 700, 1280, 1920]) {
  test(`gallery and album day spacing match at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: width < 768 ? 3 : 1 });
    const page = await context.newPage();
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
        user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" },
        accessToken: "test", refreshToken: "test",
      }, version: 0 }));
    });
    const dates = ["2026-11-07T12:00:00Z", "2026-11-06T12:00:00Z"];
    await page.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      const items = dates.map((createdAt, index) => path.startsWith("/api/library/album")
        ? { id: `a${index}`, name: `Album ${index}`, caption: "", isPublic: true, owner: { id: "u1", username: "viewer" }, mediaCount: 0, previewMediaId: null, createdAt }
        : { id: `m${index}`, mediaKind: "image", mimeType: "image/jpeg", originalFilename: `image${index}.jpg`, fileSizeBytes: 1, createdAt, isFavorited: false, ownerUsername: "viewer", location: { latitude: 21, longitude: 105, city: "Hanoi" } });
      return route.fulfill({ json: path.startsWith("/api/library/album") ? { items, nextCursor: null, hasMore: false }
        : path === "/api/library/gallery" ? { offset: 0, limit: 20, total: 2, items } : [] });
    });
    await page.route("**/hubs/**", (route) => route.abort());
    async function measure(path: string, card: string) {
      await page.goto(path);
      const sections = page.locator(".gallery-groups > section");
      await expect(sections).toHaveCount(2);
      await expect(sections.first().locator(card)).toBeVisible();
      await expect(sections.first().locator(".gallery-tile__info > *")).toHaveCount(2);
      if (path === "/gallery") {
        await expect(sections.first().locator(".gallery-tile__title")).toContainText(/^Hanoi at \d{2}:\d{2}$/);
        const styles = await sections.first().locator(".gallery-tile__title").evaluate((element) => {
          const city = getComputedStyle(element.querySelector("strong")!);
          const time = getComputedStyle(element.querySelector(".gallery-tile__time:last-child")!);
          return { citySize: parseFloat(city.fontSize), cityWeight: Number(city.fontWeight), timeSize: parseFloat(time.fontSize), timeWeight: Number(time.fontWeight) };
        });
        expect(styles.timeSize).toBeLessThan(styles.citySize);
        expect(styles.timeWeight).toBeLessThan(styles.cityWeight);
      }
      else await expect(sections.first().locator(".gallery-tile__title")).toHaveText("Album 0");
      return sections.evaluateAll((groups, selector) => {
        const heading = groups[0].querySelector(".gallery-group__title")!.getBoundingClientRect();
        const first = groups[0].querySelector(selector)!.getBoundingClientRect();
        const next = groups[1].querySelector(".gallery-group__title")!.getBoundingClientRect();
        const info = groups[0].querySelector(".gallery-tile__info")!.getBoundingClientRect();
        const preview = groups[0].querySelector(".gallery-tile__preview")!.getBoundingClientRect();
        const badgeElement = groups[0].querySelector(".gallery-tile__badge")!;
        const badge = badgeElement.getBoundingClientRect();
        const badgeStyle = getComputedStyle(badgeElement);
        const cell = groups[0].querySelector(".gallery-window-cell")!.getBoundingClientRect();
        return { top: heading.top, cardTop: first.top, before: first.top - heading.bottom, after: next.top - first.bottom, sectionWidth: groups[0].getBoundingClientRect().width, rowWidth: groups[0].querySelector(".gallery-day-row")!.getBoundingClientRect().width, rowHeight: groups[0].querySelector(".gallery-day-row")!.getBoundingClientRect().height, cardWidth: first.width, cardHeight: first.height, cellHeight: cell.height, infoTop: info.top, infoHeight: info.height, previewTop: preview.top, previewHeight: preview.height, badgeWidth: badge.width, badgeHeight: badge.height, badgeTop: badge.top, badgeRight: badge.right, badgePadding: badgeStyle.padding };
      }, card);
    }
    const gallery = await measure("/gallery", ".media-tile");
    const album = await measure("/gallery/album", ".album-card__link");
    expect(gallery.top, JSON.stringify({ gallery, album })).toBe(album.top);
    expect(gallery.cardTop, JSON.stringify({ gallery, album })).toBe(album.cardTop);
    expect(gallery.before, JSON.stringify({ gallery, album })).toBe(album.before);
    expect(gallery.after, JSON.stringify({ gallery, album })).toBe(album.after);
    if (width < 768) expect(gallery.rowHeight, JSON.stringify({ gallery, album })).toBe(album.rowHeight);
    expect(gallery.cardWidth, JSON.stringify({ gallery, album })).toBe(album.cardWidth);
    expect(gallery.cardHeight, JSON.stringify({ gallery, album })).toBe(album.cardHeight);
    expect(gallery.cardHeight, JSON.stringify({ gallery, album })).toBe(gallery.cellHeight);
    expect(album.cardHeight, JSON.stringify({ gallery, album })).toBe(album.cellHeight);
    expect(gallery.infoTop, JSON.stringify({ gallery, album })).toBe(album.infoTop);
    expect(gallery.infoHeight, JSON.stringify({ gallery, album })).toBe(album.infoHeight);
    expect(gallery.previewTop, JSON.stringify({ gallery, album })).toBe(album.previewTop);
    expect(gallery.previewHeight, JSON.stringify({ gallery, album })).toBe(album.previewHeight);
    if (width < 768) {
      expect(gallery.badgeWidth, JSON.stringify({ gallery, album })).toBe(album.badgeWidth);
      expect(gallery.badgeHeight, JSON.stringify({ gallery, album })).toBe(album.badgeHeight);
      expect(gallery.badgeTop, JSON.stringify({ gallery, album })).toBe(album.badgeTop);
    } else {
      expect(gallery.badgeWidth / album.badgeWidth).toBeCloseTo(1.35, 3);
      expect(gallery.badgeHeight / album.badgeHeight).toBeCloseTo(1.35, 3);
    }
    expect(gallery.badgeRight, JSON.stringify({ gallery, album })).toBe(album.badgeRight);
    expect(gallery.badgePadding, JSON.stringify({ gallery, album })).toBe(album.badgePadding);
    await context.close();
  });
}

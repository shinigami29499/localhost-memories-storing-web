import { expect, test } from "@playwright/test";

test.use({ timezoneId: "Asia/Ho_Chi_Minh" });

for (const width of [390, 1280]) {
  const responsiveTest = test.extend({ hasTouch: width === 390 });
  responsiveTest(`album list shows two covers for the selected local date at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 520 });
    await page.emulateMedia({ colorScheme: "light" });
    await page.clock.setFixedTime(new Date("2026-11-21T04:00:00Z"));
    const owner = { id: "viewer", username: "Alex", role: "user", status: "active", createdAt: "" };
    await page.addInitScript((user) => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({
        state: { user, accessToken: "test", refreshToken: "test" }, version: 0,
      }));
      localStorage.setItem("shinigacim.animations-enabled", "true");
    }, owner);

    const album = (id: string, name: string, createdAt: string) => ({
      id, name, owner, createdAt, previewMediaId: id, mediaCount: 1, caption: "", isPublic: false,
    });
    const items = [
      album("today-a", "Mountain weekend", "2026-11-21T03:00:00Z"),
      { ...album("today-b", "The coast", "2026-11-20T19:00:00Z"), owner: { ...owner, username: "Jamie" } },
      album("today-c", "Third album", "2026-11-20T18:00:00Z"),
      album("yesterday", "City mornings", "2026-11-20T09:00:00Z"),
      album("yesterday-b", "Riverside", "2026-11-20T08:00:00Z"),
      album("single", "Solo album", "2026-11-19T08:00:00Z"),
      album("future-day", "Future album", "2026-11-22T04:00:00Z"),
      album("previous-month", "October album", "2026-10-31T04:00:00Z"),
      album("next-month", "December album", "2026-12-01T04:00:00Z"),
    ];
    let feedRequests = 0;
    await page.route(/^https?:\/\/[^/]+\/hubs\//, (route) => route.abort());
    await page.route(/^https?:\/\/[^/]+\/api\//, (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/library/album/page") {
        feedRequests++;
        return route.fulfill({ json: { items, hasMore: true, nextCursor: "more" } });
      }
      if (path === "/api/library/album/today-a") return route.fulfill({ json: items[0] });
      if (path === "/api/library/album/today-a/media") return route.fulfill({ json: { items: [], offset: 0, total: 0 } });
      if (path === "/api/library/album/yesterday-b") return route.fulfill({ json: items[4] });
      if (path === "/api/library/album/yesterday-b/media") return route.fulfill({ json: { items: [], offset: 0, total: 0 } });
      if (path.endsWith("/file")) {
        return route.fulfill({ contentType: "image/png", body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64",
        ) });
      }
      return route.fulfill({ json: [] });
    });

    await page.goto("/gallery");
    const bar = page.getByRole("group", { name: "Album dates" });
    const featured = page.getByRole("link", { name: "Open album Mountain weekend" });
    const compact = page.getByRole("heading", { name: "The coast", exact: true });
    const today = bar.getByRole("button", { name: "Saturday, November 21, 2026" });
    await expect(today).toHaveAttribute("aria-pressed", "true", { timeout: 15_000 });
    await expect(today).toHaveAttribute("data-has-albums", "true");
    await expect(featured).toBeVisible();
    await expect(page.locator(".gallery-page__actions")).toHaveCount(0);
    const title = page.getByRole("heading", { name: "Mountain weekend" });
    await expect(title.locator("xpath=following-sibling::*[1]").locator(":scope > .sr-only")).toHaveText("by Alex");
    const frame = page.getByRole("article").filter({ has: title });
    await expect(frame).toHaveCSS("padding-inline-start", "16px");
    await expect(frame.getByRole("link", { name: "Open album Mountain weekend" })).toBeVisible();
    await title.hover();
    await expect(title).toHaveCSS("text-decoration-line", "none");
    await title.click();
    await expect(page).toHaveURL(/\/gallery$/);
    await expect(featured.locator("svg.lucide-send-horizontal")).toHaveCount(1);
    await expect(compact).toBeVisible();
    await expect(page.getByRole("heading", { name: "Discover" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Third album" })).toHaveCount(0);
    const loadedRequests = feedRequests;
    const rail = bar.locator(".album-date-view__days");
    const bounds = (await rail.boundingBox())!;
    const gallery = (await page.getByRole("main", { name: "Album" }).boundingBox())!;
    expect(bounds.x).toBeCloseTo(gallery.x);
    expect(bounds.width).toBeCloseTo(gallery.width);
    if (width === 390) {
      expect(bounds.x).toBe(0);
      expect(bounds.width).toBe(width);
    }
    await expect(bar.locator(".album-date-view__month")).toHaveText("November 2026");
    const days = rail.getByRole("button");
    await expect(days).toHaveCount(21);
    await expect(days.first()).toHaveAttribute("data-date", "2026-11-01");
    await expect(days.last()).toHaveAttribute("data-date", "2026-11-21");
    const hasClippedEdges = await rail.evaluate((railElement) => {
      const frame = railElement.getBoundingClientRect();
      const days = Array.from(railElement.querySelectorAll("button"), (button) => button.getBoundingClientRect());
      return days.some((day) => day.left < frame.left && day.right > frame.left)
        || days.some((day) => day.left < frame.right && day.right > frame.right);
    });
    expect(hasClippedEdges).toBe(true);

    const initialLeft = await rail.evaluate((element) => element.scrollLeft);
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width / 2 + 85, bounds.y + bounds.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeLessThan(initialLeft - 50);
    await expect(today).toHaveAttribute("aria-pressed", "true");

    if (width === 390) {
      const touchLeft = await rail.evaluate((element) => element.scrollLeft);
      const touch = await page.context().newCDPSession(page);
      const x = bounds.x + bounds.width / 2;
      const y = bounds.y + bounds.height / 2;
      await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      for (let offset = 20; offset <= 100; offset += 20)
        await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - offset, y }] });
      await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(touchLeft + 40);
      await expect(today).toHaveAttribute("aria-pressed", "true");
    }

    const positionAtGutter = (date: string, side: "left" | "right", beyond: number) =>
      rail.evaluate((element, { date, side, beyond }) => {
        const tile = element.querySelector(`[data-date="${date}"]`)!;
        const frame = element.getBoundingClientRect();
        const gutter = parseFloat(getComputedStyle(element).scrollPaddingInlineStart);
        const bounds = tile.getBoundingClientRect();
        element.scrollLeft += side === "left"
          ? bounds.left - (frame.left + gutter - beyond)
          : bounds.right - (frame.right - gutter + beyond);
      }, { date, side, beyond });

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.evaluate(() => { document.documentElement.dataset.motion = "on"; });
    for (const [date, side] of [["2026-11-03", "left"], ["2026-11-20", "right"]] as const) {
      const tile = rail.locator(`[data-date="${date}"] .album-date-view__day-tile`);
      await positionAtGutter(date, side, -2);
      await expect(tile).toHaveCSS("scale", "1");
      await positionAtGutter(date, side, 10);
      const readScale = () => tile.evaluate((element) => Number(getComputedStyle(element).scale));
      await expect.poll(readScale).toBeLessThan(1);
      const edgeScale = await readScale();
      await positionAtGutter(date, side, 25);
      await expect.poll(readScale).toBeLessThan(edgeScale);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(tile).toHaveCSS("scale", "none");
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
    await page.evaluate(() => { document.documentElement.dataset.motion = "off"; });
    await expect(rail.locator(".album-date-view__day-tile").last()).toHaveCSS("scale", "none");

    const viewport = page.locator(".album-date-view__viewport");
    const barTop = (await bar.boundingBox())!.y;
    await viewport.evaluate((element) => { element.scrollTop = 100; });
    expect(await viewport.evaluate((element) => element.scrollTop)).toBe(0);
    expect((await bar.boundingBox())!.y).toBe(barTop);

    const mainSlot = page.locator(".album-date-card--featured");
    const secondarySlot = page.locator(".album-date-card--compact");
    const queue = page.locator(".album-date-view__queue");
    const cover = mainSlot.locator("img");
    const compactCover = secondarySlot.locator("img");
    const preview = mainSlot.locator(".album-date-card__preview");
    const compactPreview = secondarySlot.locator(".album-date-card__preview");
    const coverBounds = (await cover.boundingBox())!;
    const compactCoverBounds = (await compactCover.boundingBox())!;
    expect(coverBounds.width / coverBounds.height).toBeCloseTo(compactCoverBounds.width / compactCoverBounds.height);
    expect(coverBounds.width / coverBounds.height).toBeCloseTo(4 / 3);
    await expect(preview).toHaveCSS("box-shadow", "none");
    await expect(compactPreview).toHaveCSS("box-shadow", "none");
    const restingShadow = await frame.evaluate((element) => getComputedStyle(element).boxShadow);
    expect(restingShadow).not.toBe("none");
    const queueTitle = queue.getByRole("heading", { name: "Next Album", exact: true });
    await expect(queueTitle).toBeVisible();
    await expect(queue).toHaveCSS("border-top-width", "0px");
    const galleryBackground = page.getByRole("main", { name: "Album" });
    const raisedFill = await frame.evaluate((element) => getComputedStyle(element).backgroundColor);
    const todaySurface = today.locator(".album-date-view__day-tile");
    const idleDay = days.nth(19);
    const idleTile = idleDay.locator(".album-date-view__day-tile");
    const dateShadow = await idleTile.evaluate((tile) => getComputedStyle(tile).boxShadow);
    expect(dateShadow).not.toMatch(/inset|none/);
    const selectedShadow = await todaySurface.evaluate((tile) => getComputedStyle(tile).boxShadow);
    expect(selectedShadow).not.toMatch(/inset|none/);
    expect(selectedShadow).not.toBe(dateShadow);
    await expect(idleTile).toHaveCSS("border-top-color", raisedFill);
    await cover.click();
    await compactCover.click();
    await expect(page).toHaveURL(/\/gallery$/);
    await expect(secondarySlot.getByRole("link")).toHaveCount(0);
    const navigation = page.locator(".mobile-nav");
    if (await navigation.count()) {
      const root = page.locator("html");
      await expect(root).toHaveAttribute("data-mobile-theme", "light");
      await expect(featured).toHaveCSS("background-color", "rgb(34, 34, 34)");
      await expect(featured).toHaveCSS("color", "rgb(245, 245, 245)");
      await expect(todaySurface).toHaveCSS("background-color", "rgb(34, 34, 34)");
      await expect(todaySurface).toHaveCSS("color", "rgb(245, 245, 245)");
      await expect(todaySurface).toHaveCSS("box-shadow", /rgba\(0, 0, 0, 0\.11\).*rgba\(0, 0, 0, 0\.28\)/);
      await expect(galleryBackground).not.toHaveCSS("background-color", raisedFill);
      const lightNavShadow = await navigation.evaluate((nav) => getComputedStyle(nav).boxShadow);
      expect(restingShadow).not.toBe(lightNavShadow);
      await page.emulateMedia({ colorScheme: "dark" });
      await expect(root).toHaveAttribute("data-mobile-theme", "dark");
      const darkNavShadow = await navigation.evaluate((nav) => getComputedStyle(nav).boxShadow);
      await expect(frame).toHaveCSS("box-shadow", darkNavShadow);
      await expect(frame).toHaveCSS("background-color", "rgb(48, 48, 48)");
      await expect(featured).toHaveCSS("background-color", "rgb(245, 245, 245)");
      await expect(featured).toHaveCSS("color", "rgb(34, 34, 34)");
      await expect(galleryBackground).toHaveCSS("background-color", "rgb(28, 28, 28)");
      await expect(idleTile).toHaveCSS("background-color", "rgb(48, 48, 48)");
      await expect(todaySurface).toHaveCSS("background-color", "rgb(245, 245, 245)");
      await expect(todaySurface).toHaveCSS("color", "rgb(34, 34, 34)");
      await expect(idleTile).toHaveCSS("box-shadow", /rgba\(0, 0, 0, 0\.12\).*rgba\(0, 0, 0, 0\.24\)/);
      await expect(todaySurface).toHaveCSS("box-shadow", /rgba\(0, 0, 0, 0\.24\).*rgba\(0, 0, 0, 0\.55\)/);
      await page.emulateMedia({ colorScheme: "light" });
      await expect(frame).toHaveCSS("box-shadow", restingShadow);
    } else {
      await expect(todaySurface).toHaveCSS("background-color", "rgb(245, 245, 245)");
      await expect(todaySurface).toHaveCSS("color", "rgb(34, 34, 34)");
      await expect(featured).toHaveCSS("background-color", "rgb(245, 245, 245)");
      await expect(featured).toHaveCSS("color", "rgb(34, 34, 34)");
      await expect(galleryBackground).toHaveCSS("background-color", "rgb(28, 28, 28)");
      await expect(frame).toHaveCSS("background-color", "rgb(48, 48, 48)");
      await expect(frame).toHaveCSS("box-shadow", /rgba\(0, 0, 0, 0\.12\).*rgba\(0, 0, 0, 0\.24\)/);
    }
    await today.click();
    await page.mouse.move(coverBounds.x, coverBounds.y);
    const dayTile = today.locator(".album-date-view__day-tile");
    const restingBorder = await dayTile.evaluate((tile) => getComputedStyle(tile).borderTopColor);
    if (width === 1280) {
      await idleDay.hover();
      await expect(idleTile).not.toHaveCSS("background-color", raisedFill);
      await expect(idleTile).not.toHaveCSS("border-top-color", raisedFill);
      await today.hover();
      await expect(dayTile).not.toHaveCSS("border-top-color", restingBorder);
    } else {
      await today.hover();
    }
    await page.mouse.down();
    const tileText = await dayTile.evaluate((tile) => getComputedStyle(tile).color);
    await expect(dayTile).toHaveCSS("border-top-color", tileText);
    await expect(dayTile).toHaveCSS("box-shadow", selectedShadow);
    await page.mouse.up();
    await idleDay.hover();
    await page.mouse.down();
    await expect(idleTile).toHaveCSS("box-shadow", dateShadow);
    await expect(idleTile).not.toHaveCSS("border-top-color", raisedFill);
    await page.mouse.move(coverBounds.x, coverBounds.y);
    await page.mouse.up();
    await expect(today).toHaveAttribute("aria-pressed", "true");
    await page.evaluate(() => { document.documentElement.dataset.motion = "on"; });
    if (width === 1280) {
      await featured.hover();
      await expect.poll(() => featured.locator(".icon-button__icon").evaluate((icon) =>
        parseFloat(getComputedStyle(icon).translate))).toBe(4);
    }
    const advance = page.getByRole("button", { name: "Next album" });
    const motionOverlay = page.locator(".album-date-view__motion");
    const motionPreviews = motionOverlay.locator(".album-date-card__preview");
    const mainBounds = (await mainSlot.boundingBox())!;
    const queueBounds = (await secondarySlot.boundingBox())!;
    expect(queueBounds.y + queueBounds.height).toBeLessThanOrEqual(520);
    if (await navigation.count()) expect(queueBounds.y + queueBounds.height).toBeLessThanOrEqual((await navigation.boundingBox())!.y);
    expect((await advance.boundingBox())!.y).toBeGreaterThanOrEqual(queueBounds.y);
    await page.mouse.move(coverBounds.x + 40, coverBounds.y + 20);
    await page.mouse.down();
    await page.mouse.move(coverBounds.x + 100, coverBounds.y + 20, { steps: 5 });
    await page.mouse.up();
    await expect(page).toHaveURL(/\/gallery$/);
    await expect(mainSlot.getByRole("heading", { name: "Mountain weekend" })).toBeVisible();
    const advanceGlyph = advance.locator("svg");
    await advanceGlyph.evaluate((icon) => {
      const animate = icon.animate.bind(icon);
      icon.animate = (frames, options) => {
        icon.setAttribute("data-animated", "true");
        return animate(frames, options);
      };
    });
    await advance.click();
    await expect(advanceGlyph).toHaveAttribute("data-animated", "true");
    await expect(motionPreviews).toHaveCount(2);
    await expect.poll(() => mainSlot.locator('.album-date-card__name [data-slot="swapping-text-in"]').count()).toBeGreaterThan(0);
    await expect(mainSlot.getByRole("heading", { name: "The coast" })).toBeVisible();
    await expect(mainSlot.locator(".album-date-card__owner > .sr-only")).toHaveText("by Jamie");
    await expect(secondarySlot.getByRole("heading", { name: "Third album" })).toBeVisible();
    await expect(motionPreviews).toHaveCount(0);
    expect(await mainSlot.boundingBox()).toEqual(mainBounds);

    const swipeAlbum = async (dy: number) => {
      const x = mainBounds.x + mainBounds.width / 2;
      const y = mainBounds.y + mainBounds.height / 2;
      if (width === 390) {
        const touch = await page.context().newCDPSession(page);
        await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + dy }] });
        await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await touch.detach();
      } else {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x, y + dy, { steps: 6 });
        await page.mouse.up();
      }
    };
    await swipeAlbum(-65);
    await expect(mainSlot.getByRole("heading", { name: "Third album" })).toBeVisible();
    await expect(advance).toHaveCount(0);
    await expect(queueTitle).toHaveCount(0);
    await expect(motionOverlay.locator(".album-date-view__queue-title")).toHaveCount(1);
    await expect(motionOverlay.locator(".album-date-view__advance")).toHaveCount(1);
    await expect(motionPreviews).toHaveCount(0);
    await expect(secondarySlot).toHaveCount(0);
    expect(await mainSlot.boundingBox()).toEqual(mainBounds);
    await swipeAlbum(65);
    await expect(mainSlot.getByRole("heading", { name: "The coast" })).toBeVisible();
    await expect(motionPreviews).toHaveCount(0);
    await expect(queueTitle).toBeVisible();
    await expect(advance).toBeVisible();
    expect(await mainSlot.boundingBox()).toEqual(mainBounds);

    const yesterday = bar.getByRole("button", { name: "Friday, November 20, 2026" });
    await yesterday.click();
    await expect(page.getByRole("link", { name: "Open album City mornings" })).toBeVisible();
    await expect(compact).toHaveCount(0);

    await bar.getByRole("button", { name: "Thursday, November 19, 2026" }).click();
    await expect(mainSlot.getByRole("heading", { name: "Solo album" })).toBeVisible();
    await expect(secondarySlot).toHaveCount(0);
    await expect(queue).toBeVisible();
    expect(await mainSlot.boundingBox()).toEqual(mainBounds);

    const empty = bar.getByRole("button", { name: "Wednesday, November 18, 2026" });
    await expect(empty).not.toHaveAttribute("data-has-albums");
    await empty.click();
    await expect(empty).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("No albums yet")).toBeVisible();

    await days.first().click();
    await expect(days.first()).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBe(0);
    const gutter = await rail.evaluate((element) => parseFloat(getComputedStyle(element).paddingInlineStart));
    expect(Math.abs((await days.first().boundingBox())!.x - bounds.x - gutter)).toBeLessThan(1);
    await expect(days.first().locator(".album-date-view__day-tile")).toHaveCSS("scale", "1");
    await days.last().click();
    await expect(days.last()).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => rail.evaluate((element) =>
      Math.abs(element.scrollWidth - element.clientWidth - element.scrollLeft))).toBeLessThanOrEqual(1);
    const lastBounds = (await days.last().boundingBox())!;
    expect(Math.abs(bounds.x + bounds.width - lastBounds.x - lastBounds.width - gutter)).toBeLessThan(1);
    await expect(days.last().locator(".album-date-view__day-tile")).toHaveCSS("scale", "1");
    expect(feedRequests).toBe(loadedRequests);

    await yesterday.click();
    await advance.click();
    await mainSlot.getByRole("link", { name: "Open album Riverside" }).press("Enter");
    await expect(page).toHaveURL(/\/gallery\/album\/yesterday-b$/);
    await expect(page.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
    if (await navigation.count()) {
      await page.getByRole("banner").getByRole("button", { name: "Back", exact: true }).click();
    } else {
      await page.goBack();
    }
    await expect(page).toHaveURL(/\/gallery$/);
    await expect(yesterday).toHaveAttribute("aria-pressed", "true");
    await expect(mainSlot.getByRole("heading", { name: "Riverside" })).toBeVisible();

    await today.click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: 390 });
    await advance.click();
    await expect(mainSlot.getByRole("heading", { name: "The coast" })).toBeVisible();
    await expect(motionPreviews).toHaveCount(0);
    await expect(mainSlot.locator('[data-slot="swapping-text"]')).toHaveCount(0);
    const resizedMain = (await preview.boundingBox())!;
    expect(resizedMain.height).toBeGreaterThan(16);
    const resizedQueue = (await secondarySlot.boundingBox())!;
    expect(resizedQueue.y).toBeGreaterThan(resizedMain.y + resizedMain.height);
    expect(resizedQueue.y + resizedQueue.height).toBeLessThanOrEqual(390);

    await page.setViewportSize({ width, height: 800 });
    const tallFrame = (await mainSlot.boundingBox())!;
    const tallPreview = (await preview.boundingBox())!;
    expect(tallFrame.y + tallFrame.height - tallPreview.y - tallPreview.height).toBeCloseTo(16, 0);
  });
}

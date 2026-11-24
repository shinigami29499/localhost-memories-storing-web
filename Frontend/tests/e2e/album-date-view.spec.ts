import { expect, test, type Locator } from "@playwright/test";

test("mobile date push keeps frames adjacent and swipes from the cover", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium");
  await page.setViewportSize({ width: 390, height: 520 });
  await page.clock.setFixedTime(new Date("2026-11-21T04:00:00Z"));
  const owner = { id: "viewer", username: "Alex", role: "user", status: "active", createdAt: "" };
  await page.addInitScript((user) => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: { user, accessToken: "test", refreshToken: "test" }, version: 0 }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
  }, owner);
  await page.route(/^https?:\/\/[^/]+\/hubs\//, (route) => route.abort());
  let releaseSecondCover!: () => void;
  const secondCoverReady = new Promise<void>((resolve) => { releaseSecondCover = resolve; });
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/library/album/page") return route.fulfill({ json: { items: [{
      id: "one", name: "One", owner, createdAt: "2026-11-21T03:00:00Z", previewMediaId: "one", mediaCount: 1, isPublic: false,
    }, {
      id: "two", name: "Two", owner: { ...owner, username: "Jamie" }, createdAt: "2026-11-19T03:00:00Z", previewMediaId: "two", mediaCount: 1, isPublic: false,
    }, {
      id: "one-next", name: "Coast", owner, createdAt: "2026-11-21T02:00:00Z", previewMediaId: "one-next", mediaCount: 1, isPublic: false,
    }, {
      id: "two-next", name: "Mountains", owner: { ...owner, username: "Jamie" }, createdAt: "2026-11-19T02:00:00Z", previewMediaId: "two-next", mediaCount: 1, isPublic: false,
    }], hasMore: false } });
    if (path.endsWith("/file")) {
      if (/\/(two|one-next|two-next)\/file$/.test(path)) await secondCoverReady;
      return route.fulfill({ contentType: "image/png", body: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64") });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto("/album");
  const mobile = page.locator(".mobile-albums-page");
  await expect(mobile.locator(".album-date-card--featured img")).toBeVisible();
  const bar = page.getByRole("group", { name: "Album dates" });
  const featuredCard = mobile.locator(".album-date-card--featured:not([inert] *)");
  const compactCard = mobile.locator(".album-date-card--compact:not([inert] *)");
  const caption = ":is(.album-date-card__name, .album-date-card__owner)";
  await expect(compactCard.locator(".album-date-card__text")).toHaveAttribute("data-cover-pending", "true");
  const swaps = [featuredCard, compactCard].map((card) => card.evaluate((element, selector) =>
    new Promise<boolean>((resolve) => {
      const deadline = performance.now() + 3000;
      function sample() {
        const captions = Array.from(element.querySelectorAll(selector));
        const swapping = captions.length === 2 && captions.every((caption) => {
          const incoming = caption.querySelector('[data-slot="swapping-text-in"]');
          return incoming && Number(getComputedStyle(caption).opacity) > 0 &&
            getComputedStyle(incoming).transform !== "none";
        });
        if (swapping || performance.now() >= deadline) resolve(swapping);
        else requestAnimationFrame(sample);
      }
      sample();
    }), caption));
  await featuredCard.evaluate((element) => element.setAttribute("data-test-card", "original"));
  await bar.getByRole("button", { name: "Thursday, November 19, 2026" }).click();
  expect(await Promise.all(swaps)).toEqual([true, true]);
  await expect(mobile.locator("[data-date-push-exit]")).toHaveCount(0);
  await expect(featuredCard).toHaveAttribute("data-test-card", "original");
  await expect(featuredCard.locator(".album-date-card__name")).toContainText("Two");
  await expect(featuredCard.locator('.album-date-card__name [data-slot="swapping-text-out"]').first()).toBeVisible();
  await expect(featuredCard.locator(".album-date-card__name")).toHaveCSS("opacity", "1");
  await expect(featuredCard.locator(".album-date-card__preview[data-cover-loading]")).toBeVisible();
  await expect(featuredCard.locator(".album-date-card__name")).toHaveCSS("opacity", "1");
  releaseSecondCover();
  await bar.getByRole("button", { name: "Saturday, November 21, 2026" }).click();
  await expect(featuredCard).toHaveAttribute("data-test-card", "original");
  const checkPush = async () => {
    const exit = mobile.locator("[data-date-push-exit]");
    await expect(exit).toHaveCount(1);
    const measurements = await mobile.evaluate((root) => {
      const outgoing = root.querySelector<HTMLElement>("[data-date-push-exit]")!;
      const incoming = root.querySelector<HTMLElement>(".album-date-view__body:not([data-date-push-exit])")!;
      const frames = Array.from(incoming.querySelectorAll<HTMLElement>(
        ".album-date-view__main-frame:not([inert]), .album-date-view__sub-frame:not([inert]), .empty-state",
      ));
      const counter = incoming.querySelector(".album-date-view__move-up")!;
      for (const element of [outgoing, ...frames]) {
        const animation = element.getAnimations().find((item) => item.effect instanceof KeyframeEffect && item.effect.getKeyframes().some((frame) => frame.transform))!;
        animation.pause();
        animation.currentTime = 250;
      }
      const a = outgoing.getBoundingClientRect();
      const b = incoming.getBoundingClientRect();
      const offset = new DOMMatrixReadOnly(getComputedStyle(frames[0]).transform).m41;
      const counterX = counter.getBoundingClientRect().x;
      outgoing.getAnimations().forEach((animation) => animation.finish());
      return {
        gap: Math.max(a.left, b.left + offset) - Math.min(a.right, b.right + offset),
        width: Math.abs(a.width - b.width),
        counterX,
        copiedCounter: Boolean(outgoing.querySelector(".album-date-view__move-up")),
      };
    });
    expect(Math.abs(measurements.gap)).toBeLessThan(1);
    expect(measurements.width).toBeLessThan(1);
    expect(measurements.copiedCounter).toBe(false);
    await expect(exit).toHaveCount(0);
    const counter = await mobile.locator(".album-date-view__move-up").boundingBox();
    expect(counter!.x).toBeCloseTo(measurements.counterX);
  };
  await bar.getByRole("button", { name: "Friday, November 20, 2026" }).click();
  await checkPush();
  await expect(mobile.locator(".album-date-view__main-frame, .album-date-view__sub-frame")).toHaveCount(0);
  await expect(mobile.locator(".empty-state")).toBeVisible();
  const empty = mobile.locator(".empty-state");
  await empty.evaluate((element) => element.setAttribute("data-test-empty", "original"));
  await bar.getByRole("button", { name: "Wednesday, November 18, 2026" }).click();
  await expect(mobile.locator("[data-date-push-exit]")).toHaveCount(0);
  await expect(empty).toHaveAttribute("data-test-empty", "original");
  await bar.getByRole("button", { name: "Friday, November 20, 2026" }).click();
  await bar.getByRole("button", { name: "Saturday, November 21, 2026" }).click();
  await checkPush();
  await bar.getByRole("button", { name: "Friday, November 20, 2026" }).click();
  await checkPush();
  await bar.getByRole("button", { name: "Saturday, November 21, 2026" }).click();
  await expect(mobile.locator("[data-date-push-exit]")).toHaveCount(1);
  await featuredCard.evaluate((element) => element.setAttribute("data-test-card", "during-push"));
  await bar.getByRole("button", { name: "Thursday, November 19, 2026" }).click();
  await expect(featuredCard).toHaveAttribute("data-test-card", "during-push");
  await expect(featuredCard.locator('.album-date-card__name [data-slot="swapping-text-out"]').first()).toBeVisible();
  await bar.getByRole("button", { name: "Saturday, November 21, 2026" }).click();
  const image = mobile.locator(".album-date-card--featured img");
  const bounds = (await image.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * .4, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .4 + 85, bounds.y + bounds.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(bar.getByRole("button", { name: "Friday, November 20, 2026" })).toHaveAttribute("aria-pressed", "true");
  await checkPush();
  await bar.getByRole("button", { name: "Saturday, November 21, 2026" }).click();
  await checkPush();
  const cover = (await image.boundingBox())!;
  const touch = await page.context().newCDPSession(page);
  const x = cover.x + cover.width / 2;
  const y = cover.y + cover.height / 2;
  await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let delta = 20; delta <= 100; delta += 20)
    await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + delta, y }] });
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(bar.getByRole("button", { name: "Friday, November 20, 2026" })).toHaveAttribute("aria-pressed", "true");
  await checkPush();
  await touch.detach();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await bar.getByRole("button", { name: "Saturday, November 21, 2026" }).click();
  await expect(mobile.locator("[data-date-push-exit]")).toHaveCount(0);
  await expect(mobile.locator(".album-date-card--featured img")).toBeVisible();
});

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
    let releaseOlderPage!: () => void;
    const olderPageReady = new Promise<void>((resolve) => { releaseOlderPage = resolve; });
    await page.route(/^https?:\/\/[^/]+\/hubs\//, (route) => route.abort());
    await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/library/album/page") {
        feedRequests++;
        if (new URL(route.request().url()).searchParams.has("cursor")) {
          if (width === 390) await olderPageReady;
          return route.fulfill({ json: {
            items: Array.from({ length: 5 }, (_, index) =>
              album(`older-${index}`, "February album", "2024-02-14T04:00:00Z")),
            hasMore: false, nextCursor: null,
          } });
        }
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

    await page.goto("/album");
    const bar = page.getByRole("group", { name: "Album dates" });
    const monthTrigger = bar.getByRole("button", { name: "November 2026" });
    const featured = page.getByRole("link", { name: "Open album Mountain weekend" });
    const compact = page.locator("button.album-date-card--compact:not([inert] *)");
    const today = bar.getByRole("button", { name: "Saturday, November 21, 2026" });
    await expect(today).toHaveAttribute("aria-pressed", "true", { timeout: 15_000 });
    await expect(today).toHaveAttribute("data-has-albums", "true");
    const mobileApp = await page.locator(".mobile-albums-page").count() > 0;
    if (!mobileApp && width === 390) {
      await monthTrigger.tap();
      const sheet = page.getByRole("dialog", { name: "Select date" });
      const panel = sheet.locator("section");
      await expect(sheet.getByRole("grid")).toBeVisible();
      await expect(panel).toHaveCSS("transform", "none");
      const restingBounds = await panel.boundingBox();
      await expect(sheet.getByRole("button", { name: "Done" })).toBeDisabled();
      releaseOlderPage();
      await expect(sheet.getByRole("button", { name: "Done" })).toBeEnabled();
      expect(await panel.boundingBox()).toEqual(restingBounds);
      await page.keyboard.press("Escape");
      await expect(sheet).toBeHidden();
    }
    await expect(featured).toBeVisible();
    await expect(compact).toHaveAttribute("aria-label", "Next album: The coast");
    const pressPreview = compact.locator(".album-date-card__preview");
    await compact.hover();
    await page.mouse.down();
    await expect.poll(() => pressPreview.evaluate((element) => Number(getComputedStyle(element).scale))).toBeCloseTo(1.03, 3);
    await expect(compact).toHaveCSS("scale", /^(1|none)$/);
    await page.mouse.move(1, 1);
    await page.mouse.up();
    await expect.poll(() => pressPreview.evaluate((element) => getComputedStyle(element).scale)).toMatch(/^(1|none)$/);
    await compact.focus();
    await page.keyboard.down("Space");
    await expect.poll(() => pressPreview.evaluate((element) => Number(getComputedStyle(element).scale))).toBeCloseTo(1.03, 3);
    await compact.evaluate((element) => (element as HTMLElement).blur());
    await page.keyboard.up("Space");
    if (width === 390) {
      const bounds = (await compact.boundingBox())!;
      const touch = await page.context().newCDPSession(page);
      await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }] });
      await expect.poll(() => pressPreview.evaluate((element) => Number(getComputedStyle(element).scale))).toBeCloseTo(1.03, 3);
      await touch.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
      await expect.poll(() => pressPreview.evaluate((element) => getComputedStyle(element).scale)).toMatch(/^(1|none)$/);
      await touch.detach();
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await compact.focus();
    await page.keyboard.down("Space");
    expect(await pressPreview.evaluate((element) => element.getAnimations().length)).toBe(0);
    await compact.evaluate((element) => (element as HTMLElement).blur());
    await page.keyboard.up("Space");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(page.locator(".gallery-page__actions")).toHaveCount(0);
    const title = page.getByRole("heading", { name: "Mountain weekend" });
    const featuredOwner = page.locator(".album-date-card--featured .album-date-card__owner");
    const frame = page.getByRole("article").filter({ has: title });
    await expect(frame).toHaveCSS("padding-inline-start", "12px");
    const ownerLabel = mobileApp ? featuredOwner.locator(".sr-only") : featuredOwner;
    await expect(ownerLabel).toHaveText("Private · Alex");
    await expect(frame.getByRole("link", { name: "Open album Mountain weekend" })).toBeVisible();
    await title.hover();
    await expect(title).toHaveCSS("text-decoration-line", "none");
    await title.click();
    await expect(page).toHaveURL(/\/album$/);
    await expect(featured.locator("svg.lucide-send-horizontal")).toHaveCount(1);
    await expect(compact).toBeVisible();
    await expect(page.getByRole("heading", { name: "Discover" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Third album" })).toHaveCount(0);
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
      await touch.detach();
    }

    if (mobileApp) {
      const monthLabel = bar.getByText("November 2026", { exact: true });
      await expect(monthLabel).toBeVisible();
      await expect(monthTrigger).toHaveCount(0);
      await monthLabel.click();
      await expect(page.getByRole("dialog", { name: "Select date" })).toHaveCount(0);
    } else {
      await monthTrigger.click();
      const picker = page.getByRole("dialog", { name: "Select date" });
      const yearField = picker.getByRole("combobox", { name: "Year" });
      const monthField = picker.getByRole("combobox", { name: "Month" });
      const done = picker.getByRole("button", { name: "Done" });
      const singleAlbumDay = picker.getByRole("button", { name: /November 19th, 2026.*1 album/ });
      const occupiedDay = picker.getByRole("button", { name: /November 20th, 2026.*2 albums/ });
      const selectedDay = picker.getByRole("button", { name: /November 21st, 2026, selected/ });
      const outlineStyle = (day: Locator, property: string) => day.evaluate((element, name) =>
        getComputedStyle(element, "::after").getPropertyValue(name), property);
      const centeringError = (option: Locator) => option.evaluate((item) => {
        const popup = item.closest<HTMLElement>(".select-field__popup")!;
        const bounds = item.getBoundingClientRect();
        const viewportCenter = popup.getBoundingClientRect().top + popup.clientTop + popup.clientHeight / 2;
        const ideal = popup.scrollTop + bounds.top + bounds.height / 2 - viewportCenter;
        const clamped = Math.min(popup.scrollHeight - popup.clientHeight, Math.max(0, ideal));
        return Math.abs(popup.scrollTop - clamped);
      });
      const fields = picker.getByRole("combobox");
      await expect(fields.nth(0)).toHaveAccessibleName("Month");
      await expect(fields.nth(1)).toHaveAccessibleName("Year");
      await expect(picker.locator(".album-date-sheet__fields .select-field__label").first())
        .toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(picker.getByRole("grid")).toHaveCount(1);
      await expect(picker.getByRole("button", { name: /November 22nd, 2026/ })).toBeDisabled();
      await expect(done).toHaveClass(/btn--primary/);
      await expect(done).toHaveCSS("border-top-width", "0px");
      const footer = picker.locator("footer");
      await expect(footer).toHaveCSS("border-top-width", "0px");
      await expect(footer).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(footer).toHaveCSS("box-shadow", "none");
      await expect(singleAlbumDay).toHaveCSS("background-color", "rgb(54, 36, 23)");
      await expect(occupiedDay.locator("..")).toHaveClass(/album-date-sheet__heat-2/);
      await expect(occupiedDay).toHaveCSS("background-color", "rgb(111, 94, 84)");
      await expect(occupiedDay).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(singleAlbumDay).toHaveCSS("box-shadow", "none");
      await expect(picker.getByRole("grid")).toHaveCSS("border-spacing", "4px 3px");
      await expect(selectedDay).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect(selectedDay).toHaveCSS("color", "rgb(34, 34, 34)");
      expect(await outlineStyle(selectedDay, "background-image")).toMatch(
        /conic-gradient.*rgb\(59, 130, 246\).*rgb\(168, 85, 247\).*rgb\(236, 72, 153\)/,
      );
      if (width === 1280) {
        await expect(occupiedDay).toHaveCSS("transition-property", "background-color, color");
        await occupiedDay.hover();
        await expect(occupiedDay).toHaveCSS("background-color", /color\(srgb 0\.503/);
        await expect(occupiedDay).toHaveCSS("color", "rgb(255, 255, 255)");
        await page.mouse.move(1, 1);
        await occupiedDay.focus();
        await expect(occupiedDay).toHaveCSS("background-color", "rgb(111, 94, 84)");
        await occupiedDay.click();
        await expect(occupiedDay.locator("..")).toHaveAttribute("aria-selected", "true");
        await expect(picker.getByRole("button", { name: /Today.*November 21st, 2026/ }))
          .toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
        await expect(occupiedDay).toHaveCSS("background-color", /color\(srgb 0\.503/);
        expect(await outlineStyle(occupiedDay, "animation-name")).toBe("album-date-outline-spin");
        const angle = await outlineStyle(occupiedDay, "--album-date-outline-angle");
        await expect.poll(() => outlineStyle(occupiedDay, "--album-date-outline-angle")).not.toBe(angle);
        await page.emulateMedia({ reducedMotion: "reduce" });
        await expect(occupiedDay).toHaveCSS("transition-duration", "0s");
        expect(await outlineStyle(occupiedDay, "animation-name")).toBe("none");
        expect(await outlineStyle(occupiedDay, "background-image")).toMatch(/^conic-gradient/);
        await page.emulateMedia({ reducedMotion: "no-preference" });
      }
      await expect(yearField).toHaveCSS("box-shadow", /inset.*inset/);
      await yearField.click();
      await expect(yearField).toHaveCSS("box-shadow", /-1px 4px.*4px 8px/);
      await expect(yearField).not.toHaveCSS("box-shadow", /inset/);
      await expect(yearField).toHaveCSS("background-color", "rgb(255, 255, 255)");
      const years = picker.getByRole("option").filter({ hasText: /^\d{4}/ });
      await expect(years).toHaveCount(7);
      await expect(years.first()).toContainText("2020");
      await expect(years.last()).toContainText("2026");
      await expect.poll(() => centeringError(years.last())).toBeLessThan(2);
      await expect(years.filter({ hasText: "2024" }).getByRole("img", { name: "Has albums" })).toBeVisible();
      await expect(years.filter({ hasText: "2025" }).getByRole("img")).toHaveCount(0);
      await years.filter({ hasText: "2024" }).click();
      await monthField.click();
      const months = picker.getByRole("option").filter({ hasNotText: /^\d{4}/ });
      await expect(months).toHaveCount(12);
      await expect(months.first()).toContainText("January");
      const june = months.filter({ hasText: /^June/ });
      await june.click();
      await monthField.click();
      await expect(june).toHaveAttribute("aria-selected", "true");
      await expect.poll(() => centeringError(june)).toBeLessThan(2);
      await months.filter({ hasText: "February" }).click();
      const busiestDay = picker.getByRole("button", { name: /February 14th, 2024, 5 albums/ });
      await expect(busiestDay.locator("..")).toHaveClass(/album-date-sheet__heat-3/);
      await expect(busiestDay).toHaveCSS("background-color", "rgb(241, 218, 191)");
      await expect(picker.getByRole("button", { name: /previous month/i })).toBeEnabled();
      await yearField.click();
      await years.filter({ hasText: "2026" }).click();
      await monthField.click();
      await expect(months).toHaveCount(12);
      await expect(months.last()).toContainText("December");
      await months.last().click();
      await expect(picker.getByRole("grid", { name: "December 2026" })).toBeVisible();
      await expect(picker.getByRole("button", { name: /December 1st, 2026/ })).toBeDisabled();
      await expect(picker.getByRole("button", { name: /next month/i })).toBeDisabled();
      await picker.getByRole("button", { name: /previous month/i }).click();
      await picker.getByRole("button", { name: /previous month/i }).click();
      await picker.getByRole("button", { name: "Saturday, October 31st, 2026, 1 album" }).click();
      await expect(picker.getByRole("gridcell", { selected: true })).toHaveCount(1);
      await expect(bar.locator(".album-date-view__month-trigger")).toHaveText("November 2026");
      await done.click();
      await expect(picker).toBeHidden();
      await expect(bar.getByRole("button", { name: "October 2026" })).toBeFocused();
      await expect(page.getByRole("link", { name: "Open album October album" })).toBeVisible();
      await bar.getByRole("button", { name: "October 2026" }).click();
      await picker.getByRole("button", { name: /next month/i }).click();
      await picker.getByRole("button", { name: /November 21st, 2026, 3 albums/ }).click();
      await done.click();
      await expect(today).toHaveAttribute("aria-pressed", "true");
      await monthTrigger.click();
      await picker.locator(".album-date-sheet__scrim").click({ position: { x: 4, y: 4 } });
      await expect(picker).toBeHidden();
      if (width === 390) {
        await monthTrigger.click();
        const header = picker.locator("header");
        await expect(picker.locator("section")).toHaveCSS("transform", "none");
        const box = (await header.boundingBox())!;
        const touch = await page.context().newCDPSession(page);
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        for (let offset = 20; offset <= 100; offset += 20) {
          await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + offset }] });
        }
        await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await expect(picker).toBeHidden();
        await touch.detach();
      }
    }
    const loadedRequests = feedRequests;

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

    const mainSlot = page.locator("article.album-date-card--featured:not([inert] *)");
    const secondarySlot = compact;
    const queue = page.locator(".album-date-view__queue");
    const cover = mainSlot.locator("img");
    const compactCover = secondarySlot.locator("img");
    await expect(secondarySlot.locator(".album-date-card__name")).toHaveCSS("font-size", mobileApp ? "13.5px" : "12px");
    await expect(secondarySlot.locator(".album-date-card__owner")).toHaveCSS("font-size", mobileApp ? "9.75px" : "10.5px");
    await secondarySlot.hover();
    await expect(secondarySlot.locator(".album-date-card__text")).toHaveCSS("text-decoration-line", "none");
    const preview = mainSlot.locator(".album-date-card__preview");
    const compactPreview = secondarySlot.locator(".album-date-card__preview");
    const coverBounds = (await cover.boundingBox())!;
    const compactCoverBounds = (await compactCover.boundingBox())!;
    expect(coverBounds.width / coverBounds.height).toBeCloseTo(compactCoverBounds.width / compactCoverBounds.height);
    expect(coverBounds.width / coverBounds.height).toBeCloseTo(4 / 3);
    await expect(preview).toHaveCSS("box-shadow", "none");
    await expect(compactPreview).toHaveCSS("box-shadow", "none");
    await expect(page.locator(".album-date-view__advance")).toHaveCount(0);
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
    await expect(page).toHaveURL(/\/album$/);
    await expect(secondarySlot).toHaveAttribute("aria-label", "Next album: The coast");
    const navigation = page.locator(".mobile-menu-bar");
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
    const motionOverlay = page.locator(".album-date-view__motion");
    const motionPreviews = motionOverlay.locator(".album-date-card__preview");
    const mainBounds = (await mainSlot.boundingBox())!;
    const queueBounds = (await secondarySlot.boundingBox())!;
    expect(queueBounds.y + queueBounds.height).toBeLessThanOrEqual(520);
    if (await navigation.count()) expect(queueBounds.y + queueBounds.height).toBeLessThanOrEqual((await navigation.boundingBox())!.y);
    await page.mouse.move(coverBounds.x + 40, coverBounds.y + 20);
    await page.mouse.down();
    await page.mouse.move(coverBounds.x + (mobileApp ? -20 : 100), coverBounds.y + 20, { steps: 5 });
    await page.mouse.up();
    await expect(page).toHaveURL(/\/album$/);
    await expect(mainSlot.getByRole("heading", { name: "Mountain weekend" })).toBeVisible();
    await compactCover.click();
    await expect(motionPreviews).toHaveCount(2);
    await expect(motionOverlay.locator(".album-date-card__text")).toHaveCount(mobileApp ? 0 : 2);
    if (mobileApp) {
      for (const card of [mainSlot, secondarySlot]) {
        for (const label of [".album-date-card__name", ".album-date-card__owner"]) {
          await expect(card.locator(`${label} [data-slot="swapping-text-out"]`).first()).toBeVisible();
          await expect(card.locator(`${label} [data-slot="swapping-text-in"]`).first()).toBeVisible();
        }
        await expect(card.locator(".album-date-card__text")).toHaveCSS("opacity", "1");
      }
    }
    const transition = await motionOverlay.evaluate((overlay, mobile) => {
      const moving = Array.from(overlay.querySelectorAll<HTMLElement>(".album-date-card__preview"))
        .find((cover) => cover.style.zIndex === "1")!;
      const resize = moving.getAnimations()[0];
      const fadingSelector = mobile ? ".album-date-card--compact .album-date-card__preview" : ".album-date-card--featured .album-date-card__text";
      const incoming = overlay.parentElement!.querySelector(fadingSelector)!;
      const fade = incoming.getAnimations().find((animation) =>
        animation.effect instanceof KeyframeEffect && animation.effect.getKeyframes().some((keyframe) => "opacity" in keyframe))!;
      const sample = (time: number) => {
        resize.currentTime = time;
        fade.currentTime = time;
        return [moving.getBoundingClientRect().width, Number(getComputedStyle(incoming).opacity)];
      };
      return [sample(0), sample(190), sample(360)];
    }, mobileApp);
    const [[startWidth, startOpacity], [middleWidth, middleOpacity], [endWidth, endOpacity]] = transition;
    expect(middleWidth).toBeGreaterThan(Math.min(startWidth, endWidth));
    expect(middleWidth).toBeLessThan(Math.max(startWidth, endWidth));
    expect([startOpacity, endOpacity]).toEqual([0, 1]);
    expect(middleOpacity).toBeGreaterThan(0);
    expect(middleOpacity).toBeLessThan(1);
    await expect(mainSlot.getByRole("heading", { name: "The coast" })).toBeVisible();
    await expect(ownerLabel).toHaveText("Private · Jamie");
    await expect(secondarySlot).toHaveAttribute("aria-label", "Next album: Third album");
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
        await page.keyboard.press(dy < 0 ? "ArrowUp" : "ArrowDown");
      }
    };
    await swipeAlbum(-65);
    await expect(mainSlot.getByRole("heading", { name: "Third album" })).toBeVisible();
    await expect(page.locator(".album-date-view__advance")).toHaveCount(0);
    await expect(queueTitle).toHaveCount(0);
    await expect(motionOverlay.locator(".album-date-view__queue-title")).toHaveCount(mobileApp ? 0 : 1);
    await expect(motionOverlay.locator(".album-date-card__text")).toHaveCount(mobileApp ? 0 : 2);
    await expect(motionPreviews).toHaveCount(0);
    await expect(secondarySlot).toHaveCount(0);
    await expect(queue.locator(".album-date-view__sub-frame")).toHaveCount(0);
    expect(await mainSlot.boundingBox()).toEqual(mainBounds);
    await swipeAlbum(65);
    await expect(mainSlot.getByRole("heading", { name: "The coast" })).toBeVisible();
    await expect(motionPreviews).toHaveCount(0);
    await expect(queueTitle).toBeVisible();
    await compact.locator(".album-date-card__text").click();
    await expect(mainSlot.getByRole("heading", { name: "Third album" })).toBeVisible();
    expect(await mainSlot.boundingBox()).toEqual(mainBounds);
    if (mobileApp) {
      await today.click();
      await expect(mainSlot.getByRole("heading", { name: "Mountain weekend" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Move up" })).toHaveCount(0);
      const x = mainBounds.x + mainBounds.width / 2;
      const y = mainBounds.y + mainBounds.height / 2;
      for (const [dx, name] of [[65, "City mornings"], [-65, "Mountain weekend"]] as const) {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + dx, y, { steps: 5 });
        await page.mouse.up();
        await expect(mainSlot.getByRole("heading", { name })).toBeVisible();
      }
      if (width === 390) {
        const touch = await page.context().newCDPSession(page);
        const subBounds = (await secondarySlot.boundingBox())!;
        const x = subBounds.x + subBounds.width / 2;
        const y = subBounds.y + subBounds.height / 2;
        await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        for (let dx = 20; dx <= 80; dx += 20) {
          await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + dx, y }] });
        }
        await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await expect(mainSlot.getByRole("heading", { name: "City mornings" })).toBeVisible();
        await touch.detach();
      }
    }

    const yesterday = bar.getByRole("button", { name: "Friday, November 20, 2026" });
    await yesterday.click();
    await expect(page.getByRole("link", { name: "Open album City mornings" })).toBeVisible();
    await expect(compact).toHaveAttribute("aria-label", "Next album: Riverside");

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
    const emptyState = page.locator(".album-date-view__body > .empty-state");
    const emptyFrameHeight = (await emptyState.boundingBox())!.height;
    const stageHeight = (await page.locator(".album-date-view__body").boundingBox())!.height;
    expect(emptyFrameHeight).toBeLessThan(stageHeight);

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
    await compact.click();
    await mainSlot.getByRole("link", { name: "Open album Riverside" }).press("Enter");
    await expect(page).toHaveURL(/\/album\/yesterday-b$/);
    if (await navigation.count()) {
      await expect(page.getByRole("button", { name: "Add media", exact: true })).toHaveCount(0);
      await page.getByRole("banner").getByRole("button", { name: "Back", exact: true }).click();
    } else {
      await expect(page.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
      await page.goBack();
    }
    await expect(page).toHaveURL(/\/album$/);
    await expect(yesterday).toHaveAttribute("aria-pressed", "true");
    await expect(mainSlot.getByRole("heading", { name: "Riverside" })).toBeVisible();

    await today.click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: 390 });
    await compact.click();
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
    expect(tallFrame.y + tallFrame.height - tallPreview.y - tallPreview.height).toBeCloseTo(12, 0);
  });
}

test.describe("mobile album detail preview", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 670 } });

  test("hides the menu and swipes through album images", async ({ page }) => {
    const createdAt = "2026-11-21T04:00:00Z";
    await page.clock.setFixedTime(new Date(createdAt));
    const owner = { id: "viewer", username: "Alex", role: "user", status: "active", createdAt };
    const album = { id: "riverside", name: "Riverside", owner, createdAt, isPublic: true,
      previewMediaId: "custom-cover", caption: "Hidden album caption", imageCount: 24, videoCount: 1, mediaCount: 25 };
    const photos = Array.from({ length: 24 }, (_, index) => {
      const id = index === 0 ? "river" : index === 1 ? "bridge" : `photo-${index + 1}`;
      return { id, mediaKind: "image", originalFilename: id + ".png", createdAt };
    });
    await page.addInitScript((user) => {
      const startTransition = document.startViewTransition.bind(document);
      document.startViewTransition = (update) => {
        const transition = startTransition(update);
        void transition.ready.then(() => {
          const root = document.documentElement;
          root.dataset.testAlbumTransitions = String(Number(root.dataset.testAlbumTransitions ?? 0) + 1);
        }, () => {});
        return transition;
      };
      localStorage.setItem("shinigacim-auth", JSON.stringify({
        state: { user, accessToken: "test", refreshToken: "test" }, version: 0,
      }));
      localStorage.setItem("shinigacim.animations-enabled", "true");
    }, owner);
    await page.route(/^https?:\/\/[^/]+\/hubs\//, (route) => route.abort());
    await page.route(/^https?:\/\/[^/]+\/api\//, (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/library/album/page") return route.fulfill({ json: { items: [album], hasMore: false } });
      if (url.pathname === "/api/library/album/riverside") return route.fulfill({ json: album });
      if (url.pathname === "/api/library/album/riverside/media") {
        if (url.searchParams.get("mediaKind") !== "image") return route.abort();
        const offset = Number(url.searchParams.get("offset"));
        return route.fulfill({ json: { items: photos.slice(offset, offset + 20), offset, total: photos.length } });
      }
      if (url.pathname.endsWith("/file")) return route.fulfill({ contentType: "image/png", body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64",
      ) });
      return route.fulfill({ json: [] });
    });

    await page.goto("/album");
    const menu = page.locator(".mobile-bottom-slot");
    const open = page.getByRole("link", { name: "Open album Riverside" });
    await open.waitFor();
    test.skip(await menu.count() === 0, "Mobile app only");
    await open.click();
    await expect(page.getByRole("heading", { name: "Riverside", exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-test-album-transitions", "1");
    await expect(page.locator(".mobile-album-detail__byline")).toHaveText("Public · Alex");
    await expect(page.locator(".mobile-album-detail__counts")).toContainText("Images 24");
    await expect(page.locator(".mobile-album-detail__counts")).toContainText("Videos 1");
    await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add media", exact: true })).toHaveCount(0);
    await expect(page.getByText("Hidden album caption")).toHaveCount(0);
    await expect(page.locator(".album-page__grid")).toHaveCount(0);
    await expect(menu).toHaveAttribute("inert", "");
    await expect.poll(() => menu.evaluate((node) => node.getBoundingClientRect().top >= innerHeight)).toBe(true);

    const carousel = page.locator(".mobile-album-carousel");
    const dots = carousel.locator(".mobile-album-carousel__dots");
    const slots = dots.locator("span");
    await expect(slots).toHaveCount(5);
    await expect(slots.nth(0)).toHaveAttribute("data-active", "true");
    await expect(dots).toHaveCSS("left", "12px");
    await expect(dots).toHaveCSS("backdrop-filter", "none");
    expect(await dots.evaluate((node) => getComputedStyle(node, "::before").backdropFilter)).toBe("blur(8px)");
    expect(await dots.evaluate((node) => getComputedStyle(node, "::before").backgroundColor)).toMatch(/\/ 0\.25\)$/);
    await page.emulateMedia({ colorScheme: "light" });
    await expect(slots.nth(0)).toHaveCSS("background-color", "rgb(34, 34, 34)");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(slots.nth(0)).toHaveCSS("background-color", "rgb(245, 245, 245)");
    const first = carousel.getByRole("img", { name: "river.png" });
    await expect(first).toBeVisible();
    await first.dblclick();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const track = carousel.locator(".mobile-album-carousel__track");
    await track.press("ArrowRight");
    await expect(carousel.getByRole("img", { name: "bridge.png" })).toBeVisible();
    await expect(carousel.locator(".mobile-album-carousel__dots span").nth(1)).toHaveAttribute("data-active", "true");
    await expect.poll(() => track.evaluate((node) => Math.abs(node.clientWidth - node.scrollLeft))).toBeLessThan(2);
    const bounds = (await track.boundingBox())!;
    const touch = await page.context().newCDPSession(page);
    const x = bounds.x + bounds.width * .1;
    const y = bounds.y + bounds.height / 2;
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (const fraction of [.1, .25, .4, .55, .7, .8]) {
      const offset = fraction * bounds.width;
      await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + offset, y }] });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    }
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(first).toBeVisible();
    await touch.detach();

    const position = carousel.locator("[aria-live]");
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (let current = 2; current <= 24; current++) {
      if (current === 4) await page.emulateMedia({ reducedMotion: "no-preference" });
      if (current === 21) await expect(carousel.locator(".mobile-album-carousel__slide")).toHaveCount(24);
      await track.press("ArrowRight");
      await expect(position).toHaveText(`Media ${current} of 24`);
      const slot = current <= 3 ? current - 1 : current <= 22 ? 2 : current - 20;
      await expect(slots.nth(slot)).toHaveAttribute("data-active", "true");
      if (current === 4) {
        expect(await slots.evaluateAll((nodes) => nodes.flatMap((node) => node.getAnimations()))).toHaveLength(0);
        await page.emulateMedia({ reducedMotion: "reduce" });
      }
    }
    await expect(carousel.getByRole("img", { name: "photo-24.png" })).toBeVisible();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(open).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-test-album-transitions", "2");
    await expect.poll(() => menu.evaluate((node) => node.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
  });
});

test("mobile album center Add button preserves the queue and Move up returns to the first album", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.clock.setFixedTime(new Date("2026-11-21T04:00:00Z"));
  const owner = { id: "viewer", username: "Alex", role: "user", status: "active", createdAt: "" };
  await page.addInitScript((user) => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({
      state: { user, accessToken: "test", refreshToken: "test" }, version: 0,
    }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
  }, owner);
  await page.route(/^https?:\/\/[^/]+\/hubs\//, (route) => route.abort());
  await page.route(/^https?:\/\/[^/]+\/api\//, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/library/album/page") {
      return route.fulfill({ json: { items: [
        { id: "first", name: "First", owner, createdAt: "2026-11-21T03:00:00Z", mediaCount: 0, isPublic: false },
        { id: "second", name: "Second", owner, createdAt: "2026-11-21T02:00:00Z", mediaCount: 0, isPublic: false },
        { id: "third", name: "Third", owner, createdAt: "2026-11-21T01:00:00Z", mediaCount: 0, isPublic: false },
      ], hasMore: false } });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto("/album");
  await page.locator(".mobile-albums-page, .album-page").waitFor();
  const mobile = page.locator(".mobile-albums-page");
  test.skip(await mobile.count() === 0, "Mobile presentation only");
  const create = page.getByRole("button", { name: "Add album", exact: true });
  const pageTitle = page.getByRole("banner").getByRole("heading", { name: "Album" }).locator(".mobile-page-title");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation.getByRole("button", { name: "Add album" })).toHaveCount(1);
  const moveUp = page.locator(".album-date-view__move-up");
  const arrow = moveUp.locator(".album-date-view__move-up-arrow");
  const progress = moveUp.locator(".album-date-view__move-up-progress");
  const count = moveUp.locator(".album-date-view__move-up-count");
  const animatedCount = count.locator('[data-slot="sliding-number"] > .sr-only, [data-slot="swapping-text"] > .sr-only');
  const digitOffset = (digit: string) => count.locator('[data-slot="sliding-number-display"]').filter({ hasText: digit })
    .evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m42);
  const first = page.getByRole("heading", { name: "First", exact: true });
  await expect(create).toBeVisible();
  await expect(create.locator("svg")).toHaveCSS("width", "24px");
  await expect(create.locator("svg line")).toHaveCount(2);
  for (const gradient of [pageTitle, create]) {
    await expect(gradient).toHaveCSS("animation-name", "mobile-gradient-flow");
    await expect(gradient).toHaveCSS("animation-timing-function", "linear");
    await expect(gradient).toHaveCSS("background-size", "200% 100%");
    await expect(gradient).toHaveCSS("background-repeat", "repeat-x");
    const samples = await gradient.evaluate((element) => {
      const flow = element.getAnimations().find((animation) =>
        animation instanceof CSSAnimation && animation.animationName === "mobile-gradient-flow")!;
      const sample = (time: number) => {
        flow.currentTime = time;
        return parseFloat(getComputedStyle(element).backgroundPositionX);
      };
      return [sample(0), sample(1000), sample(2000), sample(4000)];
    });
    expect(samples).toEqual([0, 50, 100, 0]);
  }
  await expect(create).toHaveCSS("background-origin", "border-box");
  const buttonGradient = await create.evaluate((element) => getComputedStyle(element).backgroundImage);
  const plusLine = create.locator("svg line").last();
  const transform = () => plusLine.evaluate((line) => getComputedStyle(line).transform);
  const initialTransform = await transform();
  await create.hover({ position: { x: 6, y: 28 } });
  await expect.poll(transform).not.toBe(initialTransform);
  await expect(create).toHaveCSS("background-image", buttonGradient);
  await expect(create).toHaveCSS("animation-name", "mobile-gradient-flow");
  await page.mouse.move(1, 1);
  await expect.poll(transform).toBe(initialTransform);
  await page.evaluate(() => { document.documentElement.dataset.motion = "off"; });
  for (const gradient of [pageTitle, create]) {
    await expect(gradient).toHaveCSS("animation-name", "mobile-gradient-flow");
    await expect(gradient).toHaveCSS("animation-duration", "4s");
  }
  await page.evaluate(() => { document.documentElement.dataset.motion = "on"; });
  await expect(moveUp).toBeVisible();
  await expect(animatedCount).toHaveText(["1", "of 3"]);
  await expect.poll(() => digitOffset("2")).toBeGreaterThan(0);
  await expect(arrow).toHaveCSS("opacity", "0");
  const button = (await create.boundingBox())!;
  const queue = (await page.locator(".album-date-view__queue").boundingBox())!;
  const nav = (await navigation.boundingBox())!;
  expect(button.x + button.width / 2).toBeCloseTo(nav.x + nav.width / 2, 0);
  expect(nav.height).toBe(56);
  expect(button.width).toBe(nav.height);
  expect(button.height).toBe(nav.height);
  expect(button.y).toBeCloseTo(nav.y, 0);
  await expect(create).toHaveText("");
  const month = page.locator(".album-date-view__month-label");
  await expect(month).toHaveText("November 2026");
  await month.click();
  await expect(page.getByRole("dialog", { name: "Select date" })).toHaveCount(0);
  for (const colorScheme of ["dark", "light"] as const) {
    await page.emulateMedia({ colorScheme });
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", colorScheme);
    await expect(pageTitle).toHaveCSS("background-image", /linear-gradient.*rgb\(59, 130, 246\).*rgb\(236, 72, 153\)/);
    await expect(create).toHaveCSS("background-image", /linear-gradient.*rgb\(147, 51, 234\).*rgb\(190, 24, 93\)/);
    await expect(create).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(create).toHaveCSS("border-radius", "50%");
    const buttonShadow = colorScheme === "light"
      ? /rgba\(0, 0, 0, 0\.1\).*rgba\(0, 0, 0, 0\.2\)/
      : await navigation.evaluate((element) => getComputedStyle(element).boxShadow);
    await expect(create).toHaveCSS("box-shadow", buttonShadow);
  }
  await page.getByRole("button", { name: "Next album: Second" }).click();
  await expect(animatedCount).toHaveText(["2", "of 3"]);
  await expect.poll(async () => Math.abs(await digitOffset("2"))).toBeLessThan(0.5);
  await expect(moveUp).toHaveAccessibleDescription("2 of 3");
  expect(Number(await progress.getAttribute("stroke-dashoffset"))).toBeCloseTo(1 / 3);
  await expect(progress).toHaveCSS("transition-property", "stroke-dashoffset");
  const [segment, gap] = (await moveUp.locator("mask circle").getAttribute("stroke-dasharray"))!.split(" ").map(Number);
  expect(gap).toBeGreaterThan(0);
  expect(segment + gap).toBeCloseTo(1 / 3);
  await expect(moveUp).toHaveCSS("width", "64px");
  await expect(moveUp).toHaveCSS("height", "64px");
  const menuLabelSize = await navigation.getByRole("link", { name: "Album" })
    .evaluate((tab) => getComputedStyle(tab).fontSize);
  await expect(count).toHaveCSS("font-size", menuLabelSize);
  await expect(arrow).toHaveCSS("width", "28px");
  await expect(moveUp).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(moveUp).toHaveCSS("box-shadow", "none");
  await expect(progress).toHaveCSS("stroke", "rgb(0, 0, 0)");
  await expect(count.locator(":scope > span").last()).toHaveCSS("color", "rgb(75, 75, 75)");
  await page.getByRole("button", { name: "Next album: Third" }).click();
  await expect(animatedCount).toHaveText(["3", "of 3"]);
  await expect(progress).toHaveAttribute("stroke-dashoffset", "0");
  await expect.poll(() => digitOffset("2")).toBeLessThan(-5);
  await moveUp.press("ArrowDown");
  await expect(animatedCount).toHaveText(["2", "of 3"]);
  await expect.poll(async () => Math.abs(await digitOffset("2"))).toBeLessThan(0.5);
  await moveUp.press("ArrowUp");
  await expect(animatedCount).toHaveText(["3", "of 3"]);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(progress).toHaveCSS("stroke", "rgb(255, 255, 255)");
  await expect(moveUp).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(moveUp).toHaveCSS("box-shadow", "none");
  await expect(count.locator(":scope > span").last()).toHaveCSS("color", "rgb(205, 205, 205)");
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 320, height: 390 });
  await mobile.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(moveUp).toBeInViewport({ ratio: 1 });
  const moveUpBounds = (await moveUp.boundingBox())!;
  expect(moveUpBounds.y + moveUpBounds.height).toBeLessThan((await navigation.boundingBox())!.y);
  await page.setViewportSize({ width: 390, height: 800 });
  const third = page.getByRole("heading", { name: "Third", exact: true });
  await moveUp.click();
  await expect(moveUp).toHaveAccessibleName("Move up");
  await expect(third).toBeVisible();
  await expect(arrow).toHaveCSS("transition-property", "opacity");
  await expect(arrow).toHaveCSS("opacity", "1");
  await expect(count).toHaveCSS("opacity", "0");
  await expect(moveUp).toHaveAccessibleName("Show Move up");
  await expect(arrow).toHaveCSS("opacity", "0");
  await expect(count).toHaveCSS("opacity", "1");
  await expect(third).toBeVisible();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(pageTitle).toHaveCSS("animation-name", "none");
  await expect(create).toHaveCSS("animation-name", "none");
  await expect(create).toHaveCSS("background-image", buttonGradient);
  await create.hover({ position: { x: 6, y: 28 } });
  await expect.poll(transform).toBe(initialTransform);
  await expect(progress).toHaveCSS("transition-duration", "0s");
  await expect(arrow).toHaveCSS("transition-duration", "0s");
  await expect(count.locator('[data-slot="sliding-number"]')).toHaveCount(0);
  await moveUp.click();
  await expect(third).toBeVisible();
  await moveUp.click();
  await expect(first).toBeVisible();
  await expect(moveUp).toBeVisible();
  await expect(count).toHaveText("1 of 3");
  await expect(moveUp).toHaveAccessibleName("Show Move up");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(await page.locator(".album-date-view__queue").boundingBox()).toEqual(queue);
  for (const height of [520, 390]) {
    await page.setViewportSize({ width: 390, height });
    const preview = (await page.locator(".album-date-card--featured .album-date-card__preview").boundingBox())!;
    expect(preview.height, `preview height at ${height}px`).toBeGreaterThan(16);
    const beforeScroll = await create.boundingBox();
    await mobile.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    expect(await create.boundingBox()).toEqual(beforeScroll);
    await expect(create).toBeInViewport();
  }
  await page.setViewportSize({ width: 390, height: 800 });
  await create.hover();
  await page.mouse.down();
  await expect(create).toHaveCSS("background-image", buttonGradient);
  await expect.poll(() => create.evaluate((element) =>
    element.getAnimations().some((animation) => animation.effect instanceof KeyframeEffect && animation.effect.getKeyframes().some((frame) => Number(frame.scale) === 0.97)))).toBe(true);
  await expect.poll(() => create.evaluate((element) => getComputedStyle(element).scale)).toBe("0.97");
  await page.mouse.move(1, 1);
  await page.mouse.up();
  await expect.poll(() => create.evaluate((element) =>
    element.getAnimations().some((animation) => animation.playbackRate < 0))).toBe(true);
  await expect.poll(() => create.evaluate((element) => getComputedStyle(element).scale)).toMatch(/^(1|none)$/);
  await create.click();
  const dialog = page.getByRole("dialog", { name: "New album" });
  await expect(dialog).toBeVisible();
  await page.goBack();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/album$/);
  await expect(create).toBeFocused();
  await create.click();
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Wednesday, November 18, 2026" }).click();
  await expect(create).toHaveCount(1);
});

test("mobile album covers and text leave their placeholders independently", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const owner = { id: "viewer", username: "Alex", role: "user", status: "active", createdAt: "" };
  await page.addInitScript((user) => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({
      state: { user, accessToken: "test", refreshToken: "test" }, version: 0,
    }));
  }, owner);
  const albums = ["first", "second"].map((id) => ({
    id, name: id, owner, createdAt: new Date().toISOString(), previewMediaId: id, mediaCount: 1, isPublic: false,
  }));
  let releaseFeatured!: () => void;
  let releaseNext!: () => void;
  const featuredResponse = new Promise<void>((resolve) => { releaseFeatured = resolve; });
  const nextResponse = new Promise<void>((resolve) => { releaseNext = resolve; });
  await page.route(/^https?:\/\/[^/]+\/hubs\//, (route) => route.abort());
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/library/album/page") return route.fulfill({ json: { items: albums, hasMore: false } });
    if (path.endsWith("/first/file")) {
      await featuredResponse;
      return route.fulfill({
        contentType: "image/png",
        body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64"),
      });
    }
    if (path.endsWith("/second/file")) {
      await nextResponse;
      return route.fulfill({ status: 404 });
    }
    return route.fulfill({ json: [] });
  });

  await page.goto("/album", { waitUntil: "domcontentloaded" });
  const mobile = page.locator(".mobile-albums-page");
  await page.locator(".mobile-albums-page, .album-page").waitFor();
  test.skip(await mobile.count() === 0, "Mobile presentation only");
  const featured = mobile.locator("article.album-date-card--featured");
  const next = mobile.locator("button.album-date-card--compact");
  try {
    for (const card of [featured, next]) {
      await expect(card.locator(".album-date-card__text-placeholder")).toBeVisible();
      await expect(card.locator(".album-date-card__preview[data-cover-loading] .album-date-card__cover-icon")).toBeVisible();
      await expect(card.locator(".album-date-card__name")).toHaveCSS("opacity", "0");
      await expect(card.locator(".album-date-card__owner")).toHaveCSS("opacity", "0");
      await expect(card.locator("img")).toHaveCSS("opacity", "0");
    }
    releaseFeatured();
    await expect(featured.locator(".album-date-card__text-placeholder")).toHaveCount(0);
    await expect(featured.locator("img")).toHaveCSS("opacity", "1");
    await expect(featured.locator(".album-date-card__name")).toHaveCSS("opacity", "1");
    await expect(next.locator(".album-date-card__text-placeholder")).toBeVisible();
    releaseNext();
    await expect(next.locator(".album-date-card__text-placeholder")).toHaveCount(0);
    await expect(next.locator(".album-date-card__owner")).toHaveCSS("opacity", "1");
    await expect(next.locator(".album-date-card__preview[data-empty] .album-date-card__cover-icon")).toBeVisible();
  } finally {
    releaseFeatured();
    releaseNext();
  }
});

test("both mobile album placeholders fade out on an empty result", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const owner = { id: "viewer", username: "Alex", role: "user", status: "active", createdAt: "" };
  await page.addInitScript((user) => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({
      state: { user, accessToken: "test", refreshToken: "test" }, version: 0,
    }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
  }, owner);
  let releaseResponse!: () => void;
  const responseReady = new Promise<void>((resolve) => { releaseResponse = resolve; });
  await page.route(/^https?:\/\/[^/]+\/hubs\//, (route) => route.abort());
  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/library/album/page") {
      await responseReady;
      return route.fulfill({ json: { items: [], hasMore: false } });
    }
    return route.fulfill({ json: [] });
  });

  await page.goto("/album");
  const mobile = page.locator(".mobile-albums-page");
  const placeholders = mobile.locator(".album-date-card--placeholder");
  await expect(placeholders).toHaveCount(2);
  for (const placeholder of await placeholders.all()) {
    await expect(placeholder.locator(".album-date-card__cover-icon")).toBeVisible();
  }
  const fade = mobile.evaluate((element) => new Promise<number>((resolve) => {
    const deadline = performance.now() + 1_500;
    function sample() {
      const fading = Array.from(element.querySelectorAll("[inert] > .album-date-card--placeholder"))
        .filter((placeholder) => {
          const opacity = Number(getComputedStyle(placeholder.parentElement!).opacity);
          return opacity > 0 && opacity < 1;
        });
      if (fading.length === 2 || performance.now() >= deadline) resolve(fading.length);
      else requestAnimationFrame(sample);
    }
    sample();
  }));
  releaseResponse();
  expect(await fade).toBe(2);
  await expect(placeholders).toHaveCount(0);
  await expect(mobile.locator(".empty-state")).toBeVisible();
  await expect(mobile.locator(".empty-state__action")).toHaveCount(0);
  const create = page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: "Add album" });
  await expect(create).toBeVisible();
  await expect(create).toHaveText("");
  await create.click();
  await expect(page.getByRole("dialog", { name: "New album" })).toBeVisible();
});

test("shared button variants keep their labels plain on hover", async ({ page }) => {
  await page.goto("/login");
  await page.locator("button").first().waitFor();
  const variants = ["btn--primary", "btn--secondary", "btn--ghost", "dialog-action"];
  await page.evaluate((classes) => {
    const controls = document.createElement("div");
    controls.style.cssText = "position:fixed;z-index:200000;inset:10px auto auto 10px;display:grid;gap:4px";
    classes.forEach((variant) => {
      const button = document.createElement("button");
      button.className = `btn ${variant}`;
      button.textContent = variant;
      controls.append(button);
    });
    document.body.append(controls);
  }, variants);
  for (const name of variants) {
    const button = page.getByRole("button", { name, exact: true });
    await button.hover();
    await expect(button).toHaveCSS("text-decoration-line", "none");
  }
});

test("shared button press feedback respects input and motion settings", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("shinigacim.animations-enabled", "true"));
  await page.goto("/login");
  await expect(page.locator("button").first()).toBeVisible();
  await page.evaluate(() => {
    const button = document.createElement("button");
    button.textContent = "Motion test";
    button.style.cssText = "position:fixed;top:10px;left:10px;z-index:200000;scale:.8;transition:opacity 320ms ease";
    document.body.append(button);
    const disabled = document.createElement("button");
    disabled.textContent = "Disabled motion test";
    disabled.disabled = true;
    disabled.style.cssText = "position:fixed;top:60px;left:10px;z-index:200000";
    document.body.append(disabled);
    const roleButton = document.createElement("div");
    roleButton.setAttribute("role", "button");
    roleButton.tabIndex = 0;
    roleButton.textContent = "Role motion test";
    roleButton.style.cssText = "position:fixed;top:110px;left:10px;z-index:200000";
    document.body.append(roleButton);
  });
  const button = page.getByRole("button", { name: "Motion test", exact: true });
  const disabled = page.getByRole("button", { name: "Disabled motion test" });
  const scale = () => button.evaluate((element) => Number(getComputedStyle(element).scale));
  await expect(button).toHaveCSS("transition-property", "opacity");
  await button.hover();
  await page.mouse.down();
  await expect.poll(scale).toBeCloseTo(.8 * .97, 3);
  await page.mouse.move(350, 10);
  await page.mouse.up();
  await expect.poll(scale).toBeCloseTo(.8, 3);
  await button.focus();
  await page.keyboard.down("Space");
  await expect.poll(scale).toBeCloseTo(.8 * .97, 3);
  await page.keyboard.up("Space");
  await expect.poll(scale).toBeCloseTo(.8, 3);
  const roleButton = page.getByRole("button", { name: "Role motion test" });
  await roleButton.focus();
  await page.keyboard.down("Enter");
  await expect.poll(() => roleButton.evaluate((element) => Number(getComputedStyle(element).scale))).toBeCloseTo(.97, 3);
  await page.keyboard.up("Enter");
  await expect.poll(() => roleButton.evaluate((element) => getComputedStyle(element).scale)).toMatch(/^(1|none)$/);
  const disabledBounds = (await disabled.boundingBox())!;
  await page.mouse.move(disabledBounds.x + 5, disabledBounds.y + 5);
  await page.mouse.down();
  expect(await disabled.evaluate((element) => element.getAnimations().length)).toBe(0);
  await page.mouse.up();
  await button.hover();
  await page.mouse.down();
  await expect.poll(scale).toBeLessThan(.8);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(scale).toBeCloseTo(.8, 3);
  await page.mouse.up();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => { document.documentElement.dataset.motion = "off"; });
  await page.mouse.down();
  expect(await button.evaluate((element) => element.getAnimations().length)).toBe(0);
  await page.mouse.up();
});

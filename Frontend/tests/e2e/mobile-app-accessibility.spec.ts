import { expect, test, type Locator } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" },
      accessToken: "test", refreshToken: "test",
    }, version: 0 }));
  });
  await page.route(/^https?:\/\/[^/]+\/api\//, (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = path.endsWith("/page") || path.startsWith("/api/library/gallery") || path === "/api/location/travel/map"
      ? { items: [], total: 0, offset: 0, page: 1, limit: 30, hasMore: false }
      : path.endsWith("home-location") ? null : [];
    return route.fulfill({ json });
  });
  await page.route(/\/hubs\//, (route) => route.abort());
  await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({
    json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {},
  }));
});

for (const width of [320, 390]) {
  test(`mobile theme persistence, focus return and overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const reducedMotion = width === 320 ? "no-preference" : "reduce";
    await page.emulateMedia({ colorScheme: "light", reducedMotion });
    if (reducedMotion === "reduce") {
      await page.addInitScript(() => localStorage.setItem("shinigacim.animations-enabled", "true"));
    }
    await page.goto("/");
    await expect(page.getByRole("main", { name: "Home" })).toBeEmpty();
    const account = page.getByRole("link", { name: "viewer Admin", exact: true });
    await expect(account).toHaveAttribute("href", "/profile");
    await expect(account.locator(".mobile-home-header__avatar")).toHaveCSS("border-top-width", "1px");
    await expect(account.getByText("viewer", { exact: true })).toHaveCSS("font-weight", "700");
    await expect(account.getByText("Admin", { exact: true })).toHaveCSS("font-weight", "400");
    const navigation = page.getByRole("navigation", { name: "Main navigation" });
    const homeTab = navigation.getByRole("link", { name: "Home" });
    const indicator = navigation.locator(".mobile-nav__indicator");
    await expect(homeTab).toHaveAttribute("aria-current", "page");
    await expect(navigation).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(indicator).toHaveCSS("background-color", "rgb(34, 34, 34)");
    const notifications = page.getByRole("button", { name: "Notifications" });
    await expect(page.locator(".mobile-shell")).toHaveCSS("background-color", "rgb(234, 231, 227)");
    await expect(navigation).toHaveCSS("border-top-color", "rgb(232, 230, 227)");
    await expect(notifications).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(notifications).toHaveCSS("border-top-width", "0px");
    await notifications.click();
    await expect(page.getByRole("banner").getByRole("region", { name: "Notifications" })).toBeInViewport({ ratio: 1 });
    await page.keyboard.press("Escape");
    await expect(notifications).toBeFocused();
    const more = page.getByRole("button", { name: "More", exact: true });
    await expect(more).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await more.click();
    const dialog = page.getByRole("dialog", { name: "More" });
    await expect(dialog).toBeVisible();
    await expect(more.locator("line").nth(1)).toHaveCSS("opacity", "1");
    await expect(dialog).toHaveCSS("transition-duration", "0s");
    await expect(dialog.getByRole("heading")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Close" })).toHaveCount(0);
    await expect(dialog.getByRole("radio")).toHaveCount(0);
    const logout = dialog.getByRole("button", { name: "Log out" });
    const logoutBounds = await logout.boundingBox();
    expect(logoutBounds?.x).toBe(24);
    expect(logoutBounds?.width).toBe(width - 48);
    const logoutIcon = logout.locator("svg");
    await expect(logoutIcon).toBeVisible();
    await expect(logout).toHaveCSS("transition-duration", "0s");
    await expect(logout).toHaveCSS("color", "rgb(179, 38, 30)");
    await expect(logoutIcon).toHaveCSS("color", "rgb(179, 38, 30)");
    await logout.hover();
    await expect(logout).toHaveCSS("background-color", "rgb(235, 170, 162)");
    const hoverColor = await logout.evaluate((button) => getComputedStyle(button).color);
    expect(hoverColor).not.toBe("rgb(179, 38, 30)");
    await expect(logoutIcon).toHaveCSS("color", hoverColor);
    await page.mouse.down();
    await expect(logout).toHaveCSS("background-color", "oklch(0.55 0.18 30)");
    await expect(logoutIcon).toHaveCSS("color", "rgb(255, 255, 255)");
    await page.mouse.move(width / 2, 100);
    await page.mouse.up();
    await dialog.click({ position: { x: 8, y: 8 } });
    await expect(dialog).toBeVisible();
    await page.mouse.click(width / 2, 100);
    await expect(dialog).toBeHidden();
    await expect(more).toBeFocused();
    await more.click();
    await dialog.getByRole("link", { name: "Settings" }).click();
    await page.getByRole("radio", { name: "Dark" }).check();
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "dark");
    await page.getByRole("radio", { name: "System" }).check();
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "light");
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "dark");
    await expect(page.locator(".mobile-shell")).toHaveCSS("background-color", "rgb(28, 28, 28)");
    await expect(notifications).toHaveCSS("background-color", "rgb(48, 48, 48)");
    await expect(more).toHaveCSS("background-color", "rgb(48, 48, 48)");
    await expect(navigation).toHaveCSS("background-color", "rgb(48, 48, 48)");
    await expect(navigation).toHaveCSS("box-shadow", /rgba\(0, 0, 0, 0\.12\).*rgba\(0, 0, 0, 0\.24\)/);
    await expect(indicator).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(navigation).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
    await expect(navigation).toHaveCSS("border-bottom-color", "rgba(0, 0, 0, 0)");
    await notifications.click();
    await expect(page.getByRole("banner").getByRole("region", { name: "Notifications" }))
      .toHaveCSS("background-color", "rgb(48, 48, 48)");
    await page.keyboard.press("Escape");
    await more.click();
    await expect(dialog).toHaveCSS("background-color", "rgb(48, 48, 48)");
    await expect(logout).toHaveCSS("color", "rgb(255, 180, 171)");
    await expect(logoutIcon).toHaveCSS("color", "rgb(255, 180, 171)");
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("Home menu slides up and down while its icon morphs", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => localStorage.setItem("shinigacim.animations-enabled", "true"));
  await page.goto("/");

  await page.locator(".mobile-more").evaluate((sheet) => {
    const positions: number[][] = [];
    Reflect.set(window, "menuSlidePositions", positions);
    sheet.addEventListener("transitionstart", (event) => {
      if (event.propertyName !== "transform" || event.pseudoElement) return;
      const slide = sheet.getAnimations().find((animation) =>
        animation instanceof CSSTransition && animation.transitionProperty === "transform");
      if (!slide?.effect) return;
      const originalTime = slide.currentTime;
      const duration = Number(slide.effect.getTiming().duration);
      positions.push([0, duration / 2, duration - 1].map((time) => {
        slide.currentTime = time;
        return sheet.getBoundingClientRect().top;
      }));
      slide.currentTime = originalTime;
    });
  });

  const more = page.getByRole("button", { name: "More", exact: true });
  const middleLine = more.locator("line").nth(1);
  await expect(middleLine).toHaveCSS("opacity", "1");
  await more.click();
  const menu = page.getByRole("dialog", { name: "More" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("button", { name: "Log out" })).toHaveCSS("transition-duration", "0.32s, 0.32s, 0.14s");
  await expect(middleLine).toHaveCSS("opacity", "0");
  await expect(page.locator(".mobile-more")).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  await page.keyboard.press("Escape");
  await expect(more).toBeFocused();
  await expect(middleLine).toHaveCSS("opacity", "1");
  const readPositions = () => page.evaluate((): number[][] => Reflect.get(window, "menuSlidePositions"));
  await expect.poll(readPositions).toHaveLength(2);
  const [enter, exit] = await readPositions();
  expect(enter[0]).toBeCloseTo(844, 0);
  expect(enter[1]).toBeLessThan(enter[0]);
  expect(enter[2]).toBeLessThan(enter[1]);
  expect(exit[0]).toBeCloseTo(enter[2], 0);
  expect(exit[1]).toBeGreaterThan(exit[0]);
  expect(exit[2]).toBeGreaterThan(exit[1]);
  expect(exit[2]).toBeCloseTo(844, 0);
  await expect(page.locator(".mobile-more")).toBeHidden();
});

test("album Create and Save changes ease color changes on hover, press, and release", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.setFixedTime(new Date("2026-01-03T12:00:00Z"));
  await page.addInitScript(() => localStorage.setItem("shinigacim.animations-enabled", "true"));
  const album = {
    id: "album-test", name: "Weekend", isPublic: false, mediaCount: 0,
    createdAt: "2026-01-02T12:00:00", owner: { id: "u1", username: "viewer" },
  };
  await page.route("**/api/library/album/page*", (route) => route.fulfill({ json: { items: [album], hasMore: false } }));
  await page.route("**/api/library/album/album-test", (route) => route.fulfill({ json: album }));
  await page.route("**/api/library/album/album-test/media*", (route) =>
    route.fulfill({ json: { items: [], offset: 0, total: 0 } }));

  const sampleColorTransition = async (button: Locator) => {
    const result = await button.evaluate(async (element) => {
      const animation = element.getAnimations().find((candidate) =>
        candidate instanceof CSSTransition && candidate.transitionProperty === "background-color");
      if (!animation?.effect) return null;
      const startTime = animation.currentTime;
      const duration = Number(animation.effect.getTiming().duration);
      const colors = [0, duration / 2, duration - 1].map((time) => {
        animation.currentTime = time;
        return getComputedStyle(element).backgroundColor;
      });
      animation.currentTime = startTime;
      await animation.finished;
      return { duration, colors };
    });
    expect(result?.duration).toBe(320);
    expect(new Set(result?.colors).size).toBe(3);
  };

  await page.goto("/gallery");
  for (const [opener, action] of [["New album", "Create"], ["Edit", "Save changes"]]) {
    if (action === "Save changes") {
      await page.locator('[data-date="2026-01-02"]').click();
      await page.getByRole("link", { name: "Open album Weekend" }).click();
    }
    await page.getByRole("button", { name: opener, exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Name" }).fill("Family weekend");
    const submit = dialog.getByRole("button", { name: action, exact: true });
    await page.mouse.move(0, 0);
    await submit.evaluate((element) => element.addEventListener("click", (event) => event.preventDefault(), { once: true }));

    await submit.hover();
    await sampleColorTransition(submit);
    await page.mouse.down();
    await sampleColorTransition(submit);
    await page.mouse.up();
    await sampleColorTransition(submit);
    await page.mouse.move(0, 0);
    await sampleColorTransition(submit);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  }
});

for (const [label, path, title] of [
  ["Gallery", "/gallery", "Gallery"],
  ["Locations", "/location", "Locations"],
  ["Users", "/users", "User"],
]) {
  test(`${label} is covered immediately on entry and return with live navigation controls`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: "light" });
    await page.addInitScript(() => {
      localStorage.setItem("shinigacim.animations-enabled", "true");
      const motion = { documentCaptures: 0, opaqueEntries: [] as boolean[], chromeFrames: [] as boolean[] };
      Object.assign(window, { motion });
      const startViewTransition = document.startViewTransition.bind(document);
      document.startViewTransition = (update) => {
        motion.documentCaptures++;
        return startViewTransition(update);
      };
      let previousOverlay: Element | null = null;
      new MutationObserver(() => {
        const overlay = document.querySelector(".mobile-page-loading");
        const background = overlay?.querySelector(".mobile-page-loading__background");
        if (!overlay || overlay === previousOverlay || !background) return;
        previousOverlay = overlay;
        const controls = document.querySelectorAll(".mobile-shell-header__actions .icon-button, .mobile-nav a");
        let remaining = 8;
        const sampleFrame = () => {
          motion.chromeFrames.push(controls.length === 6 && Array.from(controls).every((control) => {
            const box = control.getBoundingClientRect();
            const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
            return box.width > 0 && control.contains(hit);
          }));
          if (--remaining > 0) requestAnimationFrame(sampleFrame);
        };
        requestAnimationFrame(() => {
          motion.opaqueEntries.push(getComputedStyle(overlay).opacity === "1" && getComputedStyle(background).opacity === "1");
          sampleFrame();
        });
      }).observe(document, { subtree: true, childList: true });
    });
    await page.goto("/");
    await expect(page.getByRole("link", { name: "viewer" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Notifications" })).toBeVisible();
    const navigation = page.getByRole("navigation", { name: "Main navigation" });
    const link = navigation.getByRole("link", { name: label });
    const motionSamples = () => page.evaluate(() => Reflect.get(window, "motion"));
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("progressbar", { name: `Loading page... ${title}` })).toBeVisible();
    await expect(page.locator(".mobile-page-loading")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.locator(".mobile-shell")).toHaveCSS("background-color", "rgb(234, 231, 227)");
    await expect(navigation).toBeVisible();
    await expect(link).toHaveAttribute("aria-current", "page");
    expect(await motionSamples()).toEqual({ documentCaptures: 0, opaqueEntries: [true], chromeFrames: Array(8).fill(true) });

    await expect(page.getByRole("banner").getByRole("button", { name: "Back", exact: true })).toHaveCount(0);
    await navigation.getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("progressbar", { name: "Loading page... Home" })).toBeVisible();
    await expect(page.locator(".mobile-page-loading")).toHaveCount(0);
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(await motionSamples()).toEqual({ documentCaptures: 0, opaqueEntries: [true, true], chromeFrames: Array(16).fill(true) });
  });
}

for (const [colorScheme, motionEnabled] of [["dark", true], ["light", true], ["light", false]] as const) {
  test(`page loading tracks requests in ${colorScheme} mode with motion ${motionEnabled ? "on" : "off"}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme, reducedMotion: "no-preference" });
    await page.addInitScript((enabled) => {
      localStorage.setItem("shinigacim.animations-enabled", String(enabled));
      const timing = { firstOverlayFrame: 0, handoffStarted: 0, titleMoves: false, firstProgress: 0, halfProgress: 0 };
      const progressSamples: number[] = [];
      const chromeTransitions: string[] = [];
      Object.assign(window, { pageLoadingTiming: timing, progressSamples, chromeTransitions });
      document.addEventListener("transitionrun", ({ target, propertyName }) => {
        if (!(target instanceof Element)) return;
        if (target.matches(".mobile-nav__indicator") && propertyName === "transform") chromeTransitions.push("tab");
        if (target.matches(".mobile-home-header__avatar") && propertyName === "opacity") chromeTransitions.push("avatar");
        if (target.matches(".mobile-home-header__account") && propertyName === "opacity") chromeTransitions.push("account");
      });
      new MutationObserver((records) => {
        if (!timing.firstOverlayFrame && document.querySelector(".mobile-page-loading")) {
          requestAnimationFrame((now) => { timing.firstOverlayFrame ||= now; });
        }
        for (const { target, attributeName } of records) {
          if (!(target instanceof HTMLElement)) continue;
          if (attributeName === "data-handoff" && target.matches(".mobile-page-loading[data-handoff]")) {
            timing.handoffStarted = performance.now();
            const title = target.querySelector(".mobile-page-loading__title");
            timing.titleMoves = title?.getAnimations().some((animation) =>
              animation.effect instanceof KeyframeEffect && animation.effect.getKeyframes().some((frame) =>
                typeof frame.transform === "string" && frame.transform.startsWith("translate("))) ?? false;
          }
          if (attributeName === "aria-valuenow" && target.matches(".mobile-page-loading__progress")) {
            const percent = Number(target.getAttribute("aria-valuenow"));
            timing.firstProgress ||= performance.now();
            if (percent === 50) timing.halfProgress ||= performance.now();
            progressSamples.push(percent);
          }
        }
      }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-handoff", "aria-valuenow"] });
    }, motionEnabled);

    let releaseGallery!: () => void;
    const galleryResponse = new Promise<void>((resolve) => { releaseGallery = resolve; });
    await page.route("**/api/library/album/page*", async (route) => {
      await galleryResponse;
      await route.fulfill({ json: { items: [], total: 0, offset: 0, limit: 5, hasMore: false } });
    });

    await page.goto("/");
    const navigation = page.getByRole("navigation", { name: "Main navigation" });
    const gallery = navigation.getByRole("link", { name: "Gallery" });
    const notifications = page.getByRole("button", { name: "Notifications" });
    const more = page.getByRole("button", { name: "More", exact: true });
    const homeControls = await Promise.all([navigation.elementHandle(), notifications.elementHandle(), more.elementHandle()]);
    await gallery.click();
    const overlay = page.locator(".mobile-page-loading");
    const bar = overlay.getByRole("progressbar");
    const background = overlay.locator(".mobile-page-loading__background");
    const destination = page.locator(".mobile-header .mobile-page-title");
    try {
      await expect(bar).toHaveAttribute("aria-valuemax", "100");
      await expect(bar).toHaveAttribute("aria-valuenow", "50");
      await expect(bar.locator("span")).toHaveCSS("transform", "matrix(0.5, 0, 0, 1, 0, 0)");
      await expect(overlay.locator(".mobile-page-loading__count")).toHaveCount(0);
      await expect(overlay.locator(".mobile-page-loading__icon svg")).toBeVisible();
      await expect(background).toHaveCSS("background-color", colorScheme === "dark" ? "rgb(28, 28, 28)" : "rgb(234, 231, 227)");
      await expect(destination).toHaveCSS("opacity", "0");
      await expect(overlay).not.toHaveAttribute("data-handoff");
      await expect(gallery).toHaveAttribute("aria-current", "page");
      await expect(navigation).toBeVisible();
      await expect(more).toBeVisible();
      expect(await page.evaluate(([nav, bell, menu]) => [
        nav === document.querySelector(".mobile-nav"),
        bell === document.querySelector(".mobile-notification__trigger"),
        menu === document.querySelector(".mobile-shell-header__actions button[aria-haspopup='dialog']"),
      ], homeControls)).toEqual([true, true, true]);
      expect(await page.evaluate(() => Reflect.get(window, "chromeTransitions").sort())).toEqual(motionEnabled ? ["account", "avatar", "tab"] : []);
      await notifications.click();
      await expect(page.getByRole("banner").getByRole("region", { name: "Notifications" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(bar).toHaveAttribute("aria-valuenow", "50");
    } finally {
      releaseGallery();
    }
    await expect(overlay).toHaveCount(0);
    const timing = await page.evaluate(() => Reflect.get(window, "pageLoadingTiming"));
    if (motionEnabled) {
      expect(timing.firstOverlayFrame).toBeGreaterThan(0);
      expect(timing.handoffStarted - timing.firstOverlayFrame).toBeGreaterThanOrEqual(290);
      expect(timing.titleMoves).toBe(true);
    } else {
      expect(timing).toMatchObject({ handoffStarted: 0, titleMoves: false });
    }
    expect(timing.halfProgress - timing.firstProgress).toBeGreaterThan(0);
    expect(timing.halfProgress - timing.firstProgress).toBeLessThan(600);
    const progressSamples: number[] = await page.evaluate(() => Reflect.get(window, "progressSamples"));
    expect(progressSamples).toContain(50);
    expect(progressSamples.at(-1)).toBe(100);
    expect(progressSamples.every((percent, index) => Number.isInteger(percent) && percent > (progressSamples[index - 1] ?? 0))).toBe(true);
    await expect(destination).toHaveCSS("opacity", "1");
    await expect(page.getByText("No albums yet")).toBeVisible();
    if (!motionEnabled) {
      await navigation.getByRole("link", { name: "Home" }).click();
      await expect(page.getByRole("progressbar", { name: "Loading page... Home" })).toBeVisible();
      await expect(overlay).toHaveCSS("opacity", "1");
      await expect(overlay).toHaveCount(0);
    }
  });
}

test("Users title grows while sliding into the header", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => localStorage.setItem("shinigacim.animations-enabled", "true"));
  await page.goto("/");
  await page.evaluate(() => {
    const observer = new MutationObserver(() => {
      const title = document.querySelector(".mobile-page-loading[data-handoff] .mobile-page-loading__title");
      const destination = document.querySelector(".mobile-shell-header .mobile-page-title");
      if (!title || !destination) return;

      const animation = title.getAnimations().find((candidate) =>
        candidate.effect instanceof KeyframeEffect && candidate.effect.getKeyframes().some((frame) => frame.transform));
      if (!animation?.effect) return;

      const duration = Number(animation.effect.getTiming().duration);
      const originalTime = animation.currentTime;
      const positions = [0, duration / 3, duration].map((time) => {
        animation.currentTime = time;
        return title.getBoundingClientRect().toJSON();
      });
      animation.currentTime = originalTime ?? 0;
      Reflect.set(window, "usersTitleHandoff", { positions, destination: destination.getBoundingClientRect().toJSON() });
      observer.disconnect();
    });
    observer.observe(document, { subtree: true, attributes: true, attributeFilter: ["data-handoff"] });
  });
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Users" }).click();
  await expect(page.locator(".mobile-shell-header .mobile-page-title")).toHaveCSS("opacity", "1");
  const handoff = await page.evaluate(() => Reflect.get(window, "usersTitleHandoff"));
  expect(handoff).toBeDefined();
  const { positions: [start, middle, end], destination } = handoff;
  expect(middle.width).toBeGreaterThan(start.width);
  expect(middle.width).toBeLessThan(end.width);
  expect(middle.y).toBeLessThan(start.y);
  expect(middle.y).toBeGreaterThan(end.y);
  expect(end.width).toBeCloseTo(destination.width, 0);
  expect(end.x).toBeCloseTo(destination.x, 0);
  expect(end.y + end.height / 2).toBeCloseTo(destination.y + destination.height / 2, 0);
});

test("page loading and fade respect system reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("shinigacim.animations-enabled", "true"));
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Gallery" }).click();
  await expect(page.getByRole("heading", { name: "Gallery", exact: true })).toBeVisible();
  await expect(page.locator(".mobile-page-loading")).toHaveCount(0);
  await expect(page.locator(".mobile-nav__indicator")).toHaveCSS("transition-duration", "0s");
});

test("persistent tabs can switch away from a page that is still loading", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let releaseGallery!: () => void;
  const galleryResponse = new Promise<void>((resolve) => { releaseGallery = resolve; });
  await page.route("**/api/library/album/page*", async (route) => {
    await galleryResponse;
    await route.fulfill({ json: { items: [], total: 0, offset: 0, limit: 5, hasMore: false } });
  });

  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  const users = navigation.getByRole("link", { name: "Users" });
  const home = navigation.getByRole("link", { name: "Home" });
  await navigation.getByRole("link", { name: "Gallery" }).click();
  try {
    await expect(page.getByRole("progressbar", { name: "Loading page... Gallery" })).toBeVisible();
    await users.click();
    await expect(page).toHaveURL(/\/users$/);
    await expect(users).toHaveAttribute("aria-current", "page");
  } finally {
    releaseGallery();
  }
  await expect(page.locator(".mobile-page-loading")).toHaveCount(0);
  await home.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(home).toHaveAttribute("aria-current", "page");
});

test("the Home tab returns Home after opening More pages and Gallery", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const more = page.getByRole("button", { name: "More", exact: true });
  const menu = page.getByRole("dialog", { name: "More" });
  const back = page.getByRole("button", { name: "Back", exact: true });

  for (const [label, path] of [["Settings", "/settings"], ["User profile", "/profile"], ["Upload", "/uploads"]]) {
    await more.click();
    await menu.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(back).toBeVisible();
  }

  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await navigation.getByRole("link", { name: "Gallery" }).click();
  await expect(page).toHaveURL(/\/gallery$/);
  await expect(back).toHaveCount(0);
  await navigation.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("main", { name: "Home" })).toBeEmpty();
  await expect(menu).not.toBeVisible();
});

for (const preference of ["enabled", "disabled", "reduced"] as const) {
  test(`album detail header returns to Gallery with motion ${preference}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.setFixedTime(new Date("2026-01-03T12:00:00Z"));
    await page.emulateMedia({ reducedMotion: preference === "reduced" ? "reduce" : "no-preference" });
    await page.addInitScript((enabled) => {
      localStorage.setItem("shinigacim.animations-enabled", String(enabled));
      const steps: string[] = [];
      Reflect.set(window, "albumHeaderSteps", steps);
      document.addEventListener("transitionstart", ({ target, propertyName }) => {
        if (!(target instanceof Element)) return;
        if (target.matches(".mobile-shell-header__title-position") && propertyName.startsWith("margin-")) steps.push("title");
        if (target.matches(".mobile-shell-header__back") && propertyName === "opacity") steps.push("fade");
        if (target.matches(".mobile-shell-header__back") && propertyName === "translate") steps.push("slide");
      });
    }, preference !== "disabled");
    const album = {
      id: "album-test", name: "Weekend", createdAt: "2026-01-03T12:00:00", isPublic: false,
      mediaCount: 0, owner: { id: "u1", username: "viewer" },
    };
    await page.route("**/api/library/album/page*", (route) => route.fulfill({ json: { items: [album], hasMore: false } }));
    await page.route("**/api/library/album/album-test", (route) => route.fulfill({ json: album }));

    await page.goto("/gallery");
    const header = page.getByRole("banner");
    const back = header.getByRole("button", { name: "Back", exact: true });
    const title = header.getByText("Gallery", { exact: true });
    const position = page.locator(".mobile-shell-header__title-position");
    const steps = () => page.evaluate((): string[] => Reflect.get(window, "albumHeaderSteps"));
    await expect(back).toHaveCount(0);
    const listX = (await title.boundingBox())!.x;
    await page.getByRole("link", { name: "Open album Weekend" }).click();
    await expect(page).toHaveURL(/\/gallery\/album\/album-test$/);
    await expect(page.locator(".mobile-page-loading")).toHaveCount(0);
    await expect(back).toHaveCSS("opacity", "1");
    expect((await title.boundingBox())!.x).toBeGreaterThan(listX + 40);
    if (preference === "enabled") {
      const openSteps = await steps();
      expect(openSteps[0]).toBe("title");
      expect(openSteps.slice(1).sort()).toEqual(["fade", "slide"]);
    } else {
      expect(await steps()).toEqual([]);
    }

    await back.click();
    await expect(page).toHaveURL(/\/gallery$/);
    await expect(back).toHaveCount(0);
    await expect(position).toHaveCSS("margin-inline-start", "0px");
    expect((await title.boundingBox())!.x).toBe(listX);
    if (preference === "enabled") {
      const returnSteps = (await steps()).slice(3);
      expect(returnSteps.slice(0, 2).sort()).toEqual(["fade", "slide"]);
      expect(returnSteps[2]).toBe("title");
    } else {
      expect(await steps()).toEqual([]);
    }

    if (preference === "reduced") {
      await page.goto("/gallery/album/album-test");
      await back.click();
      await expect(page).toHaveURL(/\/gallery$/);
    }
  });
}

test("More pages return Home after browser Back or direct entry", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const more = page.getByRole("button", { name: "More", exact: true });
  const menu = page.getByRole("dialog", { name: "More" });
  await more.click();
  await menu.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await more.click();
  await menu.getByRole("link", { name: "User profile", exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/settings");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("main", { name: "Home" })).toBeEmpty();
});

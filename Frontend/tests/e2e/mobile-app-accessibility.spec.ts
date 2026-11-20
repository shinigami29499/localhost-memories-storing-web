import { expect, test } from "@playwright/test";

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
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
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
    await expect(indicator).toHaveCSS("background-color", "rgb(244, 243, 242)");
    const notifications = page.getByRole("button", { name: "Notifications" });
    await expect(page.locator(".mobile-shell")).toHaveCSS("background-color", "rgb(244, 243, 242)");
    await expect(notifications).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(notifications).toHaveCSS("border-top-width", "0px");
    await notifications.click();
    await expect(page.getByRole("banner").getByRole("region", { name: "Notifications" })).toBeInViewport({ ratio: 1 });
    await page.keyboard.press("Escape");
    await expect(notifications).toBeFocused();
    const more = page.getByRole("button", { name: "More", exact: true });
    await more.click();
    const dialog = page.getByRole("dialog", { name: "More" });
    await expect(dialog).toBeVisible();
    await expect(more.locator("line").nth(1)).toHaveCSS("opacity", "1");
    await dialog.getByRole("radio", { name: "Dark" }).check();
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "dark");
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(more).toBeFocused();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "dark");
    await more.click();
    await dialog.getByRole("radio", { name: "System" }).check();
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "light");
    await dialog.getByRole("button", { name: "Close" }).click();
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "dark");
    await expect(page.locator(".mobile-shell")).toHaveCSS("background-color", "rgb(39, 39, 39)");
    await expect(notifications).toHaveCSS("background-color", "rgb(28, 28, 28)");
    await expect(navigation).toHaveCSS("background-color", "rgb(34, 34, 34)");
    await expect(indicator).toHaveCSS("background-color", "rgb(39, 39, 39)");
    await expect(navigation).toHaveCSS("border-top-color", "rgb(72, 72, 72)");
    await expect(navigation).toHaveCSS("border-bottom-color", "rgb(72, 72, 72)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("Home menu icon morphs while More is open", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => localStorage.setItem("shinigacim.animations-enabled", "true"));
  await page.goto("/");

  const more = page.getByRole("button", { name: "More", exact: true });
  const middleLine = more.locator("line").nth(1);
  await expect(middleLine).toHaveCSS("opacity", "1");
  await more.click();
  await expect(page.getByRole("dialog", { name: "More" })).toBeVisible();
  await expect(middleLine).toHaveCSS("opacity", "0");
  await page.keyboard.press("Escape");
  await expect(more).toBeFocused();
  await expect(middleLine).toHaveCSS("opacity", "1");
});

for (const [label, path, title] of [
  ["Gallery", "/gallery", "Gallery"],
  ["Locations", "/location", "Locations"],
  ["Users", "/users", "User"],
]) {
  test(`${label} is covered immediately on entry and return with live navigation controls`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
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
    const homeAvatarBox = await page.locator(".mobile-home-header__avatar").boundingBox();
    const homeAccountBox = await page.locator(".mobile-home-header__account").boundingBox();
    await expect(page.getByRole("button", { name: "Notifications" })).toBeVisible();
    const navigation = page.getByRole("navigation", { name: "Main navigation" });
    const link = navigation.getByRole("link", { name: label });
    const motionSamples = () => page.evaluate(() => Reflect.get(window, "motion"));
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("progressbar", { name: `Loading page... ${title}` })).toBeVisible();
    await expect(page.locator(".mobile-page-loading")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(navigation).toBeVisible();
    await expect(link).toHaveAttribute("aria-current", "page");
    expect(await motionSamples()).toEqual({ documentCaptures: 0, opaqueEntries: [true], chromeFrames: Array(8).fill(true) });

    if (label === "Gallery") {
      const galleryScroll = await page.locator(".gallery-page__media-scroll").boundingBox();
      const tabBar = await navigation.boundingBox();
      expect(galleryScroll!.y + galleryScroll!.height).toBeGreaterThan(tabBar!.y + tabBar!.height);
      await page.getByRole("link", { name: "Album", exact: true }).click();
      await expect(page).toHaveURL(/\/gallery\/album$/);
    }
    if (label === "Locations") {
      await page.goBack();
    } else {
      const back = page.getByRole("button", { name: "Back", exact: true });
      if (label === "Users") {
        expect(await back.boundingBox()).toEqual(homeAvatarBox);
        const titleBox = await page.getByRole("heading", { name: title, exact: true }).boundingBox();
        expect(titleBox).toMatchObject({ x: homeAccountBox?.x, y: homeAccountBox?.y, height: homeAccountBox?.height });
        await back.hover();
        await expect(back.locator(".icon-button__icon")).toHaveCSS("transform", "matrix(1, 0, 0, 1, -3, 0)");
      }
      await back.click();
    }
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
    await page.route(/\/api\/library\/gallery\?/, async (route) => {
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
      await expect(background).toHaveCSS("background-color", colorScheme === "dark" ? "rgb(39, 39, 39)" : "rgb(244, 243, 242)");
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
    await expect(page.getByText("No media yet")).toBeVisible();
    if (!motionEnabled) {
      await page.getByRole("button", { name: "Back", exact: true }).click();
      await expect(page.getByRole("progressbar", { name: "Loading page... Home" })).toBeVisible();
      await expect(overlay).toHaveCSS("opacity", "1");
      await expect(overlay).toHaveCount(0);
    }
  });
}

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
  await page.route(/\/api\/library\/gallery\?/, async (route) => {
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

test("Back returns Home after opening More pages and Gallery tabs", async ({ page }) => {
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

  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Gallery" }).click();
  await page.getByRole("link", { name: "Album", exact: true }).click();
  await expect(page).toHaveURL(/\/gallery\/album$/);
  await back.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("main", { name: "Home" })).toBeEmpty();
  await expect(menu).not.toBeVisible();
});

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

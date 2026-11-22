import { expect, test, type Locator } from "@playwright/test";

function holdResponse() {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  return { pending, release };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" },
      accessToken: "test", refreshToken: "test",
    }, version: 0 }));
  });
  await page.route(/^https?:\/\/[^/]+\/api\//, (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = path.endsWith("/page") || path.startsWith("/api/library/album/media") || path === "/api/place/travel/map"
      ? { items: [], total: 0, offset: 0, page: 1, limit: 30, hasMore: false }
      : path.endsWith("home-location") ? null : [];
    return route.fulfill({ json });
  });
  await page.route(/\/hubs\//, (route) => route.abort());
  await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({
    json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {},
  }));
});

test("mobile tab highlight previews a mouse drag and opens the released tab", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
  await page.addInitScript(() => localStorage.setItem("shinigacim.animations-enabled", "true"));
  let releaseGallery!: () => void;
  const galleryResponse = new Promise<void>((resolve) => { releaseGallery = resolve; });
  let galleryRequests = 0;
  await page.route("**/api/library/album/page*", async (route) => {
    galleryRequests += 1;
    await galleryResponse;
    await route.fulfill({ json: { items: [], total: 0, offset: 0, limit: 5, hasMore: false } });
  });
  await page.goto("/");
  const navigation = page.locator(".mobile-menu-bar");
  const indicator = navigation.locator(".mobile-menu-bar__indicator");
  const indicatorX = () => indicator.evaluate((element) => element.getBoundingClientRect().left);
  const home = navigation.getByRole("link", { name: "Home" });
  const album = navigation.getByRole("link", { name: "Album" });
  const homeBounds = (await home.boundingBox())!;
  const albumBounds = (await album.boundingBox())!;
  const y = homeBounds.y + homeBounds.height / 2;
  const homeX = homeBounds.x + homeBounds.width / 2;
  const albumX = albumBounds.x + albumBounds.width / 2;

  await page.mouse.move(homeX, y);
  await page.mouse.down();
  const startX = await indicatorX();
  for (const offset of [14, 24]) {
    await page.mouse.move(homeX + offset, y);
    await expect.poll(indicatorX).toBeCloseTo(startX + offset, 0);
    await expect(navigation).toHaveAttribute("data-item", "home");
  }
  await page.mouse.move(albumX, y);
  await expect(navigation).toHaveAttribute("data-item", "album");
  await expect(home).toHaveAttribute("aria-current", "page");
  await expect(album).toHaveCSS("font-weight", "600");
  await expect(page).toHaveURL(/\/$/);
  await page.mouse.move(albumX, y - 100);
  await page.mouse.up();
  await expect(navigation).toHaveAttribute("data-item", "home");
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(indicatorX).toBeCloseTo(startX, 0);

  await page.mouse.move(homeX, y);
  await page.mouse.down();
  try {
    const releaseX = albumX - 18;
    await page.mouse.move(releaseX, y);
    await expect.poll(indicatorX).toBeCloseTo(startX + releaseX - homeX, 0);
    await expect(page.locator(".mobile-page-loading")).toHaveCount(0);
    expect(galleryRequests).toBe(0);
    await page.mouse.up();
    await expect(page).toHaveURL(/\/album$/);
    await expect(album).toHaveAttribute("aria-current", "page");
    await expect(page.locator(".mobile-albums-page .album-date-card--placeholder")).toHaveCount(2);
    await expect.poll(indicatorX).toBeCloseTo(albumBounds.x, 0);
  } finally {
    releaseGallery();
  }
  await expect(page.locator(".mobile-page-loading")).toHaveCount(0);
  await page.goBack();
  await expect(home).toHaveAttribute("aria-current", "page");
});

test("mobile tab highlight supports touch drags and cancellation", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  const navigation = page.locator(".mobile-menu-bar");
  const home = navigation.getByRole("link", { name: "Home" });
  const album = navigation.getByRole("link", { name: "Album" });
  const homeBounds = (await home.boundingBox())!;
  const albumBounds = (await album.boundingBox())!;
  const y = homeBounds.y + homeBounds.height / 2;
  const from = { x: homeBounds.x + homeBounds.width / 2, y };
  const to = { x: albumBounds.x + albumBounds.width / 2, y };
  const touch = await page.context().newCDPSession(page);
  await touch.send("Emulation.setTouchEmulationEnabled", { enabled: true });

  await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
  await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [to] });
  await expect(navigation).toHaveAttribute("data-item", "album");
  await touch.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await expect(navigation).toHaveAttribute("data-item", "home");
  await expect(page).toHaveURL(/\/$/);

  await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
  await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [to] });
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page).toHaveURL(/\/album$/);
  await expect(navigation.locator('[data-menu-item="album"]')).toHaveAttribute("aria-current", "page");
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
    const indicator = navigation.locator(".mobile-menu-bar__indicator");
    await expect(navigation).toHaveClass("mobile-menu-bar");
    await expect(navigation).toHaveAttribute("data-item", "home");
    const navigationBounds = await navigation.boundingBox();
    const homeTabBounds = await homeTab.boundingBox();
    const pageGutter = await page.locator("html").evaluate((root) => Number.parseFloat(getComputedStyle(root).getPropertyValue("--page-gutter")));
    expect(navigationBounds?.height).toBe(58);
    await expect(navigation).toHaveCSS("padding-block", "4px");
    expect(homeTabBounds?.height).toBeGreaterThanOrEqual(48);
    expect(homeTabBounds?.width).toBeGreaterThanOrEqual(48);
    expect(navigationBounds?.x).toBeCloseTo(pageGutter, 1);
    expect(width - navigationBounds!.x - navigationBounds!.width).toBeCloseTo(pageGutter, 1);
    await expect(homeTab).toHaveCSS("font-size", "12px");
    await expect(homeTab.locator("svg")).toHaveCSS("width", "20px");
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

  await page.goto("/album");
  for (const [opener, action] of [["Add album", "Create"], ["Edit", "Save changes"]]) {
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

test("page overlay waits for Album code and hands off to skeletons while the API is pending", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const moduleResponse = holdResponse();
  const feedResponse = holdResponse();
  let feedRequested = false;
  await page.route("**/gallery/MobileAlbumsPage.tsx*", async (route) => {
    await moduleResponse.pending;
    await route.continue();
  });
  await page.route("**/api/library/album/page*", async (route) => {
    feedRequested = true;
    await feedResponse.pending;
    await route.fulfill({ json: { items: [], hasMore: false } });
  });

  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  const overlay = page.locator(".mobile-page-loading");
  const placeholders = page.locator(".mobile-albums-page .album-date-card--placeholder");
  try {
    await navigation.getByRole("link", { name: "Album" }).click();
    await expect(overlay).toBeVisible();
    await expect(overlay.getByRole("progressbar", { name: "Loading page... Album" })).toBeVisible();
    await expect(navigation).toHaveAttribute("data-item", "album");
    await expect(navigation.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(page.getByRole("button", { name: "More", exact: true })).toBeEnabled();
    expect(feedRequested).toBe(false);

    moduleResponse.release();
    await expect(page).toHaveURL(/\/album$/);
    await expect(overlay).toHaveCount(0);
    await expect(placeholders).toHaveCount(2);
    await expect.poll(() => feedRequested).toBe(true);
    await expect(page.getByRole("heading", { name: "Album", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Album" })).toHaveAttribute("aria-current", "page");
    await page.getByRole("button", { name: "More", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "More" })).toBeVisible();
    await page.keyboard.press("Escape");

    feedResponse.release();
    await expect(placeholders).toHaveCount(0);
    await expect(page.getByText("No albums yet")).toBeVisible();
    await expect(overlay).toHaveCount(0);
  } finally {
    moduleResponse.release();
    feedResponse.release();
  }
});

test("cached pages hold the loading overlay for a quarter second", async ({ page }) => {
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await navigation.getByRole("link", { name: "Album" }).click();
  await expect(page.getByText("No albums yet")).toBeVisible();
  await page.evaluate(() => {
    let shownAt: number | undefined;
    const observer = new MutationObserver(() => {
      const visible = Boolean(document.querySelector(".mobile-page-body > .mobile-page-loading:not([data-handoff])"));
      if (visible) {
        shownAt ??= performance.now();
      } else if (shownAt !== undefined) {
        document.documentElement.dataset.overlayDuration = String(performance.now() - shownAt);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

  await navigation.getByRole("link", { name: "Home" }).click();
  await expect(page.getByRole("progressbar", { name: "Loading page... Home" })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(async () =>
    Number(await page.locator("html").getAttribute("data-overlay-duration"))).toBeGreaterThanOrEqual(245);
  expect(Number(await page.locator("html").getAttribute("data-overlay-duration"))).toBeLessThan(500);
});

test("Album loading advances in percentages and slides the title into the header", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => localStorage.setItem("shinigacim.animations-enabled", "true"));
  await page.goto("/");
  await page.evaluate(() => {
    const values: number[] = [];
    Reflect.set(window, "albumProgress", values);
    new MutationObserver(() => {
      const bar = document.querySelector<HTMLProgressElement>(".mobile-page-body .mobile-page-loading:not([data-handoff]) progress");
      if (bar && values.at(-1) !== bar.value) values.push(bar.value);
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["value"] });
  });
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Album" }).click();
  await expect(page.getByRole("progressbar", { name: "Loading page... Album" })).toHaveAttribute("max", "100");
  await expect(page.locator(".mobile-shell-header__identity")).toBeHidden();
  await expect(page.locator("body > .mobile-page-title")).toHaveText("Album");
  await expect(page.locator(".mobile-page-loading progress")).toHaveAttribute("value", "100");
  await expect(page.locator(".mobile-page-loading")).toHaveCount(0);
  const values = await page.evaluate(() => Reflect.get(window, "albumProgress") as number[]);
  expect(values.length).toBeGreaterThan(3);
  expect(values.every((value) => Number.isInteger(value) && value < 100)).toBe(true);
  expect(values.slice(1).some((value, index) => value - values[index] === 1)).toBe(true);
});

test("the Album title stays mounted when opening and leaving detail without an overlay", async ({ page }) => {
  const item = {
    id: "weekend", name: "Weekend", owner: { id: "u1", username: "viewer" },
    createdAt: new Date().toISOString(), isPublic: false, mediaCount: 0,
  };
  await page.route("**/api/library/album/page*", route => route.fulfill({ json: { items: [item], hasMore: false } }));
  await page.route("**/api/library/album/weekend", route => route.fulfill({ json: item }));
  await page.route("**/api/library/album/weekend/media?*", route => route.fulfill({ json: { items: [], offset: 0, total: 0 } }));
  await page.goto("/album");
  const header = page.getByRole("banner");
  const title = header.locator(".mobile-page-title");
  await expect(title).toHaveText("Album");
  await expect(header.getByRole("button", { name: "Back", exact: true })).toHaveCount(0);
  await title.evaluate((element) => { element.dataset.sharedTitle = "true"; });
  await page.evaluate(() => {
    new MutationObserver(() => {
      if (document.querySelector(".mobile-page-body .mobile-page-loading")) document.body.dataset.detailOverlay = "true";
    }).observe(document.body, { childList: true, subtree: true });
  });
  await page.getByRole("link", { name: "Open album Weekend" }).click();
  await expect(page).toHaveURL(/\/album\/weekend$/);
  await expect(page.getByRole("heading", { name: /Weekend/ })).toBeVisible();
  await expect(title).toHaveAttribute("data-shared-title", "true");
  await expect(header.getByRole("button", { name: "Back", exact: true })).toBeVisible();
  await header.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/album$/);
  await expect(header.getByRole("button", { name: "Back", exact: true })).toHaveCount(0);
  await expect(title).toHaveAttribute("data-shared-title", "true");
  await expect(page.locator("body")).not.toHaveAttribute("data-detail-overlay", "true");
});

test("changing tabs abandons the pending component load", async ({ page }) => {
  const moduleResponse = holdResponse();
  let albumRequests = 0;
  await page.route("**/gallery/MobileAlbumsPage.tsx*", async (route) => {
    await moduleResponse.pending;
    await route.continue();
  });
  await page.route("**/api/library/album/page*", (route) => {
    albumRequests++;
    return route.fulfill({ json: { items: [], hasMore: false } });
  });
  try {
    await page.goto("/");
    const navigation = page.getByRole("navigation", { name: "Main navigation" });
    await navigation.getByRole("link", { name: "Album" }).click();
    await expect(page.getByRole("progressbar", { name: "Loading page... Album" })).toBeVisible();
    await expect(navigation).toHaveAttribute("data-item", "album");

    await navigation.getByRole("link", { name: "User" }).click();
    await expect(page).toHaveURL(/\/user$/);
    await expect(navigation).toHaveAttribute("data-item", "user");
    await expect(page.locator(".mobile-page-loading")).toHaveCount(0);
    moduleResponse.release();
    await expect(page.getByRole("searchbox", { name: "Search users" })).toBeVisible();
    expect(albumRequests).toBe(0);
  } finally {
    moduleResponse.release();
  }
});

for (const [path, endpoint, layout, empty, data] of [
  ["/user", "**/api/user", "users", "No users yet", []],
  ["/uploads", "**/api/sync/upload/admin/batch?*", "cards", "No uploads yet", { items: [], totalItems: 0 }],
  ["/location/saved", "**/api/place/saved/page?*", "rows", "No saved places yet", { items: [], page: 1, limit: 30, total: 0 }],
  ["/location/history", "**/api/place/history/page?*", "rows", "No visits yet", { items: [], page: 1, limit: 30, total: 0 }],
] as const) {
  test(`${path} shows its own placeholders while data is pending`, async ({ page }) => {
    const response = holdResponse();
    await page.route(endpoint, async (route) => {
      await response.pending;
      await route.fulfill({ json: data });
    });

    try {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const placeholder = page.locator(`.mobile-content-placeholder[data-layout="${layout}"]`);
      await expect(placeholder).toBeVisible();
      await expect(page.locator(".mobile-page-loading")).toHaveCount(0);
      await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
      response.release();
      await expect(placeholder).toHaveCount(0);
      await expect(page.getByText(empty, { exact: true })).toBeVisible();
    } finally {
      response.release();
    }
  });
}

test("mobile navigation respects system reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("shinigacim.animations-enabled", "true"));
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Album" }).click();
  await expect(page.getByRole("heading", { name: "Album", exact: true })).toBeVisible();
  await expect(page.locator(".mobile-page-loading")).toHaveCount(0);
  await expect(page.locator(".mobile-menu-bar__indicator")).toHaveCSS("transition-duration", "0s");
});

test("the Album list uses the Home tab while data is still loading", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let releaseGallery!: () => void;
  const galleryResponse = new Promise<void>((resolve) => { releaseGallery = resolve; });
  await page.route("**/api/library/album/page*", async (route) => {
    await galleryResponse;
    await route.fulfill({ json: { items: [], total: 0, offset: 0, limit: 5, hasMore: false } });
  });

  await page.goto("/");
  const navigation = page.locator(".mobile-menu-bar");
  const home = navigation.getByRole("link", { name: "Home" });
  await navigation.getByRole("link", { name: "Album" }).click();
  try {
    await expect(page.locator(".mobile-albums-page .album-date-card--placeholder")).toHaveCount(2);
    await expect(navigation).toBeVisible();
    await expect(page.getByRole("button", { name: "Back", exact: true })).toHaveCount(0);
    await home.click();
    await expect(page).toHaveURL(/\/$/);
  } finally {
    releaseGallery();
  }
  await expect(page.locator(".mobile-page-loading")).toHaveCount(0);
  await home.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(home).toHaveAttribute("aria-current", "page");
});

for (const colorScheme of ["light", "dark"] as const) {
test(`Album navigation and Add bar work in ${colorScheme} mode`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme, reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim.animations-enabled", "true");
    const transitions: { property: string; overlay: boolean }[] = [];
    Reflect.set(window, "createTransitions", transitions);
    document.addEventListener("transitionrun", ({ target, propertyName }) => {
      if (target instanceof HTMLElement && target.matches(".mobile-albums-page__create")) {
        transitions.push({ property: propertyName, overlay: !!document.querySelector(".mobile-page-loading:not([data-handoff])") });
      }
    });
  });
  await page.goto("/");
  const nav = page.locator(".mobile-menu-bar");
  await nav.getByRole("link", { name: "Album" }).click();
  await expect(page.locator(".mobile-page-loading")).toHaveCount(0);
  const create = page.getByRole("button", { name: "Add album", exact: true });
  await expect(create).toBeVisible();
  await expect(create).toHaveCSS("transform", "none");
  await expect(create).toHaveCSS("opacity", "1");
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: "Album" })).toHaveAttribute("aria-current", "page");
  await expect(create).toHaveCSS("border-radius", await nav.evaluate((element) => getComputedStyle(element).borderRadius));
  const back = page.getByRole("button", { name: "Back", exact: true });
  await expect(back).toHaveCount(0);
  const transitions = await page.evaluate((): { property: string; overlay: boolean }[] =>
    Reflect.get(window, "createTransitions"));
  expect(transitions).toEqual(expect.arrayContaining([
    expect.objectContaining({ property: "opacity", overlay: false }),
    expect.objectContaining({ property: "transform", overlay: false }),
  ]));
  await create.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "New album" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await nav.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(nav).toBeVisible();
  await expect(page.locator(".mobile-albums-page__create")).toHaveCount(0);
  await page.goto("/album");
  await nav.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL(/\/$/);
});
}

test("the Home item returns Home after opening More pages and Album", async ({ page }) => {
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
  await navigation.getByRole("link", { name: "Album" }).click();
  await expect(page).toHaveURL(/\/album$/);
  await expect(back).toHaveCount(0);
  await navigation.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("main", { name: "Home" })).toBeEmpty();
  await expect(menu).not.toBeVisible();
});

for (const preference of ["enabled", "disabled", "reduced"] as const) {
  test(`album detail header returns to Album with motion ${preference}`, async ({ page }) => {
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

    await page.goto("/album");
    const header = page.getByRole("banner");
    const back = header.getByRole("button", { name: "Back", exact: true });
    const title = header.getByText("Album", { exact: true });
    const position = page.locator(".mobile-shell-header__title-position");
    const steps = () => page.evaluate((): string[] => Reflect.get(window, "albumHeaderSteps"));
    await expect(back).toBeVisible();
    const listX = (await title.boundingBox())!.x;
    await page.evaluate(() => { Reflect.get(window, "albumHeaderSteps").length = 0; });
    await page.getByRole("link", { name: "Open album Weekend" }).click();
    await expect(page).toHaveURL(/\/album\/album-test$/);
    await expect(page.locator(".mobile-page-loading")).toHaveCount(0);
    await expect(back).toHaveCSS("opacity", "1");
    expect((await title.boundingBox())!.x).toBeCloseTo(listX, 0);
    expect(await steps()).toEqual([]);
    await expect(page.locator(".mobile-menu-bar")).toBeVisible();
    await expect(page.locator(".mobile-albums-page__create")).toHaveCount(0);

    await back.click();
    await expect(page).toHaveURL(/\/album$/);
    await expect(back).toBeVisible();
    await expect(position).not.toHaveCSS("margin-inline-start", "0px");
    expect((await title.boundingBox())!.x).toBeCloseTo(listX, 0);
    expect(await steps()).toEqual([]);
    await expect(page.locator(".mobile-menu-bar")).toBeVisible();
    await expect(page.locator(".mobile-albums-page__create")).toBeVisible();
    if (preference !== "enabled") {
      await expect(page.locator(".mobile-albums-page__create")).toHaveCSS("transition-duration", "0s");
      await expect(page.locator(".mobile-menu-bar")).toHaveCSS("transition-duration", "0s");
    }

    if (preference === "reduced") {
      await page.goto("/album/album-test");
      await back.click();
      await expect(page).toHaveURL(/\/album$/);
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

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

test("Profile reserves the avatar grid and expands the center action into Save avatar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => localStorage.setItem("shinigacim.animations-enabled", "true"));
  const user = { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" };
  const profile = holdResponse();
  const save = holdResponse();
  const requests: string[] = [];
  await page.route("**/api/user/me", async (route) => {
    await profile.pending;
    await route.fulfill({ json: user });
  });
  await page.route("**/api/library/album/media/mine/count", async (route) => {
    await profile.pending;
    await route.fulfill({ json: { images: 32, videos: 4 } });
  });
  await page.route("**/api/user/me/avatar", async (route) => {
    const { seed } = route.request().postDataJSON() as { seed: string };
    requests.push(seed);
    await save.pending;
    await route.fulfill({ json: { ...user, avatarSeed: seed } });
  });

  await page.goto("/");
  const center = page.locator(".mobile-menu-bar__add");
  const menu = page.locator(".mobile-menu-bar");
  await expect(center).toHaveCSS("border-radius", "50%");
  const original = await center.elementHandle();
  const transitions: string[] = [];
  await page.exposeFunction("recordProfileTransition", (property: string) => { transitions.push(property); });
  await page.evaluate(() => {
    document.addEventListener("transitionrun", ({ target, propertyName }) => {
      if (!(target instanceof Element)) return;
      const records = Reflect.get(window, "recordProfileTransition");
      if (target.matches(".mobile-menu-bar") && propertyName === "transform") records("menu slide");
      if (target.matches(".mobile-menu-bar__add") && ["inline-size", "width"].includes(propertyName)) records("action expansion");
    });
  });
  const profileLink = page.locator(".mobile-home-header__identity");
  await profileLink.click();
  const saveButton = page.getByRole("button", { name: "Save avatar", exact: true });
  const grid = page.locator(".mobile-avatar-picker__options");

  try {
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeDisabled();
    await expect(saveButton.locator("svg")).toHaveCount(0);
    await expect(menu).toHaveAttribute("inert", "");
    await expect.poll(() => transitions).toEqual(expect.arrayContaining(["action expansion", "menu slide"]));
    await expect.poll(() => menu.evaluate((element) => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(844);
    const menuWidth = (await menu.boundingBox())!.width;
    await expect.poll(async () => (await center.boundingBox())?.width).toBeCloseTo(menuWidth, 0);
    expect(await center.evaluate((element, initial) => element === initial, original)).toBe(true);
    await expect(grid.locator(".mobile-avatar-picker__placeholder")).toHaveCount(8);
    const placeholderBounds = await grid.boundingBox();

    profile.release();
    const candidate = grid.getByRole("radio", { name: "Avatar 1", exact: true });
    await expect(candidate).toBeAttached();
    expect(await grid.boundingBox()).toEqual(placeholderBounds);
    await candidate.focus();
    await page.keyboard.press("Space");
    await expect(saveButton).toBeEnabled();
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByRole("img", { name: "Selected avatar" })).toBeVisible();
    await saveButton.click();
    await expect(saveButton).toHaveAttribute("aria-busy", "true");
    await expect(saveButton).toBeDisabled();
    save.release();
    await expect(page.locator(".mobile-profile__avatar img")).toHaveAttribute("src", /avatar%3A0%3A0/);
    await expect(saveButton).toBeDisabled();
    expect(requests).toEqual(["u1:avatar:0:0"]);
  } finally {
    profile.release();
    save.release();
  }

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(menu).not.toHaveAttribute("inert", "");
  await expect(center).toHaveCSS("border-radius", "50%");
  await expect(center.locator("svg")).toHaveCount(1);
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
  await expect(album).toHaveCSS("font-weight", "500");
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

  const userBounds = (await navigation.getByRole("link", { name: "User" }).boundingBox())!;
  const farRight = { x: userBounds.x + userBounds.width / 2, y };
  await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
  await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [farRight] });
  await expect(navigation).toHaveAttribute("data-item", "place");
  await expect(page).toHaveURL(/\/album$/);
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page).toHaveURL(/\/location$/);
  await expect(navigation.getByRole("link", { name: "Place" })).toHaveAttribute("aria-current", "page");
});

test("mobile tab drag from bar padding or an inactive tab moves only one index", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/album");
  const navigation = page.locator(".mobile-menu-bar");
  const home = navigation.getByRole("link", { name: "Home" });
  const album = navigation.getByRole("link", { name: "Album" });
  const user = navigation.getByRole("link", { name: "User" });
  await expect(album).toHaveAttribute("aria-current", "page");
  const barBounds = (await navigation.boundingBox())!;
  const homeBounds = (await home.boundingBox())!;
  const userBounds = (await user.boundingBox())!;
  const left = homeBounds.x + homeBounds.width / 2;
  const right = userBounds.x + userBounds.width / 2;
  const y = homeBounds.y + homeBounds.height / 2;

  await page.mouse.move(barBounds.x + 2, y);
  await page.mouse.down();
  await page.mouse.move(right, y);
  await expect(navigation).toHaveAttribute("data-item", "place");
  await expect(album).toHaveAttribute("aria-current", "page");
  await page.mouse.up();
  await expect(page).toHaveURL(/\/location$/);

  await page.mouse.move(right, y);
  await page.mouse.down();
  await page.mouse.move(left, y);
  await expect(navigation).toHaveAttribute("data-item", "album");
  await page.mouse.up();
  await expect(page).toHaveURL(/\/album$/);

  await home.click();
  await expect(page).toHaveURL(/\/$/);
  await page.mouse.move(right, y);
  await page.mouse.down();
  await page.mouse.move(left, y);
  await page.mouse.up();
  await expect(home).toHaveAttribute("aria-current", "page");
  await user.click();
  await expect(page).toHaveURL(/\/user$/);
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
    await expect(navigation).toHaveCSS("border-radius", "12px");
    await expect(navigation).toHaveAttribute("data-item", "home");
    const navigationBounds = await navigation.boundingBox();
    const homeTabBounds = await homeTab.boundingBox();
    const pageGutter = await page.locator("html").evaluate((root) => Number.parseFloat(getComputedStyle(root).getPropertyValue("--page-gutter")));
    expect(navigationBounds?.height).toBe(56);
    await expect(navigation).toHaveCSS("padding-block", "3px");
    expect(homeTabBounds?.height).toBeGreaterThanOrEqual(48);
    expect(homeTabBounds?.width).toBeGreaterThanOrEqual(48);
    expect(navigationBounds?.x).toBeCloseTo(pageGutter, 1);
    expect(width - navigationBounds!.x - navigationBounds!.width).toBeCloseTo(pageGutter, 1);
    await expect(homeTab).toHaveCSS("font-size", "12px");
    await expect(homeTab).toHaveAttribute("aria-current", "page");
    await expect(navigation).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(indicator).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    const notifications = page.getByRole("button", { name: "Notifications" });
    const more = page.getByRole("button", { name: "More", exact: true });
    const add = page.getByRole("button", { name: "Add", exact: true });
    for (const control of [notifications, more]) {
      await expect(control.locator("svg")).toHaveCSS("width", "20px");
      await expect(control.locator("svg")).toHaveCSS("height", "20px");
    }
    const tabs = await navigation.getByRole("link").all();
    const menuControls = [...tabs.slice(0, 2), add, ...tabs.slice(2)];
    let previousRight = 0;
    for (const control of menuControls) {
      const icon = control.locator("svg");
      await expect(icon).toHaveCSS("width", "24px");
      await expect(icon).toHaveCSS("height", "24px");
      const bounds = (await control.boundingBox())!;
      expect(bounds.width).toBeGreaterThanOrEqual(48);
      expect(bounds.height).toBeGreaterThanOrEqual(48);
      expect(bounds.x).toBeGreaterThanOrEqual(previousRight - 0.5);
      previousRight = bounds.x + bounds.width;
      if (await control.getAttribute("data-menu-item")) {
        const iconBounds = (await icon.boundingBox())!;
        const label = (await control.locator("span").boundingBox())!;
        expect(iconBounds.y).toBeGreaterThanOrEqual(bounds.y);
        expect(label.y - iconBounds.y - iconBounds.height).toBeCloseTo(4);
        expect(label.y + label.height).toBeLessThanOrEqual(bounds.y + bounds.height);
      }
    }
    expect((await add.boundingBox())?.width).toBe(56);
    expect((await add.boundingBox())?.height).toBe(56);
    await expect(page.locator(".mobile-shell")).toHaveCSS("background-color", "rgb(234, 231, 227)");
    await expect(navigation).toHaveCSS("border-top-color", "rgb(232, 230, 227)");
    await expect(notifications).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(notifications).toHaveCSS("border-top-width", "0px");
    await notifications.click();
    await expect(page.getByRole("banner").getByRole("region", { name: "Notifications" })).toBeInViewport({ ratio: 1 });
    await page.keyboard.press("Escape");
    await expect(notifications).toBeFocused();
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
    await page.getByText("Dark", { exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "dark");
    await page.getByText("System", { exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "light");
    const back = page.getByRole("button", { name: "Back", exact: true });
    await expect(back.locator("svg")).toHaveCSS("width", "20px");
    await expect(back.locator("svg")).toHaveCSS("height", "20px");
    await back.click();
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "dark");
    await expect(page.locator(".mobile-shell")).toHaveCSS("background-color", "rgb(28, 28, 28)");
    await expect(notifications).toHaveCSS("background-color", "rgb(48, 48, 48)");
    await expect(more).toHaveCSS("background-color", "rgb(48, 48, 48)");
    await expect(navigation).toHaveCSS("background-color", "rgb(48, 48, 48)");
    await expect(navigation).toHaveCSS("box-shadow", /rgba\(0, 0, 0, 0\.12\).*rgba\(0, 0, 0, 0\.24\)/);
    await expect(indicator).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
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

for (const colorScheme of ["light", "dark"] as const) {
  test(`mobile menu highlights icons in ${colorScheme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    const home = nav.getByRole("link", { name: "Home" });
    const album = nav.getByRole("link", { name: "Album" });
    const place = nav.getByRole("link", { name: "Place" });
    const user = nav.getByRole("link", { name: "User" });
    const selected = colorScheme === "dark" ? "rgb(255, 255, 255)" : "rgb(34, 34, 34)";
    const unselected = colorScheme === "dark" ? "rgb(205, 205, 205)" : "rgb(75, 75, 75)";
    const cutout = colorScheme === "dark" ? "rgb(48, 48, 48)" : "rgb(255, 255, 255)";

    await expect(home.locator("svg")).toHaveClass(/lucide-activity/);
    await expect(album.locator('circle[r="3"]')).toHaveCount(1);
    await expect(place.locator('circle[r="10"]')).toHaveCount(1);
    await expect(user.locator('circle[r="5"]')).toHaveCount(1);
    await expect(user.locator("circle")).toHaveCount(1);
    const activity = home.locator("svg path");
    const userBody = user.locator("svg path");
    const tabs = [
      { tab: place, fill: place.locator("circle") },
      { tab: user, fill: user.locator("circle") },
      { tab: album, fill: album.locator("path") },
      { tab: home, fill: null },
    ];

    for (const { tab: active, fill } of tabs) {
      await active.click();
      await expect(active).toHaveAttribute("aria-current", "page");
      await expect(active).toHaveCSS("color", selected);
      await expect(active).toHaveCSS("font-weight", "500");
      await expect(active).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      if (fill) {
        await expect(fill).toBeVisible();
        await expect(fill).toHaveCSS("fill", selected);
      }
      for (const { tab: inactive } of tabs.filter(({ tab }) => tab !== active)) {
        await expect(inactive).toHaveCSS("color", unselected);
        await expect(inactive.locator("svg")).toHaveCSS("fill", "none");
        await expect(inactive.locator("svg")).toHaveCSS("stroke", unselected);
      }
      if (active === album || active === place) {
        await expect(active.locator("[data-icon-detail]")).toHaveCSS("fill", cutout);
        await expect(active.locator("[data-icon-detail]")).toHaveCSS("stroke", cutout);
      }
      await expect(activity).toBeVisible();
      await expect(activity).toHaveCSS("fill", "none");
      await expect(activity).toHaveCSS("stroke-width", "2px");
      await expect(activity).toHaveCSS("stroke", active === home ? selected : unselected);
      await expect(userBody).toHaveCSS("stroke-linecap", active === user ? "butt" : "round");
      if (active === user) await expect(userBody).toHaveCSS("fill", selected);
    }
  });
}

test("mobile Activity icon pulses on hover and respects reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => localStorage.setItem("shinigacim.animations-enabled", "true"));
  await page.goto("/");
  const home = page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Home" });
  const activity = home.locator("svg");
  const transform = () => activity.evaluate((icon) => getComputedStyle(icon).transform);
  const initial = await transform();
  await home.getByText("Home", { exact: true }).hover();
  await expect.poll(transform, { intervals: [16, 32, 64] }).not.toBe(initial);
  await expect(activity.locator("path")).toHaveCSS("vector-effect", "non-scaling-stroke");
  await page.mouse.move(1, 1);
  await expect.poll(transform).toBe(initial);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await home.getByText("Home", { exact: true }).hover();
  const transforms = await activity.evaluate(async (icon) => {
    const samples = [];
    const start = performance.now();
    do {
      await new Promise(requestAnimationFrame);
      samples.push(getComputedStyle(icon).transform);
    } while (performance.now() - start < 150);
    return [...new Set(samples)];
  });
  expect(transforms).toEqual([initial]);
});

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

test("the Album API starts while the route overlay finishes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
  await page.addInitScript(() => localStorage.setItem("shinigacim.animations-enabled", "true"));
  await page.goto("/");
  await page.evaluate(() => {
    const fetchRequest = window.fetch;
    window.fetch = (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (new URL(url, location.href).pathname === "/api/library/album/page") {
        const overlay = document.querySelector(".mobile-page-body > .mobile-page-loading");
        document.documentElement.dataset.albumFetchStarted = overlay ? "during-overlay" : "after-overlay";
      }
      return fetchRequest(input, init);
    };
  });
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
    const menuBounds = await navigation.boundingBox();
    expect(menuBounds).not.toBeNull();
    const { offsetX, offsetY } = await overlay.locator(".mobile-page-loading__content").evaluate((element, menuTop) => {
      const bounds = element.getBoundingClientRect();
      return {
        offsetX: bounds.left + bounds.width / 2 - innerWidth / 2,
        offsetY: bounds.top + bounds.height / 2 - menuTop / 2,
      };
    }, menuBounds!.y);
    expect(offsetX).toBeCloseTo(0, 0);
    expect(offsetY).toBeCloseTo(0, 0);
    await expect(overlay.locator(".ui-resource-progress__meter")).toHaveCSS("background-color", /^color\(srgb /);
    await expect(navigation).toHaveAttribute("data-item", "album");
    await expect(navigation.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(page.getByRole("button", { name: "More", exact: true })).toBeEnabled();
    expect(feedRequested).toBe(false);

    moduleResponse.release();
    await expect(page).toHaveURL(/\/album$/);
    await expect.poll(() => feedRequested).toBe(true);
    await expect(page.locator("html")).toHaveAttribute("data-album-fetch-started", "during-overlay");
    await expect(overlay).toHaveCount(0);
    await expect(placeholders).toHaveCount(2);
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

test("leaving before the route resolves skips the abandoned page request", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => localStorage.setItem("shinigacim.animations-enabled", "true"));
  await page.goto("/");
  const moduleResponse = holdResponse();
  await page.route("**/gallery/MobileAlbumsPage.tsx*", async (route) => {
    await moduleResponse.pending;
    await route.continue();
  });
  let albumRequests = 0;
  await page.route("**/api/library/album/page*", (route) => {
    albumRequests += 1;
    return route.fulfill({ json: { items: [], hasMore: false } });
  });

  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  try {
    await navigation.getByRole("link", { name: "Album" }).click();
    await expect(page.getByRole("progressbar", { name: "Loading page... Album" })).toBeVisible();
    await navigation.getByRole("link", { name: "User" }).click();
    await expect(page.getByRole("searchbox", { name: "Search users" })).toBeVisible();
    moduleResponse.release();
    await expect(page.locator(".mobile-page-loading")).toHaveCount(0);
    expect(albumRequests).toBe(0);
  } finally {
    moduleResponse.release();
  }
});

test("cached navigation fills in one-percent steps before fading the overlay", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => localStorage.setItem("shinigacim.animations-enabled", "true"));
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await navigation.getByRole("link", { name: "Album" }).click();
  await expect(page.getByText("No albums yet")).toBeVisible();
  await expect(page.locator(".mobile-page-loading")).toHaveCount(0);
  await page.evaluate(() => {
    let shownAt: number | undefined;
    const observer = new MutationObserver(() => {
      const fill = document.querySelector(".mobile-page-body .ui-resource-progress__fill");
      if (fill) {
        if (shownAt === undefined) {
          const style = getComputedStyle(fill, "::before");
          document.documentElement.dataset.overlayProgressTiming = style.animationTimingFunction;
          document.documentElement.dataset.overlayProgressDuration = style.animationDuration;
        }
        shownAt ??= performance.now();
      } else if (shownAt !== undefined) {
        document.documentElement.dataset.overlayDuration = String(performance.now() - shownAt);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

  await navigation.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(navigation.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("html")).toHaveAttribute("data-overlay-duration", /\d/);
  const duration = Number(await page.locator("html").getAttribute("data-overlay-duration"));
  expect(duration).toBeGreaterThanOrEqual(890);
  expect(duration).toBeLessThan(1200);
  await expect(page.locator("html")).toHaveAttribute("data-overlay-progress-timing", /^steps\(100(?:, (?:jump-)?end)?\)$/);
  await expect(page.locator("html")).toHaveAttribute("data-overlay-progress-duration", "0.5s");
});

test("Album loading fills, fades, and slides the title with Interface motion off", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => localStorage.setItem("shinigacim.animations-enabled", "false"));
  await page.goto("/");
  const moduleResponse = holdResponse();
  await page.route("**/gallery/MobileAlbumsPage.tsx*", async (route) => {
    await moduleResponse.pending;
    await route.continue();
  });
  await page.evaluate(() => {
    const values: number[] = [];
    Reflect.set(window, "albumProgress", values);
    new MutationObserver(() => {
      const bar = document.querySelector<HTMLProgressElement>(".mobile-page-body .mobile-page-loading:not([data-complete]) progress");
      if (bar && values.at(-1) !== bar.value) values.push(bar.value);
      const title = document.querySelector("body > .mobile-page-title");
      const overlay = document.querySelector(".mobile-page-loading[data-handoff]");
      const handoffBar = overlay?.querySelector("progress");
      const fill = overlay?.querySelector(".ui-resource-progress__fill");
      if (title && fill && handoffBar?.value === 100) {
        const fade = overlay?.getAnimations().find(({ effect }) =>
          effect instanceof KeyframeEffect && effect.getKeyframes().some(({ opacity }) => opacity === "0"));
        const slide = title.getAnimations().find(({ effect }) =>
          effect instanceof KeyframeEffect && effect.getKeyframes().some(({ transform }) => typeof transform === "string"));
        document.body.dataset.completedTitle = title.textContent ?? "";
        document.body.dataset.completedFill = String(new DOMMatrix(getComputedStyle(fill, "::before").transform).a);
        document.body.dataset.handoffDurations = JSON.stringify([fade?.effect?.getTiming().duration, slide?.effect?.getTiming().duration]);
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["value"] });
  });
  try {
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Album" }).click();
    await expect(page.getByRole("progressbar", { name: "Loading page... Album" })).toHaveAttribute("max", "100");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    const fill = page.locator(".mobile-page-loading .ui-resource-progress__fill");
    expect(await fill.evaluate((element) => getComputedStyle(element, "::before").animationDuration)).toBe("0.5s");
    await expect(page.locator(".mobile-shell-header__identity")).toBeHidden();
  } finally {
    moduleResponse.release();
  }
  await expect(page.locator("body")).toHaveAttribute("data-completed-title", "Album");
  await expect(page.locator("body")).toHaveAttribute("data-completed-fill", "1");
  await expect(page.locator("body")).toHaveAttribute("data-handoff-durations", "[400,400]");
  await expect(page.locator(".mobile-page-loading")).toHaveCount(0);
  const values = await page.evaluate(() => Reflect.get(window, "albumProgress") as number[]);
  expect(values.length).toBeGreaterThan(0);
  expect(values.every((value) => Number.isInteger(value) && value < 100)).toBe(true);
});

test("album detail loops photos and muted video, with hold and volume controls", async ({ page }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => localStorage.setItem("shinigacim.animations-enabled", "true"));
  const clip = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const context = canvas.getContext("2d")!;
    const stream = canvas.captureStream(20);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
    const recorded = new Promise<Blob>((resolve) => { recorder.ondataavailable = ({ data }) => resolve(data); });
    recorder.start();
    const paint = window.setInterval(() => {
      context.fillStyle = performance.now() % 200 < 100 ? "#123456" : "#654321";
      context.fillRect(0, 0, 32, 32);
    }, 50);
    await new Promise((resolve) => window.setTimeout(resolve, 1800));
    recorder.stop();
    window.clearInterval(paint);
    stream.getTracks().forEach((track) => track.stop());
    return Array.from(new Uint8Array(await (await recorded).arrayBuffer()));
  });
  const photo = { id: "still", mediaKind: "image", originalFilename: "Still.jpg", isFavorited: false };
  const video = { id: "clip", mediaKind: "video", originalFilename: "Clip.webm", isFavorited: false };
  const nextVideo = { ...video, id: "next-clip", originalFilename: "Next clip.webm" };
  const album = {
    id: "slideshow", name: "Slideshow", owner: { id: "u1", username: "viewer" },
    isPublic: true, imageCount: 1, videoCount: 2, mediaCount: 3, createdAt: new Date().toISOString(),
  };
  await page.route("**/api/library/album/slideshow", (route) => route.fulfill({ json: album }));
  await page.route("**/api/library/album/page*", (route) => route.fulfill({ json: { items: [album], hasMore: false } }));
  await page.route("**/api/library/album/slideshow/media?*", (route) => route.fulfill({
    json: { items: [photo, video, nextVideo], total: 3, offset: 0 },
  }));
  await page.route("**/api/library/album/media/*/file?*", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("clip/file") && !url.searchParams.has("preview")) {
      return route.fulfill({ contentType: "video/webm", body: Buffer.from(clip) });
    }
    return route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24"><rect width="32" height="24" fill="#123456"/></svg>',
    });
  });
  await page.goto("/album/slideshow");
  const carousel = page.getByRole("region", { name: "Album media" });
  const imageFrame = carousel.getByRole("button", { name: photo.originalFilename });
  const unmute = carousel.getByRole("button", { name: "Unmute video" });
  const mute = carousel.getByRole("button", { name: "Mute video" });
  await expect(imageFrame).toBeVisible();
  await imageFrame.hover();
  await page.mouse.down();
  await page.waitForTimeout(4200);
  await expect(imageFrame).toBeVisible();
  await expect(imageFrame).toHaveCSS("scale", "none");
  await page.mouse.up();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const player = carousel.locator("video:not([hidden])");
  await expect(player).toHaveJSProperty("paused", false, { timeout: 6500 });
  await expect(player).toHaveJSProperty("muted", true);

  const track = carousel.locator(".mobile-album-carousel__track");
  await expect.poll(() => track.evaluate((element) => element.scrollLeft - element.clientWidth)).toBe(0);
  const bounds = (await track.boundingBox())!;
  const touch = await page.context().newCDPSession(page);
  const y = bounds.y + bounds.height / 2;
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: bounds.x + bounds.width * 0.15, y }],
  });
  await expect(player).toHaveJSProperty("paused", true);
  await page.waitForTimeout(400);
  for (const fraction of [0.25, 0.4, 0.6, 0.8, 0.95]) {
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove", touchPoints: [{ x: bounds.x + bounds.width * fraction, y }],
    });
    await page.waitForTimeout(30);
  }
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(track).toHaveJSProperty("scrollLeft", 0);
  await expect(imageFrame).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.mouse.move(bounds.x + bounds.width * 0.9, y);
  await page.mouse.down();
  await page.waitForTimeout(400);
  await page.mouse.move(bounds.x + bounds.width * 0.15, y, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => track.evaluate((element) => element.scrollLeft - element.clientWidth)).toBe(0);
  await expect(player).toHaveJSProperty("paused", false);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await expect(unmute.locator(".lucide-volume-x")).toBeVisible();
  const collapsed = (await unmute.boundingBox())!;
  await unmute.click();
  await expect(player).toHaveJSProperty("muted", false);
  const slider = carousel.getByRole("slider", { name: "Video volume" });
  await expect(slider).toHaveValue("75");
  const sliderControl = carousel.locator(".mobile-album-carousel__volume-control");
  const reveal = carousel.locator(".mobile-album-carousel__volume-reveal");
  await expect(reveal).toHaveCSS("width", "104px");
  const sliderBounds = (await sliderControl.boundingBox())!;
  const expanded = (await mute.boundingBox())!;
  expect(expanded.x).toBeLessThan(collapsed.x);
  expect(sliderBounds.x).toBeGreaterThanOrEqual(expanded.x + expanded.width);
  expect(expanded.y + expanded.height / 2).toBeCloseTo(sliderBounds.y + sliderBounds.height / 2, 0);
  await sliderControl.click({ position: { x: 25, y: 24 } });
  await expect(mute.locator(".lucide-volume-1")).toBeVisible();
  await slider.press("End");
  await expect(player).toHaveJSProperty("volume", 1);
  await expect(mute.locator(".lucide-volume-2")).toBeVisible();
  await mute.click();
  await expect(player).toHaveJSProperty("muted", true);
  await expect(slider).toHaveCount(0);
  await expect(reveal).toHaveCSS("width", "0px");
  await unmute.click();
  await expect(slider).toHaveValue("100");

  await track.press("ArrowRight");
  await expect(player).toHaveAttribute("src", /\/next-clip\/file/);
  await expect(player).toHaveJSProperty("muted", false);
  await expect(player).toHaveJSProperty("volume", 1);
  await expect(player).toHaveJSProperty("paused", false);
  await expect(imageFrame).toBeVisible({ timeout: 6500 });
  await expect(mute).toBeHidden();
  await track.press("ArrowRight");
  await expect(player).toHaveJSProperty("muted", false);
  await expect(player).toHaveJSProperty("volume", 1);
  await expect(player).toHaveJSProperty("paused", false);
  await player.evaluate((element: HTMLVideoElement) => { element.currentTime = 0.65; });
  await expect.poll(() => player.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThanOrEqual(0.65);
  await carousel.getByRole("button", { name: video.originalFilename }).click();
  const dialog = page.getByRole("dialog", { name: "Media viewer" });
  const fullscreenVideo = dialog.locator("video");
  await expect(fullscreenVideo).toHaveJSProperty("muted", false);
  await expect(fullscreenVideo).toHaveJSProperty("volume", 1);
  await expect(fullscreenVideo).toHaveJSProperty("paused", false);
  await expect.poll(() => fullscreenVideo.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThanOrEqual(0.65);
  const dock = dialog.locator(".mobile-video-player__controls");
  await expect(dock.getByRole("slider", { name: "Video progress" })).toBeVisible();
  await expect(dock.getByRole("button", { name: "Toggle fullscreen" })).toHaveCount(0);
  const fullscreenVolume = dock.getByRole("slider", { name: "Video volume" });
  await expect(fullscreenVolume).toHaveAttribute("aria-orientation", "vertical");
  await fullscreenVolume.press("ArrowDown");
  await expect(fullscreenVideo).toHaveJSProperty("volume", 0.99);
  await fullscreenVideo.evaluate((element: HTMLVideoElement) => { element.loop = true; });
  const videoBounds = await fullscreenVideo.boundingBox();
  await page.clock.install();
  const tapScreen = () => fullscreenVideo.click({ position: { x: 20, y: 100 } });
  await tapScreen();
  await expect(dock).toHaveAttribute("data-visible", "false");
  await tapScreen();
  await expect(dock).toHaveAttribute("data-visible", "true");
  await page.clock.fastForward(2500);
  await expect(dock).toHaveAttribute("data-visible", "true");
  await page.clock.fastForward(600);
  await expect(dock).toHaveAttribute("data-visible", "false");
  await expect(dock).toBeHidden();
  expect(await fullscreenVideo.boundingBox()).toEqual(videoBounds);
  await tapScreen();
  await expect(dock).toHaveAttribute("data-visible", "true");
  expect(await fullscreenVideo.boundingBox()).toEqual(videoBounds);
  await dock.getByRole("button", { name: "Pause video" }).click();
  await expect(fullscreenVideo).toHaveJSProperty("paused", true);
  await page.clock.fastForward(3100);
  await expect(dock).toBeVisible();
  await fullscreenVideo.evaluate(async (element: HTMLVideoElement) => {
    if (element.currentTime >= 1) return;
    const reachedOneSecond = new Promise<void>((resolve) => {
      const pauseAtOneSecond = () => {
        if (element.currentTime < 1) return;
        element.removeEventListener("timeupdate", pauseAtOneSecond);
        element.pause();
        resolve();
      };
      element.addEventListener("timeupdate", pauseAtOneSecond);
    });
    await element.play();
    await reachedOneSecond;
  });
  const counter = dock.locator(".mobile-video-player__time > .sr-only");
  await expect(counter).toHaveText(/^0:01/);
  const dockBounds = await dock.boundingBox();
  await dock.evaluate((element) => {
    element.setAttribute("data-test-dock", "original");
    const observer = new MutationObserver(() => {
      if (!element.hasAttribute("data-resetting-seek")) return;
      element.setAttribute("data-test-reset", "animated");
      observer.disconnect();
    });
    observer.observe(element, { attributes: true, attributeFilter: ["data-resetting-seek"] });
  });
  const stageY = videoBounds!.y + videoBounds!.height / 2;
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart", touchPoints: [{ x: videoBounds!.x + videoBounds!.width * 0.9, y: stageY }],
  });
  for (const fraction of [0.75, 0.6, 0.45, 0.25, 0.1]) {
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove", touchPoints: [{ x: videoBounds!.x + videoBounds!.width * fraction, y: stageY }],
    });
    await page.waitForTimeout(30);
  }
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(fullscreenVideo).toHaveAttribute("src", /\/next-clip\/file/);
  await expect(fullscreenVideo).toHaveJSProperty("paused", false);
  await expect(counter).toHaveText(/^0:00/);
  await expect(dock).toHaveAttribute("data-test-reset", "animated");
  await expect(dock).toHaveAttribute("data-test-dock", "original");
  expect(await dock.boundingBox()).toEqual(dockBounds);
  await dock.getByRole("button", { name: "Mute video" }).click();
  await expect(fullscreenVideo).toHaveJSProperty("muted", true);
  await expect(fullscreenVolume).toHaveCount(0);
  await dialog.getByRole("button", { name: "Close media preview" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(player).toHaveJSProperty("muted", true);
  await unmute.click();
  await expect(player).toHaveJSProperty("muted", false);

  await page.getByRole("banner").getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/album$/);
  await page.getByRole("link", { name: "Open album Slideshow" }).click();
  await expect(page).toHaveURL(/\/album\/slideshow$/);
  await track.press("ArrowRight");
  await expect(player).toHaveJSProperty("muted", true);
});

test("album list and detail skip the overlay both ways and share the header gradient", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => localStorage.setItem("shinigacim.animations-enabled", "true"));
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
  const overlay = page.locator(".mobile-page-body > .mobile-page-loading");
  await expect(overlay).toHaveCount(0);
  await title.evaluate((element) => { element.dataset.sharedTitle = "true"; });
  const gradient = await title.evaluateHandle((element) =>
    element.getAnimations().find((animation) =>
      animation instanceof CSSAnimation && animation.animationName === "ui-gradient-flow"));
  expect(await gradient.evaluate((animation) => animation?.currentTime)).toEqual(expect.any(Number));
  await page.evaluate(() => {
    const selector = ".mobile-page-loading";
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element && (node.matches(selector) || node.querySelector(selector))) {
            document.body.dataset.albumOverlayShown = "true";
          }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
  const moduleResponse = holdResponse();
  let moduleRequested = false;
  await page.route("**/gallery/MobileAlbumPage.tsx*", async (route) => {
    moduleRequested = true;
    await moduleResponse.pending;
    await route.continue();
  });
  try {
    await page.getByRole("link", { name: "Open album Weekend" }).click();
    await expect.poll(() => moduleRequested).toBe(true);
    await expect(page).toHaveURL(/\/album$/);
    await expect(overlay).toHaveCount(0);
    await expect(title).toBeVisible();
  } finally {
    moduleResponse.release();
  }
  await expect(page).toHaveURL(/\/album\/weekend$/);
  await expect(page.getByRole("heading", { name: /Weekend/ })).toBeVisible();
  await expect(title).toHaveAttribute("data-shared-title", "true");
  expect(await title.evaluate((element, animation) => element.getAnimations().includes(animation!), gradient)).toBe(true);
  await expect(page.locator("body")).not.toHaveAttribute("data-album-overlay-shown");
  await expect(header.getByRole("button", { name: "Back", exact: true })).toBeVisible();
  await header.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/album$/);
  await expect(header.getByRole("button", { name: "Back", exact: true })).toHaveCount(0);
  await expect(title).toHaveAttribute("data-shared-title", "true");
  await expect(overlay).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveAttribute("data-album-overlay-shown");
  expect(await title.evaluate((element, animation) => element.getAnimations().includes(animation!), gradient)).toBe(true);
  await gradient.dispose();
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

test("fast page data skips the loading placeholder", async ({ page }) => {
  await page.addInitScript(() => {
    const selector = ".mobile-content-placeholder[data-layout='users']";
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element && (node.matches(selector) || node.querySelector(selector))) {
            document.documentElement.setAttribute("data-placeholder-shown", "true");
          }
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });

  await page.goto("/user");
  await expect(page.getByText("No users yet", { exact: true })).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-placeholder-shown");
});

for (const [path, endpoint, layout, empty, data] of [
  ["/user", "**/api/user", "users", "No users yet", []],
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
test(`Album navigation and the center Add button work in ${colorScheme} mode`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme, reducedMotion: "no-preference" });
  await page.addInitScript(() => localStorage.setItem("shinigacim.animations-enabled", "true"));
  await page.goto("/");
  const nav = page.locator(".mobile-menu-bar");
  await expect(page.getByRole("button", { name: "Add", exact: true })).toBeDisabled();
  const center = page.locator(".mobile-menu-bar__add");
  const borderColor = colorScheme === "dark" ? "rgb(245, 245, 245)" : "rgb(255, 255, 255)";
  await expect(center).toHaveCSS("border-top-color", borderColor);
  if (colorScheme === "light") {
    await expect(center).toHaveCSS("box-shadow", /rgba\(0, 0, 0, 0\.1\).*rgba\(0, 0, 0, 0\.2\)/);
  }
  await expect(center).toHaveCSS("opacity", "1");
  await center.evaluate((button) => {
    Reflect.set(window, "originalMenuCenter", button);
  });
  const hasOriginalButton = () => center.evaluate((button) => Reflect.get(window, "originalMenuCenter") === button);
  await nav.getByRole("link", { name: "Album" }).click();
  await expect(page.locator(".mobile-page-loading")).toHaveCount(0);
  const create = page.getByRole("button", { name: "Add album", exact: true });
  await expect(create).toBeVisible();
  await expect(create).toHaveCSS("transform", "none");
  await expect(create).toHaveCSS("opacity", "1");
  expect(await hasOriginalButton()).toBe(true);
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: "Album" })).toHaveAttribute("aria-current", "page");
  await expect(create).toHaveCSS("border-radius", "50%");
  await expect(create).toHaveCSS("border-top-color", borderColor);
  await expect(create).toHaveText("");
  for (const gradient of [create, page.getByRole("banner").locator(".mobile-page-title")]) {
    await expect(gradient).toHaveCSS("animation-iteration-count", "infinite");
    const colors = await gradient.evaluate((element) => {
      const animation = element.getAnimations().find((entry) =>
        entry instanceof CSSAnimation && entry.animationName === "ui-gradient-flow")!;
      const startTime = animation.currentTime;
      const frames = [0, 3000, 6000].map((time) => {
        animation.currentTime = time;
        return getComputedStyle(element).backgroundImage;
      });
      animation.currentTime = startTime;
      return frames;
    });
    expect(colors[0]).not.toEqual(colors[1]);
    expect(colors[0]).toEqual(colors[2]);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(create).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const back = page.getByRole("button", { name: "Back", exact: true });
  await expect(back).toHaveCount(0);
  await create.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "New album" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(create).toBeFocused();
  await nav.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(nav).toBeVisible();
  await expect(page.getByRole("button", { name: "Add", exact: true })).toBeDisabled();
  expect(await hasOriginalButton()).toBe(true);
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

  for (const [label, path] of [["Settings", "/setting"], ["User profile", "/profile"], ["Upload", "/upload"]]) {
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
    await expect(back).toHaveCount(0);
    const listX = (await title.boundingBox())!.x;
    await page.evaluate(() => { Reflect.get(window, "albumHeaderSteps").length = 0; });
    await page.getByRole("link", { name: "Open album Weekend" }).click();
    await expect(page).toHaveURL(/\/album\/album-test$/);
    await expect(page.locator(".mobile-page-loading")).toHaveCount(0);
    await expect(back).toHaveCSS("opacity", "1");
    expect((await title.boundingBox())!.x).toBeGreaterThan(listX);
    if (preference === "enabled") {
      await expect.poll(steps).toEqual(expect.arrayContaining(["title", "fade", "slide"]));
    } else {
      expect(await steps()).toEqual([]);
    }
    await expect(page.locator(".page-action-bar .gallery-selection-bar")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add media", exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);

    await back.click();
    await expect(page).toHaveURL(/\/album$/);
    await expect(back).toHaveCount(0);
    await expect(position).toHaveCSS("margin-inline-start", "0px");
    expect((await title.boundingBox())!.x).toBeCloseTo(listX, 0);
    await expect(page.locator(".mobile-menu-bar")).toBeVisible();
    const create = page.getByRole("button", { name: "Add album", exact: true });
    await expect(create).toBeEnabled();
    if (preference !== "enabled") {
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
  await expect(page).toHaveURL(/\/setting$/);
  await more.click();
  await menu.getByRole("link", { name: "User profile", exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/setting");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("main", { name: "Home" })).toBeEmpty();
});

import { expect, test, type Page } from "@playwright/test";

async function expectSecondPush(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const first = (window as Window & { firstPush: Animation }).firstPush;
    return first.playState !== "running" && document.documentElement.getAnimations({ subtree: true }).some((animation) => {
      const effect = animation.effect;
      return effect instanceof KeyframeEffect && effect.getTiming().duration === 1500
        && effect.target instanceof HTMLElement && effect.target.isConnected
        && !effect.target.closest('[data-push-transition="exit"]');
    });
  }), { timeout: 4000, message: "first push should finish and a second incoming push should start" }).toBe(true);
  await expect(page.locator('[data-push-transition="exit"]')).toHaveCount(0, { timeout: 4000 });
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "" },
      accessToken: "test", refreshToken: "test",
    }, version: 0 }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      if (typeof options === "object" && options.duration === 500) {
        return animate.call(this, keyframes, { ...options, duration: 1500 });
      }
      return animate.call(this, keyframes, options);
    };
  });
  await page.route(/^https?:\/\/[^/]+\/api\//, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/place/home-location") return route.fulfill({ json: null });
    if (path === "/api/place/saved" || path === "/api/place/history/all") return route.fulfill({ json: [] });
    return route.fulfill({ json: {
      page: 1, offset: 0, limit: 30, total: 0, items: [], allCount: 0, pendingCount: 0, hasMore: false,
    } });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.abort());
});

test("rapid page navigation keeps the first push running", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".home-page")).toBeVisible();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Gallery", exact: true }).click();
  await expect(page.locator('[data-push-transition="exit"]')).toBeVisible();
  await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>("#main-content")!;
    (window as Window & { firstPush: Animation }).firstPush = main.getAnimations().find((animation) => animation.effect instanceof KeyframeEffect && animation.effect.target === main)!;
    document.querySelector<HTMLAnchorElement>('.bottom-navigation a[href="/location"]')!.click();
  });
  await expect(page).toHaveURL(/\/location$/);
  expect(await page.evaluate(() => (window as Window & { firstPush: Animation }).firstPush.playState)).toBe("running");
  await expectSecondPush(page);
});

for (const [source, selector, destination] of [
  ["/", ".home-page", "Gallery"],
  ["/album", ".gallery-layout", "Home"],
]) test(`mobile push from ${source} keeps outgoing and incoming pages aligned`, async ({ page }) => {
  await page.goto(source);
  await expect(page.locator(selector)).toBeVisible();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: destination, exact: true }).click();
  const clip = page.locator('[data-push-transition="exit"]');
  await expect(clip).toBeVisible();
  const bounds = await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>("#main-content")!;
    const clip = document.querySelector<HTMLElement>('[data-push-transition="exit"]')!;
    const incoming = main.getAnimations().find((animation) => animation.effect instanceof KeyframeEffect && animation.effect.target === main)!;
    const outgoing = clip.getAnimations({ subtree: true }).find((animation) => animation.effect instanceof KeyframeEffect)!;
    incoming.pause();
    outgoing.pause();
    incoming.currentTime = 750;
    outgoing.currentTime = 750;
    const outgoingTarget = (outgoing.effect as KeyframeEffect).target as HTMLElement;
    return {
      clipLeft: clip.getBoundingClientRect().left,
      outgoingRight: outgoingTarget.getBoundingClientRect().right,
      incomingLeft: main.getBoundingClientRect().left,
      width: clip.getBoundingClientRect().width,
      parent: clip.parentElement?.className,
    };
  });
  expect(bounds.parent).toBe("app-shell__main");
  expect(Math.abs(bounds.clipLeft)).toBeLessThan(1);
  expect(bounds.width).toBeCloseTo(390, 0);
  expect(Math.abs(bounds.outgoingRight - bounds.incomingLeft)).toBeLessThan(2);
});

test("four rapid page pushes play in order", async ({ page }) => {
  for (const [path, selector] of [
    ["/users", ".admin-page--users"],
    ["/album", ".gallery-layout"],
    ["/", ".home-page"],
  ]) {
    await page.goto(path);
    await expect(page.locator(`#main-content > ${selector}`)).toBeAttached();
  }
  await page.evaluate(() => {
    const exits: string[] = [];
    const incoming: string[] = [];
    const times: number[] = [];
    (window as Window & { pushExits: string[] }).pushExits = exits;
    (window as Window & { pushIncoming: string[] }).pushIncoming = incoming;
    (window as Window & { pushTimes: number[] }).pushTimes = times;
    new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) {
        if (!(node instanceof HTMLElement) || !node.dataset.pushTransition) continue;
        const label = node.querySelector(".home-page") ? "home"
          : node.querySelector(".admin-page--users") ? "users"
          : node.querySelector(".gallery-layout") ? "gallery" : "other";
        if (node.dataset.pushTransition === "exit") {
          times.push(performance.now());
          exits.push(label);
        } else incoming.push(label);
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
  for (const [path, selector] of [
    ["/album", ".gallery-layout"],
    ["/users", ".admin-page--users"],
    ["/album", ".gallery-layout"],
    ["/", ".home-page"],
  ]) {
    await page.evaluate((href) => {
      document.querySelector<HTMLAnchorElement>(`.bottom-navigation a[href="${href}"]`)!.click();
    }, path);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.locator(`#main-content > ${selector}`)).toBeAttached();
  }
  await expect.poll(() => page.evaluate(() => (window as Window & { pushExits: string[] }).pushExits), { timeout: 8000 })
    .toEqual(["home", "gallery", "users", "gallery"]);
  expect(await page.evaluate(() => (window as Window & { pushIncoming: string[] }).pushIncoming))
    .toEqual(["gallery", "users", "gallery", "home"]);
  const times = await page.evaluate(() => (window as Window & { pushTimes: number[] }).pushTimes);
  for (let index = 1; index < times.length; index += 1) expect(times[index] - times[index - 1]).toBeGreaterThan(1300);
  await expect(page.locator("[data-push-transition]")).toHaveCount(0, { timeout: 4000 });
});

test("reduced motion skips push animations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".home-page")).toBeVisible();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Gallery", exact: true }).click();
  await expect(page).toHaveURL(/\/album$/);
  await expect(page.locator("[data-push-transition]")).toHaveCount(0);
});

test("mobile chevron stays above every queued animation layer", async ({ page }) => {
  await page.goto("/users");
  await expect(page.locator(".admin-page--users")).toBeVisible();
  await page.evaluate(() => {
    const samples: boolean[] = [];
    (window as Window & { chevronSamples: boolean[] }).chevronSamples = samples;
    const sample = () => {
      const clips = [...document.querySelectorAll<HTMLElement>("[data-push-transition]")];
      if (clips.some((clip) => clip.dataset.pushTransition === "incoming")) {
        const toggle = document.querySelector<HTMLElement>("#main-content .page-highlight__toggle:not([data-push-transition] *)");
        const rect = toggle?.getBoundingClientRect();
        const top = rect && document.elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
          .find((element) => element === toggle || !!element.closest("[data-push-transition]"));
        samples.push(!!toggle && top === toggle && clips.every((clip) => clip.parentElement?.id === "main-content"));
      }
      if (samples.length === 0 || clips.length) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  for (const name of ["Pending", "Blocked", "All users", "Pending"]) {
    await page.getByRole("tab", { name, exact: true }).click();
  }
  await expect(page.locator("[data-push-transition]")).toHaveCount(0, { timeout: 10000 });
  const samples = await page.evaluate(() => (window as Window & { chevronSamples: boolean[] }).chevronSamples);
  expect(samples.length).toBeGreaterThan(10);
  expect(samples.every(Boolean)).toBe(true);
});

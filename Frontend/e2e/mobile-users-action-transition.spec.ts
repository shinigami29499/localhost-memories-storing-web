import { expect, test } from "@playwright/test";

test("mobile Users and Locations action bars transition in sequence", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test",
    }, version: 0 }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
  });
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/location/home-location") return route.fulfill({ json: null });
    if (path.endsWith("/page") || path.startsWith("/api/library/gallery") || path === "/api/location/travel/map") {
      return route.fulfill({ json: { page: 1, offset: 0, total: 0, limit: 30, items: [], allCount: 0, pendingCount: 0, hasMore: false } });
    }
    return route.fulfill({ json: [] });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({ json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {} }));
  await page.goto("/location/saved");
  await expect(page.getByRole("searchbox", { name: "Search saved places" })).toBeVisible();
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    (window as Window & { transitions: { name: string; time: number; frames: Keyframe[]; delay: number }[] }).transitions = [];
    (window as Window & { verticalExits: { right: number; width: number; height: number }[] }).verticalExits = [];
    (window as Window & { userMotion: { kind: string; samples: { elapsed: number; top: number; baseTop: number; width: number; left: number; parentWidth: number; overflow: string }[] }[] }).userMotion = [];
    Element.prototype.animate = function (frames, options) {
      if (Array.isArray(frames) && (this.classList.contains("page-action-bar") || this.classList.contains("map-navigation__toolbar"))) {
        const timing = typeof options === "object" ? options : undefined;
        (window as Window & { transitions: { name: string; time: number; frames: Keyframe[]; delay: number }[] }).transitions.push({
          name: this.hasAttribute("data-user-transition-exit") ? "exit" : "enter", time: performance.now(), frames, delay: timing?.delay ?? 0,
        });
      }
      const animation = original.call(this, frames, options);
      if (this.hasAttribute("data-user-transition-exit") && this.classList.contains("gallery-page__actions")) {
        const rect = this.getBoundingClientRect();
        (window as Window & { verticalExits: { right: number; width: number; height: number }[] }).verticalExits.push({ right: rect.right, width: rect.width, height: rect.height });
      }
      if (Array.isArray(frames) && this.classList.contains("page-action-bar") && this.querySelector(".users__action-bar") && frames.some((frame) => frame.transform)) {
        const delay = typeof options === "object" ? options?.delay ?? 0 : 0;
        const record = { kind: this.hasAttribute("data-user-transition-exit") ? "exit" : "enter", waiting: [] as { top: number; navTop: number }[], samples: [] as { elapsed: number; top: number; baseTop: number; width: number; left: number; parentWidth: number; overflow: string }[] };
        (window as Window & { userMotion: typeof record[] }).userMotion.push(record);
        const start = performance.now();
        const element = this.querySelector(".users__action-bar")!;
        const animatedFooter = this;
        const sample = () => {
          const elapsed = performance.now() - start - delay;
          if (elapsed < -20 && element.isConnected) {
            const nav = document.querySelector(".bottom-navigation");
            if (nav) record.waiting.push({ top: element.getBoundingClientRect().top, navTop: nav.getBoundingClientRect().top });
          }
          if (elapsed >= 0 && elapsed < 190 && element.isConnected) {
            const rect = element.getBoundingClientRect();
            const parent = element.parentElement!;
            const transform = getComputedStyle(animatedFooter).transform;
            const offsetY = transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42;
            record.samples.push({ elapsed, top: rect.top, baseTop: rect.top - offsetY, width: rect.width, left: rect.left, parentWidth: parent.getBoundingClientRect().width, overflow: getComputedStyle(parent).overflow });
          }
          if (elapsed < 190 && element.isConnected) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }
      return animation;
    };
  });
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await page.evaluate(() => {
    const samples: { count: number; left: number; top: number; width: number }[] = [];
    (window as Window & { sharedSamples: typeof samples }).sharedSamples = samples;
    const start = performance.now();
    const sample = () => {
      const bars = [...document.querySelectorAll<HTMLElement>(".page-action-bar__item > .place__action-bar, [data-user-search-bridge]")].filter((bar) => {
        const style = getComputedStyle(bar);
        const parentStyle = getComputedStyle(bar.parentElement!);
        return style.visibility === "visible" && style.display !== "none" && Number(style.opacity) > 0.99 && Number(parentStyle.opacity) > 0.99 && bar.getBoundingClientRect().width > 10;
      });
      const rect = bars.at(-1)?.getBoundingClientRect();
      samples.push({ count: bars.length, left: rect?.left ?? 0, top: rect?.top ?? 0, width: rect?.width ?? 0 });
      if (performance.now() - start < 500) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await nav.getByRole("link", { name: "Users" }).click();
  await expect(page).toHaveURL(/\/users$/);
  await expect(page.getByRole("searchbox", { name: "Search users" })).toBeVisible();
  await page.waitForTimeout(600);
  let transitions = await page.evaluate(() => (window as Window & { transitions: { name: string; time: number; frames: Keyframe[]; delay: number }[] }).transitions);
  expect(transitions.filter((item) => item.frames.some((frame) => frame.transform))).toEqual([]);
  const sharedSamples = await page.evaluate(() => (window as Window & { sharedSamples: { count: number; left: number; top: number; width: number }[] }).sharedSamples);
  expect(sharedSamples.length).toBeGreaterThan(5);
  expect(sharedSamples.every((sample) => sample.count > 0)).toBe(true);
  expect(Math.max(...sharedSamples.map((sample) => sample.left)) - Math.min(...sharedSamples.map((sample) => sample.left))).toBeLessThan(2);
  expect(Math.max(...sharedSamples.map((sample) => sample.top)) - Math.min(...sharedSamples.map((sample) => sample.top))).toBeLessThan(2);
  expect(Math.max(...sharedSamples.map((sample) => sample.width)) - Math.min(...sharedSamples.map((sample) => sample.width))).toBeLessThan(2);
  await expect(page.locator("[data-user-transition-exit]")).toHaveCount(0);
  await expect(page.locator("[data-user-search-bridge]")).toHaveCount(0);
  await page.evaluate(() => { (window as Window & { transitions: unknown[] }).transitions = []; });
  await page.goBack();
  await expect(page).toHaveURL(/\/location\/saved$/);
  await expect(page.getByRole("searchbox", { name: "Search saved places" })).toBeVisible();
  await page.waitForTimeout(300);
  transitions = await page.evaluate(() => (window as Window & { transitions: { name: string; time: number; frames: Keyframe[]; delay: number }[] }).transitions);
  expect(transitions.filter((item) => item.frames.some((frame) => frame.transform))).toEqual([]);
  await expect(page.locator("[data-user-search-bridge]")).toHaveCount(0);
  await nav.getByRole("link", { name: "Users" }).click();
  await expect(page.getByRole("searchbox", { name: "Search users" })).toBeVisible();
  await page.waitForTimeout(100);
  const userBeforeLocation = (await page.locator(".page-action-bar__item > .users__action-bar").boundingBox())!;
  await page.evaluate(() => { (window as Window & { transitions: unknown[] }).transitions = []; });
  await nav.getByRole("link", { name: "Locations" }).click();
  await expect(page).toHaveURL(/\/location$/);
  await expect(page.getByRole("button", { name: "Add", exact: true })).toBeVisible();
  await page.waitForTimeout(600);
  transitions = await page.evaluate(() => (window as Window & { transitions: { name: string; time: number; frames: Keyframe[]; delay: number }[] }).transitions);
  const userExit = transitions.find((item) => item.name === "exit" && item.frames.at(-1)?.transform === "translateY(100%)");
  const mapEnter = transitions.find((item) => item.name === "enter" && item.frames[0]?.clipPath === "inset(0 0 0 100%)");
  expect(userExit).toBeDefined();
  expect(mapEnter).toBeDefined();
  expect(mapEnter!.time + mapEnter!.delay - userExit!.time).toBeGreaterThanOrEqual(240);
  const exitingMotion = (await page.evaluate(() => (window as Window & { userMotion: { kind: string; samples: { elapsed: number; top: number; baseTop: number; width: number; left: number }[] }[] }).userMotion)).find((item) => item.kind === "exit")!;
  expect(exitingMotion.samples.length).toBeGreaterThan(3);
  expect(exitingMotion.samples.at(-1)!.top - exitingMotion.samples[0].top).toBeGreaterThan(20);
  expect(Math.max(...exitingMotion.samples.map((sample) => sample.width)) - Math.min(...exitingMotion.samples.map((sample) => sample.width))).toBeLessThan(1);
  expect(exitingMotion.samples.every((sample) => sample.left >= 0 && sample.left + sample.width <= 390)).toBe(true);
  expect(Math.abs(exitingMotion.samples[0].baseTop - userBeforeLocation.y)).toBeLessThan(2);
  expect(Math.abs(exitingMotion.samples[0].left - userBeforeLocation.x)).toBeLessThan(2);
  await expect(page.locator("[data-user-transition-exit]")).toHaveCount(0);
  await page.evaluate(() => { (window as Window & { transitions: unknown[] }).transitions = []; });
  await nav.getByRole("link", { name: "Users" }).click();
  await expect(page.getByRole("searchbox", { name: "Search users" })).toBeVisible();
  await page.waitForTimeout(600);
  transitions = await page.evaluate(() => (window as Window & { transitions: { name: string; time: number; frames: Keyframe[]; delay: number }[] }).transitions);
  const mapExit = transitions.find((item) => item.name === "exit" && item.frames.at(-1)?.clipPath === "inset(0 0 0 100%)");
  const usersEnter = transitions.find((item) => item.name === "enter" && item.frames[0]?.transform === "translateY(100%)");
  expect(mapExit).toBeDefined();
  expect(usersEnter).toBeDefined();
  expect(usersEnter!.time + usersEnter!.delay - mapExit!.time).toBeGreaterThanOrEqual(240);
  const enteringMotion = (await page.evaluate(() => (window as Window & { userMotion: { kind: string; waiting: { top: number; navTop: number }[]; samples: { elapsed: number; top: number; width: number; left: number; parentWidth: number; overflow: string }[] }[] }).userMotion)).find((item) => item.kind === "enter")!;
  expect(enteringMotion.waiting.length).toBeGreaterThan(2);
  expect(enteringMotion.waiting.every((sample) => sample.top >= sample.navTop)).toBe(true);
  expect(enteringMotion.samples.length).toBeGreaterThan(3);
  expect(enteringMotion.samples[0].top - enteringMotion.samples.at(-1)!.top).toBeGreaterThan(20);
  expect(Math.max(...enteringMotion.samples.map((sample) => sample.width)) - Math.min(...enteringMotion.samples.map((sample) => sample.width))).toBeLessThan(1);
  expect(enteringMotion.samples.every((sample) => sample.left >= 0 && sample.left + sample.width <= 390)).toBe(true);
  expect(enteringMotion.samples.every((sample) => sample.overflow === "visible" || sample.parentWidth >= sample.width - 1)).toBe(true);
  await expect(page.locator("[data-user-transition-exit]")).toHaveCount(0);
  const userBeforeGallery = (await page.locator(".page-action-bar__item > .users__action-bar").boundingBox())!;
  await page.evaluate(() => { (window as Window & { transitions: unknown[] }).transitions = []; (window as Window & { userMotion: unknown[] }).userMotion = []; });
  await nav.getByRole("link", { name: "Gallery" }).click();
  await expect(page.getByRole("button", { name: "Upload media" })).toBeVisible();
  await page.waitForTimeout(600);
  transitions = await page.evaluate(() => (window as Window & { transitions: { name: string; time: number; frames: Keyframe[]; delay: number }[] }).transitions);
  expect(transitions.some((item) => item.name === "exit" && item.frames.at(-1)?.transform === "translateY(100%)")).toBe(true);
  const galleryExit = (await page.evaluate(() => (window as Window & { userMotion: { kind: string; samples: { baseTop: number; left: number }[] }[] }).userMotion)).find((item) => item.kind === "exit")!;
  expect(galleryExit.samples.length).toBeGreaterThan(3);
  expect(Math.abs(galleryExit.samples[0].baseTop - userBeforeGallery.y)).toBeLessThan(2);
  expect(Math.abs(galleryExit.samples[0].left - userBeforeGallery.x)).toBeLessThan(2);
  await expect(page.locator("[data-user-transition-exit]")).toHaveCount(0);
  for (const section of ["Gallery", "Album"]) {
    if (section === "Album") {
      await page.getByRole("navigation", { name: "Gallery", exact: true }).getByRole("link", { name: "Album", exact: true }).click();
      await expect(page.getByRole("button", { name: "New album", exact: true }).first()).toBeVisible();
    }
    await page.evaluate(() => { (window as Window & { verticalExits: unknown[] }).verticalExits = []; (window as Window & { transitions: unknown[] }).transitions = []; (window as Window & { userMotion: unknown[] }).userMotion = []; });
    await nav.getByRole("link", { name: "Users" }).click();
    await expect(page.getByRole("searchbox", { name: "Search users" })).toBeVisible();
    await page.waitForTimeout(600);
    const exits = await page.evaluate(() => (window as Window & { verticalExits: { right: number; width: number; height: number }[] }).verticalExits);
    expect(exits).toHaveLength(1);
    expect(Math.round(exits[0].right)).toBe(378);
    expect(exits[0].width).toBeGreaterThan(35);
    expect(exits[0].height).toBeGreaterThan(35);
    transitions = await page.evaluate(() => (window as Window & { transitions: { name: string; time: number; frames: Keyframe[]; delay: number }[] }).transitions);
    expect(transitions.some((item) => item.name === "enter" && item.frames[0]?.transform === "translateY(100%)")).toBe(true);
    const motion = (await page.evaluate(() => (window as Window & { userMotion: { kind: string; samples: { baseTop: number }[] }[] }).userMotion)).find((item) => item.kind === "enter")!;
    expect(motion.samples.length).toBeGreaterThan(3);
    expect(Math.max(...motion.samples.map((sample) => sample.baseTop)) - Math.min(...motion.samples.map((sample) => sample.baseTop))).toBeLessThan(2);
    await expect(page.locator("[data-user-transition-exit]")).toHaveCount(0);
    if (section === "Gallery") {
      await nav.getByRole("link", { name: "Gallery" }).click();
      await expect(page.getByRole("button", { name: "Upload media" })).toBeVisible();
      await page.waitForTimeout(300);
    }
  }
});

test("Users exit stays visible while sliding down to Locations and Gallery", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test",
    }, version: 0 }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
  });
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/location/home-location") return route.fulfill({ json: null });
    if (path.endsWith("/page") || path.startsWith("/api/library/gallery") || path === "/api/location/travel/map") {
      return route.fulfill({ json: { page: 1, offset: 0, total: 0, limit: 30, items: [], allCount: 0, pendingCount: 0, hasMore: false } });
    }
    return route.fulfill({ json: [] });
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.fulfill({ json: route.request().url().includes("/styles/v1/") ? { version: 8, sources: {}, layers: [] } : {} }));
  await page.goto("/users");
  await expect(page.getByRole("searchbox", { name: "Search users" })).toBeVisible();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const animation = original.call(this, frames, options);
      if (this.hasAttribute("data-user-transition-exit") && this.querySelector(".users__action-bar")) {
        animation.pause();
        animation.currentTime = 80;
        (window as Window & { pausedUserExit?: Animation }).pausedUserExit = animation;
      }
      return animation;
    };
  });
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  for (const destination of ["Locations", "Gallery"]) {
    const before = (await page.locator(".page-action-bar__item > .users__action-bar").boundingBox())!;
    await nav.getByRole("link", { name: destination }).click();
    const exit = page.locator("[data-user-transition-exit] .users__action-bar");
    await expect(exit).toBeVisible();
    const bounds = (await exit.boundingBox())!;
    const footer = (await page.locator(".bottom-navigation").boundingBox())!;
    expect(bounds.y).toBeGreaterThan(before.y + 5);
    expect(bounds.y).toBeLessThan(footer.y - 10);
    const screenshot = await page.screenshot();
    const pixel = await page.evaluate(async ({ data, x, y }) => {
      const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
      const canvas = document.createElement("canvas");
      canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      return [...context.getImageData(x, y, 1, 1).data];
    }, { data: screenshot.toString("base64"), x: Math.round(bounds.x + 14), y: Math.round(bounds.y + 8) });
    expect(pixel.slice(0, 3)).toEqual([106, 63, 54]);
    await page.evaluate(() => (window as Window & { pausedUserExit?: Animation }).pausedUserExit?.play());
    await expect(exit).toHaveCount(0);
    if (destination === "Locations") {
      await nav.getByRole("link", { name: "Users" }).click();
      await expect(page.getByRole("searchbox", { name: "Search users" })).toBeVisible();
      await page.waitForTimeout(600);
    }
  }
});

for (const view of ["saved", "history"]) {
  test(`mobile ${view} search slides down before Gallery actions enter`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
        user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "2026-01-01" }, accessToken: "test", refreshToken: "test",
      }, version: 0 }));
      localStorage.setItem("shinigacim.animations-enabled", "true");
    });
    await page.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/location/home-location") return route.fulfill({ json: null });
      if (path.endsWith("/page") || path.startsWith("/api/library/gallery") || path === "/api/location/travel/map") {
        return route.fulfill({ json: { page: 1, offset: 0, total: 0, limit: 30, items: [], allCount: 0, pendingCount: 0, hasMore: false } });
      }
      return route.fulfill({ json: [] });
    });
    await page.route("**/hubs/**", (route) => route.abort());
    await page.goto(`/location/${view}`);
    await expect(page.getByRole("searchbox", { name: view === "saved" ? "Search saved places" : "Search visit history" })).toBeVisible();
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const original = Element.prototype.animate;
      (window as Window & { routeFrames: { kind: string; time: number; delay: number; frames: Keyframe[] }[] }).routeFrames = [];
      Element.prototype.animate = function (frames, options) {
        const animation = original.call(this, frames, options);
        if (Array.isArray(frames) && (this.hasAttribute("data-user-transition-exit") || this.classList.contains("gallery-page__actions"))) {
          (window as Window & { routeFrames: { kind: string; time: number; delay: number; frames: Keyframe[] }[] }).routeFrames.push({
            kind: this.hasAttribute("data-user-transition-exit") ? "exit" : "enter", time: performance.now(),
            delay: typeof options === "object" ? options?.delay ?? 0 : 0, frames,
          });
        }
        if (this.hasAttribute("data-user-transition-exit") && this.querySelector(".place__action-bar")) {
          animation.pause(); animation.currentTime = 80;
          (window as Window & { pausedSearchExit?: Animation }).pausedSearchExit = animation;
        }
        return animation;
      };
    });
    const before = (await page.locator(".page-action-bar__item > .place__action-bar").boundingBox())!;
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Gallery" }).click();
    await expect(page).toHaveURL(/\/gallery$/);
    const exit = page.locator("[data-user-transition-exit] .place__action-bar");
    await expect(exit).toBeVisible();
    const bounds = (await exit.boundingBox())!;
    const footer = (await page.locator(".bottom-navigation").boundingBox())!;
    expect(bounds.y).toBeGreaterThan(before.y + 5);
    expect(bounds.y).toBeLessThan(footer.y - 10);
    const screenshot = await page.screenshot();
    const pixel = await page.evaluate(async ({ data, x, y }) => {
      const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
      const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0);
      return [...context.getImageData(x, y, 1, 1).data];
    }, { data: screenshot.toString("base64"), x: Math.round(bounds.x + 14), y: Math.round(bounds.y + 8) });
    expect(pixel.slice(0, 3)).toEqual([106, 63, 54]);
    await page.evaluate(() => (window as Window & { pausedSearchExit?: Animation }).pausedSearchExit?.play());
    await expect(exit).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Upload media" })).toBeVisible();
    await page.waitForTimeout(300);
    const frames = await page.evaluate(() => (window as Window & { routeFrames: { kind: string; time: number; delay: number; frames: Keyframe[] }[] }).routeFrames);
    const leaving = frames.find((item) => item.kind === "exit" && item.frames.at(-1)?.transform === "translateY(100%)");
    const entering = frames.find((item) => item.kind === "enter" && item.frames[0]?.clipPath === "inset(0 0 0 100%)");
    expect(leaving).toBeDefined();
    expect(entering).toBeDefined();
    expect(entering!.time + entering!.delay - leaving!.time).toBeGreaterThanOrEqual(240);
  });
}

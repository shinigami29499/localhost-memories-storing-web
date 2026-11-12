import { expect, test, type Page } from "@playwright/test";

async function expectCenteredLoader(page: Page) {
  const loader = page.locator("#main-content .spinner--page").first();
  await expect(loader).toBeVisible();
  await expect.poll(async () => loader.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const content = (element.closest("main") ?? document.querySelector("#main-content"))!.getBoundingClientRect();
    const x = Math.abs(bounds.left + bounds.width / 2 - content.left - content.width / 2);
    const y = Math.abs(bounds.top + bounds.height / 2 - content.top - content.height / 2);
    return Math.max(x, y);
  })).toBeLessThan(2);
}

function emptyResponse(url: string) {
  const path = new URL(url).pathname;
  if (path === "/api/users/page") return { page: 1, limit: 30, total: 0, items: [] };
  if (path.startsWith("/api/library/gallery")) return { offset: 0, limit: 20, total: 0, items: [] };
  return [];
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({
      state: {
        user: { id: "viewer", username: "viewer", role: "admin", status: "active", createdAt: "" },
        accessToken: "test",
        refreshToken: "test",
      },
      version: 0,
    }));
    localStorage.setItem("shinigacim.animations-enabled", "true");
  });
  await page.route("**/hubs/**", (route) => route.abort());
  await page.route(/https:\/\/[^/]*mapbox\.com\//, (route) => route.abort());
});

for (const width of [390, 1280]) {
  test(`cold page switches before its module loads at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/**", (route) => route.fulfill({
      json: emptyResponse(route.request().url()),
    }));
    await page.goto("/gallery");
    await expect(page.getByText("No media yet", { exact: true })).toBeVisible();
    let releaseModule!: () => void;
    const moduleGate = new Promise<void>((resolve) => { releaseModule = resolve; });
    await page.route("**/src/pages/users/UsersPage.tsx*", async (route) => {
      await moduleGate;
      await route.continue();
    });
    try {
      await page.getByRole("link", { name: "Users", exact: true }).click();
      await expect(page).toHaveURL(/\/users$/);
      await expect(page.getByRole("heading", { name: "Users", exact: true })).toBeVisible();
      await expect(page.locator("#main-content > .spinner")).toBeVisible();
      await expectCenteredLoader(page);
    } finally {
      releaseModule();
    }
  });

  test(`gallery section switches before its module loads at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/**", (route) => route.fulfill({ json: emptyResponse(route.request().url()) }));
    await page.goto("/gallery");
    await expect(page.getByText("No media yet", { exact: true })).toBeVisible();
    let releaseModule!: () => void;
    const moduleGate = new Promise<void>((resolve) => { releaseModule = resolve; });
    await page.route("**/src/pages/albums/AlbumsPage.tsx*", async (route) => {
      await moduleGate;
      await route.continue();
    });
    try {
      const link = page.locator(".gallery-layout__header").getByRole("link", { name: "Album", exact: true });
      await link.click();
      await expect(page).toHaveURL(/\/gallery\/album$/);
      await expect(link).toHaveAttribute("aria-current", "page");
      await expect(page.locator(".gallery-layout__content > .spinner")).toBeVisible();
      await expectCenteredLoader(page);
    } finally {
      releaseModule();
    }
  });
}

const destinations = [
  { path: "/", selector: ".home-page" },
  { path: "/gallery", selector: ".gallery-page" },
  { path: "/gallery/favorites", selector: ".gallery-page" },
  { path: "/gallery/trash", selector: ".gallery-page" },
  { path: "/gallery/album", selector: ".album-page" },
  { path: "/gallery/album/example", selector: ".album-page" },
  { path: "/uploads", selector: ".upload-page" },
  { path: "/location", selector: ".place" },
  { path: "/location/saved", selector: ".place" },
  { path: "/location/history", selector: ".place" },
  { path: "/location/travel", selector: ".locations" },
  { path: "/users", selector: ".admin-page--users" },
  { path: "/users/pending", selector: ".admin-page--users" },
  { path: "/users/blocked", selector: ".admin-page--users" },
  { path: "/profile", selector: ".profile-page" },
  { path: "/settings", selector: ".settings-page" },
];

for (const width of [390, 1280]) {
  for (const destination of destinations) {
    test(`navigation to ${destination.path} renders before API response at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.route("**/api/**", (route) => route.fulfill({
        json: emptyResponse(route.request().url()),
      }));
      const source = destination.path.startsWith("/gallery") ? "/users" : "/gallery";
      await page.goto(source);
      await expect(page.locator(source === "/users" ? ".admin-page--users" : ".gallery-page")).toBeVisible();
      let releaseResponses!: () => void;
      const responseGate = new Promise<void>((resolve) => { releaseResponses = resolve; });
      let requests = 0;
      await page.route("**/api/**", async (route) => {
        requests += 1;
        await responseGate;
        await route.abort();
      });
      try {
        await page.evaluate(({ source, destination }) => {
          const state = window.history.state;
          window.history.replaceState({ ...state, idx: 0 }, "", destination);
          window.history.pushState({ ...state, idx: 1 }, "", source);
        }, { source, destination: destination.path });
        await page.goBack();
        await expect(page).toHaveURL(new RegExp(`${destination.path}$`));
        await expect(page.locator(`#main-content ${destination.selector}`).first()).toBeVisible();
        if (destination.path !== "/settings") await expect.poll(() => requests).toBeGreaterThan(0);
        await expect(page.locator('[data-push-transition="exit"], [data-highlight-bridge]')).toHaveCount(0);
        if (!["/profile", "/settings", "/location"].includes(destination.path)) await expectCenteredLoader(page);
      } finally {
        releaseResponses();
      }
    });
  }
}

for (const width of [390, 1280]) {
  test(`album filters switch before media response at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    let releaseResponses!: () => void;
    const responseGate = new Promise<void>((resolve) => { releaseResponses = resolve; });
    let filteredRequests = 0;
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/library/album/example") {
        await route.fulfill({ json: {
          id: "example", name: "Example album", caption: "", isPublic: false,
          owner: { id: "viewer", username: "viewer" }, mediaCount: 0,
          createdAt: "2026-01-01", previewMediaId: null,
        } });
        return;
      }
      if (url.pathname === "/api/library/album/example/media") {
        if (url.searchParams.has("mediaKind")) {
          filteredRequests += 1;
          await responseGate;
        }
        await route.fulfill({ json: { offset: 0, limit: 20, total: 0, items: [] } });
        return;
      }
      await route.fulfill({ json: emptyResponse(route.request().url()) });
    });
    try {
      await page.goto("/gallery/album/example");
      await expect(page.getByRole("heading", { name: "Example album." })).toBeVisible();
      await expect(page.getByText("Loading media...", { exact: true })).toBeHidden();
      await page.getByRole("button", { name: "Videos", exact: true }).click();
      await expect.poll(() => filteredRequests).toBe(1);
      await expect(page.getByRole("button", { name: "Videos", exact: true })).toHaveAttribute("aria-pressed", "false");
      await expect(page.getByRole("button", { name: "Images", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByText("Loading media...", { exact: true })).toBeVisible();
      await expectCenteredLoader(page);
    } finally {
      releaseResponses();
    }
  });
}

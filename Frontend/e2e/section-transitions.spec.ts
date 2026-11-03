import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }, testInfo) => {
  const effect = testInfo.title.match(/with (push|iris|bands|chop)$/)?.[1] ?? "push";
  await page.addInitScript((effect) => {
    localStorage.setItem("shinigacim-auth", JSON.stringify({
      state: { user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "" }, accessToken: "test", refreshToken: "test" }, version: 0,
    }));
    localStorage.setItem("shinigacim.page-transition", effect);
  }, effect);
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/location/home-location") return route.fulfill({ json: null });
    if (path === "/api/location") return route.fulfill({ json: [{ id: "p1", name: "Place", markerColor: "#00AA00", markerIcon: "P", rating: 2, mediaIds: [], address: "", note: "", createdAt: "2026-01-01", owner: { id: "u1", username: "viewer" }, latitude: 10, longitude: 106 }] });
    if (path.startsWith("/api/library/gallery")) return route.fulfill({ json: { offset: 0, limit: 20, total: 0, items: [] } });
    return route.fulfill({ json: [] });
  });
});

test("location switches keep one sliding highlight above the content transition", async ({ page }) => {
  await page.goto("/location");
  const bar = page.locator(".place__view-switch");
  const highlight = bar.locator('[data-slot="motion-highlight"]');
  const saved = page.getByRole("button", { name: "Saved", exact: true });
  await expect(saved).toHaveCount(1);
  await expect(highlight).toHaveCount(1);
  const start = await highlight.boundingBox();
  await saved.click();
  await expect(saved).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Place", { exact: true })).toBeVisible();
  await expect.poll(async () => (await highlight.boundingBox())?.x).toBeGreaterThan(start!.x + 100);
  const barBox = await bar.boundingBox();
  const contentBox = await page.locator(".place__view-content > .page-transition").boundingBox();
  expect(contentBox!.y).toBeGreaterThanOrEqual(barBox!.y + barBox!.height);
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.getByRole("button", { name: "Map", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(highlight).toHaveCount(1);
});

test("gallery navigation retains its highlight while content changes", async ({ page }) => {
  await page.goto("/gallery");
  const bar = page.locator(".gallery-page__media-toolbar");
  const highlight = bar.locator('[data-slot="motion-highlight"]');
  await expect(highlight).toHaveCount(1);
  const start = await highlight.boundingBox();
  await page.getByRole("link", { name: "Album", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Album." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Album", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(highlight).toHaveCount(1);
  await expect.poll(async () => (await highlight.boundingBox())?.x).toBeGreaterThan(start!.x + 100);
  const barBox = await bar.boundingBox();
  const contentBox = await page.locator(".gallery-layout__content > .page-transition").boundingBox();
  expect(contentBox!.y).toBeGreaterThanOrEqual(barBox!.y + barBox!.height);
});

type MotionRecord = {
  height: number;
  content: string | null | undefined;
  animations: { pseudo: string | null; state: string; frames: Record<string, unknown>[] }[];
};
type MotionWindow = Window & { __galleryMotion?: MotionRecord[] };

for (const width of [1571, 390]) {
  for (const effect of ["push", "iris", "bands", "chop"]) {
    test(`gallery content at ${width}px visibly transitions with ${effect}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/gallery");
      await expect(page.getByText("No media yet", { exact: true })).toBeVisible();
      for (const [tab, title] of [["Album", "No albums yet"], ["Trash", "Trash is empty"], ["Gallery", "No media yet"]]) {
        await page.evaluate(() => {
          const records: MotionRecord[] = [];
          (window as MotionWindow).__galleryMotion = records;
          document.addEventListener("click", () => {
            const start = performance.now();
            const sample = () => {
              records.push({
                height: document.querySelector(".gallery-layout__content > .page-transition")?.getBoundingClientRect().height ?? 0,
                content: document.querySelector(".gallery-layout__content .empty-state")?.textContent,
                animations: document.getAnimations().map((animation) => ({
                  pseudo: (animation.effect as KeyframeEffect)?.pseudoElement,
                  state: animation.playState,
                  frames: (animation.effect as KeyframeEffect)?.getKeyframes() as Record<string, unknown>[],
                })),
              });
              if (performance.now() - start < 900) requestAnimationFrame(sample);
            };
            requestAnimationFrame(sample);
          }, { once: true });
        });
        await page.getByRole("navigation", { name: "Gallery", exact: true }).getByRole("link", { name: tab, exact: true }).click();
        await page.waitForTimeout(180);
        await page.screenshot({ path: test.info().outputPath(tab.toLowerCase() + "-during.png") });
        await page.waitForTimeout(850);
        const records = await page.evaluate(() => (window as MotionWindow).__galleryMotion ?? []);
        const animated = records.filter((record) => record.animations.some((animation) =>
          animation.pseudo?.startsWith("::view-transition-old(_") && animation.state === "running"
            && ["transform", "opacity", "clipPath", "filter"].some((property) =>
              new Set(animation.frames.map((frame) => frame[property]).filter((value) => value !== undefined)).size > 1),
        ));
        expect(animated.length, tab + " outgoing content must animate").toBeGreaterThan(0);
        expect(animated.every((record) => record.height > 100), tab + " blank section must retain height").toBe(true);
        expect(animated.every((record) => !record.content?.includes(title)), tab + " data must wait for motion").toBe(true);
        await expect(page.getByText(title, { exact: true })).toBeVisible();
      }
    });
  }
}

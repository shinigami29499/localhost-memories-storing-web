import { expect, test } from "@playwright/test";

test("album action bar collapses when interface motion is enabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("shinigacim.animations-enabled", "true");
    localStorage.setItem("shinigacim-auth", JSON.stringify({ state: {
      user: { id: "u1", username: "viewer", role: "admin", status: "active", createdAt: "" },
      accessToken: "test", refreshToken: "test",
    }, version: 0 }));
  });
  await page.route("**/api/**", (route) => route.fulfill({ json: { offset: 0, limit: 20, total: 0, items: [] } }));
  await page.route("**/hubs/**", (route) => route.abort());
  await page.goto("/gallery/album");
  await expect(page.getByRole("button", { name: "New album" })).toBeVisible();
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const frames: { width: number; visible: boolean }[] = [];
    (window as unknown as { barFrames: typeof frames }).barFrames = frames;
    document.querySelector('a[href="/gallery/trash"]')!.addEventListener("click", () => {
      const sample = () => {
        const parent = document.querySelector<HTMLElement>(".page-action-bar__item")!;
        const clone = parent.querySelector<HTMLElement>("[data-exiting]");
        frames.push({ width: parent.getBoundingClientRect().width, visible: !!clone && getComputedStyle(clone).display !== "none" });
        if (frames.length < 60) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }, { once: true });
  });
  await page.getByRole("link", { name: "Trash", exact: true }).click();
  await page.waitForTimeout(500);
  const frames = await page.evaluate(() => (window as unknown as { barFrames: { width: number; visible: boolean }[] }).barFrames);
  const start = Math.max(...frames.map((frame) => frame.width));
  expect(frames.some((frame) => frame.visible && frame.width > 1 && frame.width < start - 1)).toBe(true);
  const firstVisible = frames.findIndex((frame) => frame.visible);
  const lastVisible = frames.findLastIndex((frame) => frame.visible);
  expect(frames.slice(firstVisible, lastVisible + 1).every((frame) => frame.visible)).toBe(true);
  expect(frames[lastVisible].width).toBeLessThan(2);
  expect(frames.at(-1)?.width).toBe(0);
  await expect(page.locator(".page-action-bar [data-exiting]")).toHaveCount(0);
});

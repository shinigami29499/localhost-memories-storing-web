import { expect, test } from "@playwright/test";

for (const width of [320, 390, 768, 1024, 1440]) {
  for (const motion of ["enabled", "disabled", "reduced"] as const) {
    test(`album empty text stays inside its card at ${width}px with motion ${motion}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: motion === "reduced" ? "reduce" : "no-preference" });
      await page.addInitScript((enabled) => {
        localStorage.setItem("shinigacim-auth", JSON.stringify({
          state: {
            user: { id: "viewer", username: "viewer", role: "user", status: "active", createdAt: "" },
            accessToken: "test", refreshToken: "test",
          },
          version: 0,
        }));
        localStorage.setItem("shinigacim.animations-enabled", String(enabled));
      }, motion !== "disabled");
      await page.route("**/hubs/**", (route) => route.abort());
      await page.route("**/api/**", (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/api/library/album/empty") {
          return route.fulfill({ json: {
            id: "empty", name: "Atreus 1", caption: "", isPublic: true,
            owner: { id: "viewer", username: "viewer" }, mediaCount: 0,
            previewMediaId: null, createdAt: "2026-11-09T00:00:00Z",
          } });
        }
        return route.fulfill({ json: path.endsWith("/media")
          ? { offset: 0, limit: 20, total: 0, items: [] }
          : [] });
      });

      await page.goto("/library/album/empty");
      const emptyState = page.locator(".album-page .empty-state");
      await expect(emptyState).toBeVisible();
      const hint = "Images and videos added to this album will appear here.";
      await expect(emptyState.locator(".empty-state__hint")).toContainText(hint);

      const expectContainedText = async () => {
        await expect.poll(() => emptyState.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          let node: Node | null;
          let overflow = 0;
          while ((node = walker.nextNode())) {
            if (node.parentElement?.closest(".sr-only") || !node.textContent?.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const rect of range.getClientRects()) {
              overflow = Math.max(overflow, bounds.left - rect.left, rect.right - bounds.right);
            }
          }
          const scrollport = element.closest(".gallery-page__media-scroll")!;
          return Math.max(overflow, scrollport.scrollWidth - scrollport.clientWidth);
        })).toBeLessThanOrEqual(1);
      };

      await expectContainedText();
      await page.getByRole("button", { name: "Videos", exact: true }).click();
      await expect(emptyState).toContainText("No images in this album");
      await expectContainedText();
      await page.getByRole("button", { name: "Images", exact: true }).click();
      await expect(emptyState).toContainText("Select a media type");
      await expectContainedText();
    });
  }
}

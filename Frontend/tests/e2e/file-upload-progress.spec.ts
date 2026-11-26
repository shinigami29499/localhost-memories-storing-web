import { expect, test } from "@playwright/test";
import { createServer, type ServerResponse } from "node:http";

test("tracks direct transfers and keeps compact history in this browser", async ({ page, context, baseURL }, testInfo) => {
  test.setTimeout(60_000);
  const width = testInfo.config.configFile?.includes("mobile") ? 390 : 1280;
  await page.setViewportSize({ width, height: 844 });
  const user = { id: "upload-user", username: "Uploader", role: "user", status: "active", createdAt: "" };
  const album = { id: "progress", owner: user, name: "Upload tests", isPublic: false, mediaCount: 0, imageCount: 0, videoCount: 0 };
  const path = "/api/library/album/progress/media/file/";
  const files = new Map<string, string>();
  const attempts = new Map<string, number>();
  const stored = new Set<string>();
  const legacyRequests: string[] = [];
  const received = new Map<string, { response: ServerResponse; body: Buffer; contentType: string; attempt: number }>();
  const fixture = createServer((request, response) => {
    const id = request.url!.split("/").at(-1)!;
    const attempt = attempts.get(id)!;
    const chunks: Buffer[] = [];
    request.on("data", (bytes: Buffer) => chunks.push(bytes));
    request.on("end", () => received.set(id, {
      response, body: Buffer.concat(chunks), contentType: request.headers["content-type"]!, attempt,
    }));
  });
  await new Promise<void>((resolve) => fixture.listen(0, "127.0.0.1", resolve));
  const address = fixture.address();
  if (!address || typeof address === "string") throw new Error("Upload fixture is not listening.");
  try {
    await context.addInitScript((account) => {
      localStorage.setItem("shinigacim-auth", JSON.stringify({
        state: { user: account, accessToken: "test", refreshToken: "test" }, version: 0,
      }));
    }, user);
    await context.route(/^https?:\/\/[^/]+\/hubs\//, (route) => route.abort());
    await context.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (pathname === "/api/library/album/progress") return route.fulfill({ json: album });
      if (pathname.startsWith(path) && request.method() === "PUT") {
        const id = pathname.slice(path.length);
        const filename = request.postDataBuffer()?.toString().match(/filename="([^"]+)"/)?.[1];
        if (!filename) throw new Error("Missing multipart filename.");
        files.set(filename, id);
        attempts.set(id, (attempts.get(id) ?? 0) + 1);
        return route.continue({ url: `http://127.0.0.1:${address.port}${pathname}` });
      }
      if (pathname.startsWith("/api/library/album/progress/")) return route.fulfill({ json: {
        items: [...stored].map((id) => ({ id, mediaKind: "image", originalFilename: "stored.jpg", isFavorited: false })),
        total: stored.size,
      } });
      if (pathname.startsWith("/api/sync/upload")) legacyRequests.push(pathname);
      return route.fulfill({ json: [] });
    });

    await page.goto("/album/progress");
    await expect(page.getByRole("heading", { name: "Upload tests" })).toBeVisible();
    const network = await context.newCDPSession(page);
    await network.send("Network.enable");
    await network.send("Network.emulateNetworkConditions", {
      offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: 100 * 1024,
    });
    const input = page.locator('input[type="file"][multiple]');
    const firstName = "first-photo.jpg";
    const secondName = "second-photo.jpg";
    const payload = Buffer.alloc(256 * 1024, 0x61);
    const row = (name: string) => page.locator(".local-upload-history .file-upload-progress").filter({ hasText: name });
    const first = row(firstName);
    const second = row(secondName);
    const finish = async (id: string, attempt: number) => {
      await expect.poll(() => received.get(id)?.attempt).toBe(attempt);
      const { response, body, contentType } = received.get(id)!;
      const boundary = contentType.split("boundary=")[1];
      const headerLength = body.indexOf("\r\n\r\n") + 4;
      expect(body.subarray(headerLength, body.length - Buffer.byteLength(`\r\n--${boundary}--\r\n`)).equals(payload)).toBe(true);
      stored.add(id);
      response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ mediaId: id }));
    };

    await input.setInputFiles([firstName, secondName].map((name) => ({ name, mimeType: "image/jpeg", buffer: payload })));
    await expect(page.locator(".file-upload-progress")).toHaveCount(0);
    if (width === 390) await page.getByRole("button", { name: "More", exact: true }).click();
    await page.getByRole("link", { name: "Upload", exact: true }).click();
    await expect(page).toHaveURL(/\/upload$/);
    await expect(first).toHaveAttribute("data-status", "uploading");
    await expect(second).toHaveAttribute("data-status", "uploading");
    await expect(first.getByRole("progressbar")).toHaveAttribute("aria-valuenow", /^(?:[1-9]|[1-9]\d)$/);
    await expect(first.locator(".file-upload-progress__rate")).toContainText(/KB\/s/);
    await expect(first.locator(".file-upload-progress__rate")).toContainText(/ s left/);

    const firstId = files.get(firstName)!;
    const secondId = files.get(secondName)!;
    const cancelledRequest = page.waitForEvent("requestfailed", (request) =>
      new URL(request.url()).pathname === path + secondId);
    await second.getByRole("button", { name: `Cancel ${secondName}` }).click();
    await expect(second).toHaveAttribute("data-status", "cancelled");
    expect((await cancelledRequest).failure()?.errorText).toBe("net::ERR_ABORTED");
    await expect(first).toHaveAttribute("data-status", "processing");
    await expect(first.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    await expect(first.getByRole("progressbar")).toHaveAttribute("aria-valuetext", /256 KB \/ 256 KB/);
    await finish(firstId, 1);
    await expect(first).toHaveAttribute("data-status", "success");

    await second.getByRole("button", { name: `Restart ${secondName}` }).click();
    await expect(second).toHaveAttribute("data-status", "processing");
    await expect.poll(() => received.get(secondId)?.attempt).toBe(2);
    const failedResponse = received.get(secondId)!.response;
    failedResponse.writeHead(200, { "Content-Type": "application/json", "Content-Length": "256" });
    failedResponse.write("{", () => failedResponse.destroy());
    await expect(second).toHaveAttribute("data-status", "failed");
    await expect(second.getByText("Upload request failed.", { exact: true })).toBeVisible();
    const details = second.getByRole("button", { name: secondName, exact: true });
    await details.click();
    await expect(second.getByText("100% · 256 KB / 256 KB", { exact: true })).toBeVisible();
    await details.click();
    await second.getByRole("button", { name: `Retry ${secondName}` }).click();
    await finish(secondId, 3);
    await expect(second).toHaveAttribute("data-status", "success");

    const rows = page.locator(".file-upload-progress--compact");
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toHaveAttribute("data-status", "success");
    await expect(rows.first().getByRole("progressbar")).toHaveCount(0);
    if (width === 390) {
      const color = () => rows.first().locator(".file-upload-progress__status svg").evaluate((icon) => getComputedStyle(icon).color);
      const light = await color();
      await page.emulateMedia({ colorScheme: "dark" });
      await expect(page.locator("html")).toHaveAttribute("data-mobile-theme", "dark");
      await expect.poll(color).not.toBe(light);
    }
    expect((await rows.first().boundingBox())!.height).toBeLessThanOrEqual(52);
    await expect(page.getByRole("button", { name: /mark all as read|created date/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Go to albums" })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(legacyRequests).toEqual([]);

    const removed = rows.filter({ hasText: firstName });
    await removed.getByRole("button", { name: /Delete record/ }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete record" }).click();
    await expect(rows).toHaveCount(1);
    await page.reload();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(secondName);
    await page.evaluate(() => new Promise<void>((resolve, reject) => {
      const clear = indexedDB.deleteDatabase("shinigacim-upload-history");
      clear.onsuccess = () => resolve();
      clear.onerror = () => reject(clear.error);
    }));
    await page.reload();
    await expect(page.getByText("No uploads yet")).toBeVisible();
    await expect(rows).toHaveCount(0);
    expect(stored.size).toBe(2);
    await page.goto("/uploads");
    await expect(page).toHaveURL(/\/upload$/);
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/setting$/);
  } finally {
    fixture.closeAllConnections();
    await new Promise<void>((resolve) => fixture.close(() => resolve()));
  }
});

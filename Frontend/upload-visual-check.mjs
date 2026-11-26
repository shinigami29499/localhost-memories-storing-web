import { chromium } from "playwright";
const variant = process.argv[2];
const browser = await chromium.launch();
try {
  for (const [port, width, theme] of variant === "before" ? [[35821,390,"dark"]] : [[35821,320,"dark"],[35821,390,"light"],[35820,1280,"light"]]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, colorScheme: theme });
    const origin = "http://127.0.0.1:" + port;
    await page.route("**/__upload_fixture", (route) => route.fulfill({ contentType: "text/html", body: "<title>Fixture</title>" }));
    await page.route(/^https?:\/\/[^/]+\/api\//, (route) => route.fulfill({ json: [] }));
    await page.route(/^https?:\/\/[^/]+\/hubs\//, (route) => route.abort());
    await page.goto(origin + "/__upload_fixture");
    await page.evaluate(async () => {
      const userId = "reviewer";
      localStorage.setItem("shinigacim-auth", JSON.stringify({ state: { user: { id: userId, username: "Reviewer", status: "active", role: "user" }, accessToken: "fixture", refreshToken: "fixture" }, version: 0 }));
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open("shinigacim-upload-history", 1);
        request.onupgradeneeded = () => request.result.createObjectStore("transfers", { keyPath: "id" }).createIndex("userId", "userId");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise((resolve) => {
        const tx = db.transaction("transfers", "readwrite");
        const store = tx.objectStore("transfers");
        ["success","success","failed","cancelled","success","success","success","success","success"].forEach((status, index) =>
          store.put({ id: String(index), userId, albumId: "fixture", name: "Screen Recording 2026-11-27 at 10.32." + String(index).padStart(2, "0") + ".mp4", status, total: 25 * 1024 * 1024, loaded: status === "success" ? 25 * 1024 * 1024 : 9 * 1024 * 1024, createdAt: new Date(2026, 10, 27, 10, 32 - index).toISOString(), error: status === "failed" ? "Upload request failed. Check your connection and try again." : undefined }));
        tx.oncomplete = resolve;
      });
      db.close();
    });
    await page.goto(origin + (variant === "before" ? "/uploads" : "/upload"));
    await page.locator(".file-upload-progress--compact").first().waitFor();
    await page.screenshot({ path: "test-results/upload-" + variant + "-" + width + ".png", animations: "disabled" });
    console.log(JSON.stringify(await page.locator(".file-upload-progress--compact").first().evaluate(row => ({ viewport: innerWidth, page: document.documentElement.scrollWidth, filenameWidth: row.querySelector(".file-upload-progress__name").getBoundingClientRect().width, rowHeight: row.getBoundingClientRect().height }))));
    await page.close();
  }
} finally { await browser.close(); }

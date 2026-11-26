import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["album-date-view.spec.ts", "album-favorite.spec.ts", "album-only-gallery.spec.ts", "file-upload-progress.spec.ts", "mobile-app-accessibility.spec.ts", "mobile-app-map.spec.ts", "mobile-app-travel-location.spec.ts", "mobile-app-user-search.spec.ts"],
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:34301", trace: "retain-on-failure", ...devices["Desktop Chrome"] },
  webServer: {
    command: "npm run dev --workspace @shinigacim/mobile -- --mode test --host 127.0.0.1 --port 34301 --strictPort",
    url: "http://127.0.0.1:34301",
    env: { VITE_MAPBOX_ACCESS_TOKEN: "pk.test-browser-token" },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});

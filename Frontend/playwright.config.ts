import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: "**/mobile-app-*.spec.ts",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:34300",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev -- --mode test --host 127.0.0.1 --port 34300 --strictPort",
    url: "http://127.0.0.1:34300",
    env: { VITE_MAPBOX_ACCESS_TOKEN: "pk.test-browser-token" },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});

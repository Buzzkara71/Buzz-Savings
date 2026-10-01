import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5174",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: "**/cloud.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1080 },
      },
    },
    {
      name: "cloud",
      testMatch: "**/cloud.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1080 },
        baseURL: "http://127.0.0.1:5175",
      },
    },
  ],
  webServer: [
    {
      command: "npm run dev -- --port 5174 --strictPort",
      url: "http://127.0.0.1:5174",
      env: { VITE_SUPABASE_URL: "", VITE_SUPABASE_PUBLISHABLE_KEY: "" },
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --port 5175 --strictPort",
      url: "http://127.0.0.1:5175",
      env: {
        VITE_SUPABASE_URL: "https://buzz-test.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      },
      reuseExistingServer: false,
    },
  ],
});

import { defineConfig, devices } from "@playwright/test";
const port = Number(process.env.HBI_E2E_PORT || 3000);
const mockPort = Number(process.env.HBI_MOCK_PORT || 54329);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  expect: { timeout: 30000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    actionTimeout: 30000,
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "node scripts/mock-supabase.mjs",
      url: `http://127.0.0.1:${mockPort}`,
      reuseExistingServer: !process.env.CI,
      env: { HBI_MOCK_PORT: String(mockPort), HBI_E2E_ORIGIN: baseURL },
    },
    {
      command:
        process.env.HBI_E2E_BUNDLER === "webpack"
          ? `pnpm dev --webpack --port ${port}`
          : `pnpm dev --port ${port}`,
      url: `${baseURL}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 600000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${mockPort}`,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
      },
    },
  ],
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.HBI_BROWSER_CHANNEL || undefined,
      },
    },
  ],
});

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://127.0.0.1:3007",
    trace: "retain-on-failure",
    launchOptions: { channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || undefined },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: {
    command: "yarn build && yarn serve --hostname 127.0.0.1 --port 3007",
    url: "http://127.0.0.1:3007",
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NEXT_PUBLIC_GUARD_ADDRESS: "0xC18620A757AF927BC758Fe279b8C8Ba2340c260A" },
  },
});

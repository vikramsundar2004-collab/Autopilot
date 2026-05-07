import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /.*\.e2e\.ts/u,
  timeout: 60_000,
  workers: 1,
  reporter: "list",
  use: {
    trace: "retain-on-failure"
  }
});

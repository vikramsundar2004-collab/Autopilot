import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test, _electron as electron } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "../..");

test("launches the Autopilot Browser shell", async () => {
  const app = await electron.launch({
    args: [appRoot],
    env: {
      ...process.env,
      NODE_ENV: "test"
    }
  });

  try {
    const window = await app.firstWindow();
    await window.waitForLoadState("domcontentloaded");
    await expect(window.locator(".app-shell")).toBeVisible({ timeout: 20_000 });
    await expect(window.locator(".workspace-rail")).toBeVisible();
  } finally {
    await app.close();
  }
});

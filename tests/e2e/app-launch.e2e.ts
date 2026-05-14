import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test, _electron as electron, type ElectronApplication } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "../..");

test("launches the Autopilot Browser shell", async () => {
  const app = await electron.launch({
    args: [appRoot],
    env: {
      ...process.env,
      NODE_ENV: "test",
      AUTOPILOT_E2E_ACCOUNT_BYPASS: "1"
    }
  });

  try {
    const window = await app.firstWindow();
    await window.waitForLoadState("domcontentloaded");
    await expect(window.locator(".app-shell")).toBeVisible({ timeout: 20_000 });
    await expect(window.locator(".workspace-rail")).toBeVisible();
  } finally {
    await closeElectronApp(app);
  }
});

async function closeElectronApp(app: ElectronApplication): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const closePromise = app.close().catch(() => undefined);
  const timeoutPromise = new Promise<void>((resolve) => {
    timeout = setTimeout(() => {
      app.process().kill();
      resolve();
    }, 5_000);
  });
  await Promise.race([closePromise, timeoutPromise]);
  if (timeout) {
    clearTimeout(timeout);
  }
}

import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test, _electron as electron, type ElectronApplication } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "../..");

test("Coding stays responsive through user-style visual stress states", async () => {
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

    if (!(await window.locator(".coding-rebuild-page").isVisible().catch(() => false))) {
      await window.getByRole("button", { name: /open coding/i }).click();
    }
    await expect(window.locator(".coding-rebuild-page")).toBeVisible({ timeout: 20_000 });
    await expect(window.locator(".coding-rebuild-ai-panel")).toContainText(/Ready when you are/i);
    await window.screenshot({ path: test.info().outputPath("coding-empty-state.png"), fullPage: true });

    await window.getByRole("button", { name: /Open project board/i }).click();
    await expect(window.locator(".coding-rebuild-center")).toContainText(/Agent Queue|Project Board|Draft/i);
    await window.screenshot({ path: test.info().outputPath("coding-board-state.png"), fullPage: true });

    await window.getByRole("button", { name: /Open terminal/i }).click();
    await expect(window.locator(".coding-rebuild-terminal-drawer")).toBeVisible();
    await window.screenshot({ path: test.info().outputPath("coding-terminal-state.png"), fullPage: true });
    await window.getByRole("button", { name: /Close terminal/i }).click();
    await expect(window.locator(".coding-rebuild-terminal-drawer")).toHaveCount(0);

    await window.getByRole("button", { name: /Wide AI panel/i }).click();
    await expect(window.locator(".coding-rebuild-page")).toHaveClass(/coding-assistant-wide/);
    await window.screenshot({ path: test.info().outputPath("coding-wide-ai-state.png"), fullPage: true });

    await window.getByRole("button", { name: /Full screen AI focus/i }).click();
    await expect(window.locator(".coding-rebuild-page")).toHaveClass(/coding-assistant-focus/);
    await window.screenshot({ path: test.info().outputPath("coding-focus-ai-state.png"), fullPage: true });

    await window.getByLabel("Ask the coding assistant").fill("Build a tiny todo feature and show me the diff.");
    await window.locator(".coding-rebuild-ai-composer button[type='submit']").click();
    await expect(window.locator(".coding-rebuild-ai-chat")).toContainText(/Open a local project first|Open a project/i);
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

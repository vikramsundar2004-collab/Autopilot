import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { _electron as electron } from "@playwright/test";

const ROOT = process.cwd();
const PRODUCT_EXE = "Autopilot Browser.exe";
const LIVE_AI_REQUIRED = process.env.AUTOPILOT_PACKAGED_LIVE_AI_SMOKE === "true";

const PACKAGED_AI_SMOKE_PROMPTS = {
  slideDeck: "Create a 5-slide launch update deck for Acme's Q4 customer rollout. Include cover, proof, risks, and next steps.",
  website: "Design a polished responsive website concept for Acme Analytics with hero, CTA, three sections, and export-ready HTML/CSS preview.",
  draft: "Write a concise email reply thanking Maya for the Q4 update and saying I will review the attached launch deck today.",
  coding: "Create a tiny Snake game starter with an HTML canvas, movement loop, scoring, and restart control."
};

function findPackagedExecutable() {
  if (process.env.AUTOPILOT_PACKAGED_APP_PATH && existsSync(process.env.AUTOPILOT_PACKAGED_APP_PATH)) {
    return process.env.AUTOPILOT_PACKAGED_APP_PATH;
  }

  const releaseRoot = path.join(ROOT, "release");
  const candidates = [
    path.join(releaseRoot, "win-unpacked", PRODUCT_EXE),
    ...findReleasePackageCandidates(ROOT).map((dir) => path.join(dir, "win-unpacked", PRODUCT_EXE))
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function findReleasePackageCandidates(root) {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("release-package-"))
    .map((entry) => path.join(root, entry.name))
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);
}

async function clickWorkspace(window, label) {
  await window.getByRole("button", { name: new RegExp(label, "iu") }).first().click({ timeout: 10_000 });
}

async function runBasicPackagedSmoke(window) {
  await window.waitForLoadState("domcontentloaded");
  await window.locator(".app-shell").waitFor({ state: "visible", timeout: 30_000 });
  await window.locator(".workspace-rail").waitFor({ state: "visible", timeout: 15_000 });

  await clickWorkspace(window, "Design");
  await window.locator(".design-atlas-studio").waitFor({ state: "visible", timeout: 15_000 });
  await window.getByText(/Artifacts|Built items/iu).first().waitFor({ state: "visible", timeout: 10_000 });

  await clickWorkspace(window, "Productivity");
  await window.locator(".productivity-command-page").waitFor({ state: "visible", timeout: 15_000 });

  await clickWorkspace(window, "Coding");
  await window.locator(".coding-page.cursor-desktop-mode").waitFor({ state: "visible", timeout: 15_000 });

  await clickWorkspace(window, "Home");
  await window.locator(".home-command-page").waitFor({ state: "visible", timeout: 15_000 });
}

async function runLiveAiSmoke(window) {
  await clickWorkspace(window, "Design");
  await submitPrompt(window, /Design prompt|What's on your mind today\?|Ask Autopilot to (draft|revise)|Ask Atlas|What do you want to make/iu, PACKAGED_AI_SMOKE_PROMPTS.slideDeck);
  await window.getByText(/slide|deck|quality|created|artifact/iu).first().waitFor({ state: "visible", timeout: 120_000 });

  await submitPrompt(window, /Design prompt|What's on your mind today\?|Ask Autopilot to (draft|revise)|Ask Atlas|What do you want to make/iu, PACKAGED_AI_SMOKE_PROMPTS.website);
  await window.getByText(/website|HTML|preview|created|artifact/iu).first().waitFor({ state: "visible", timeout: 120_000 });

  await clickWorkspace(window, "Productivity");
  await window.locator(".productivity-command-page").waitFor({ state: "visible", timeout: 15_000 });
  await window
    .locator(".productivity-draft-card, .productivity-draft-reader-row, .productivity-email-draft-preview")
    .first()
    .waitFor({ state: "visible", timeout: 60_000 })
    .catch(() => {
      throw new Error("Live packaged AI smoke did not find a visible Productivity draft. Sync Gmail or seed the demo inbox before requiring draft generation.");
    });

  await clickWorkspace(window, "Coding");
  await submitPrompt(window, /Ask Autopilot|Plan, search, build|Ask for changes/iu, PACKAGED_AI_SMOKE_PROMPTS.coding);
  await window.getByText(/diff|changed files|code patch|Generated a code patch|edits ready/iu).first().waitFor({ state: "visible", timeout: 120_000 });
}

async function submitPrompt(window, placeholderPattern, prompt) {
  const input = await findVisiblePromptInput(window, placeholderPattern);
  await input.fill(prompt, { timeout: 15_000 });
  await input.press("Enter");
}

async function findVisiblePromptInput(window, placeholderPattern) {
  const fields = window.locator("textarea, input");
  const fieldCount = await fields.count();
  for (let index = 0; index < fieldCount; index += 1) {
    const field = fields.nth(index);
    if (!(await field.isVisible().catch(() => false))) {
      continue;
    }

    const metadata = await field.evaluate((element) =>
      [
        element.getAttribute("placeholder"),
        element.getAttribute("aria-label"),
        element.getAttribute("name"),
        element.textContent
      ]
        .filter(Boolean)
        .join(" ")
    );
    if (placeholderPattern.test(metadata)) {
      return field;
    }
  }

  throw new Error(`No visible packaged-app prompt input matched ${placeholderPattern.toString()}.`);
}

const executablePath = findPackagedExecutable();
if (!executablePath) {
  throw new Error("No packaged win-unpacked Autopilot executable found. Run npm run dist:win before npm run test:packaged-smoke.");
}

const app = await electron.launch({
  executablePath,
  env: {
    ...process.env,
    NODE_ENV: "production",
    AUTOPILOT_DISABLE_SINGLE_INSTANCE_LOCK: "1"
  }
});

try {
  const window = await app.firstWindow();
  await runBasicPackagedSmoke(window);
  if (LIVE_AI_REQUIRED) {
    await runLiveAiSmoke(window);
  } else {
    console.log("Packaged app shell smoke passed. Set AUTOPILOT_PACKAGED_LIVE_AI_SMOKE=true to require live slide, website, draft, and coding generation.");
  }
} finally {
  await app.close();
}

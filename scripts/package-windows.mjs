import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_ATTEMPTS = 3;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const electronBuilderCli = path.resolve(scriptDir, "..", "node_modules", "electron-builder", "cli.js");

function createStamp() {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+$/u, "")
    .replace("T", "-");
}

function buildOutputDir(attempt) {
  const configuredOutput = process.env.AUTOPILOT_RELEASE_DIR?.trim();
  if (configuredOutput) {
    return attempt === 1 ? configuredOutput : `${configuredOutput}-${attempt}`;
  }

  return `release-package-${createStamp()}-${attempt}`;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runBuilder(outputDir) {
  console.log(`Autopilot Windows package output: ${outputDir}`);
  const args = [electronBuilderCli, "--win", "nsis", `--config.directories.output=${outputDir}`];

  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      stdio: "inherit",
      shell: false
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        console.error(`electron-builder stopped by signal ${signal}.`);
        resolve(1);
        return;
      }

      resolve(code ?? 1);
    });

    child.on("error", (error) => {
      console.error("Could not start electron-builder.", error);
      resolve(1);
    });
  });
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  const exitCode = await runBuilder(buildOutputDir(attempt));
  if (exitCode === 0) {
    process.exit(0);
  }

  if (attempt < MAX_ATTEMPTS) {
    console.warn(`Windows packaging failed on attempt ${attempt}; retrying in a fresh output folder...`);
    await delay(1400);
  }
}

console.error("Windows packaging failed after all retry attempts.");
process.exit(1);

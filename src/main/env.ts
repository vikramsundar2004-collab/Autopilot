import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function parseEnvText(text: string): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const quotedValue = rawValue.match(/^(['"])(.*)\1$/);
    entries[key] = quotedValue ? quotedValue[2] : rawValue;
  }

  return entries;
}

export function loadAutopilotEnv(): void {
  const projectRootFromDist = path.resolve(__dirname, "../..");
  const candidates = [
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), ".env"),
    path.join(projectRootFromDist, ".env.local"),
    path.join(projectRootFromDist, ".env")
  ];

  for (const candidate of [...new Set(candidates)]) {
    if (!existsSync(candidate)) {
      continue;
    }

    const entries = parseEnvText(readFileSync(candidate, "utf8"));
    for (const [key, value] of Object.entries(entries)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}


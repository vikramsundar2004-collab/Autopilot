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

function readAppConfig(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    return {};
  }

  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as {
      gmail?: {
        clientId?: unknown;
      };
    };
    const clientId = typeof parsed.gmail?.clientId === "string" ? parsed.gmail.clientId.trim() : "";
    return clientId ? { AUTOPILOT_GOOGLE_CLIENT_ID: clientId } : {};
  } catch {
    return {};
  }
}

export function getAutopilotEnvFileCandidates(projectRootFromDist: string, cwd = process.cwd()): string[] {
  return [
    path.join(cwd, "env.local"),
    path.join(cwd, ".env.local"),
    path.join(cwd, "env"),
    path.join(cwd, ".env"),
    path.join(projectRootFromDist, "env.local"),
    path.join(projectRootFromDist, ".env.local"),
    path.join(projectRootFromDist, "env"),
    path.join(projectRootFromDist, ".env")
  ];
}

export function loadAutopilotEnv(): void {
  const projectRootFromDist = path.resolve(__dirname, "../..");
  const envCandidates = getAutopilotEnvFileCandidates(projectRootFromDist);
  const configCandidates = [
    path.join(process.cwd(), "public", "autopilot-config.json"),
    path.join(projectRootFromDist, "public", "autopilot-config.json"),
    path.join(__dirname, "../renderer/autopilot-config.json")
  ];

  for (const candidate of [...new Set(envCandidates)]) {
    const entries = existsSync(candidate) ? parseEnvText(readFileSync(candidate, "utf8")) : {};
    for (const [key, value] of Object.entries(entries)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }

  for (const candidate of [...new Set(configCandidates)]) {
    const entries = readAppConfig(candidate);
    for (const [key, value] of Object.entries(entries)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

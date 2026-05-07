import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

function parseEnvText(text) {
  const entries = {};

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

function readEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  return parseEnvText(readFileSync(filePath, "utf8"));
}

const projectRoot = process.cwd();
const env = {
  ...readEnvFile(path.join(projectRoot, ".env")),
  ...readEnvFile(path.join(projectRoot, "env")),
  ...readEnvFile(path.join(projectRoot, ".env.local")),
  ...readEnvFile(path.join(projectRoot, "env.local")),
  ...process.env
};
const clientId = (env.AUTOPILOT_GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID || "").trim();
const defaultSupabaseProjectRef = "ctvxwmmclsfxortzmkeq";
const supabaseProjectRef = (env.AUTOPILOT_SUPABASE_PROJECT_REF || defaultSupabaseProjectRef).trim();
const supabaseUrl = (env.AUTOPILOT_SUPABASE_URL || (supabaseProjectRef ? `https://${supabaseProjectRef}.supabase.co` : "")).trim();
const supabaseAnonKey = (env.AUTOPILOT_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "").trim();
const configPath = path.join(projectRoot, "public", "autopilot-config.json");

if (!clientId && !supabaseUrl) {
  console.log("Autopilot config: no public Google or Supabase config found in .env.local or env.local.");
  process.exit(0);
}

const publicConfig = {};

if (clientId) {
  publicConfig.gmail = {
    clientId
  };
} else {
  console.log("Autopilot Gmail config: no client ID found in .env.local or env.local.");
}

if (supabaseUrl) {
  publicConfig.supabase = {
    projectRef: supabaseProjectRef,
    url: supabaseUrl,
    ...(supabaseAnonKey ? { anonKey: supabaseAnonKey } : {})
  };
}

mkdirSync(path.dirname(configPath), { recursive: true });
writeFileSync(
  configPath,
  `${JSON.stringify(publicConfig, null, 2)}\n`,
  "utf8"
);
console.log("Autopilot config: wrote public/autopilot-config.json.");

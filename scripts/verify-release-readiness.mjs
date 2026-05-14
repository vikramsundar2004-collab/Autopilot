import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REQUIRED_PUBLIC_CONFIG = [
  { path: ["supabase", "url"], label: "Supabase URL" },
  { path: ["supabase", "anonKey"], label: "Supabase anon key" },
  { path: ["backend", "aiProxyUrl"], label: "AI proxy URL" },
  { path: ["backend", "aiArtifactUrl"], label: "AI artifact URL" },
  { path: ["backend", "aiEmailActionsUrl"], label: "AI email actions URL" },
  { path: ["backend", "model"], label: "AI model" }
];

const FORBIDDEN_PUBLIC_KEYS = [
  /OPENAI_API_KEY/i,
  /ANTHROPIC_API_KEY/i,
  /SUPABASE_SERVICE_ROLE/i,
  /SERVICE_ROLE/i,
  /GOOGLE_CLIENT_SECRET/i,
  /CLIENT_SECRET/i,
  /NETLIFY_AUTH_TOKEN/i,
  /GITHUB_TOKEN/i,
  /PRIVATE_KEY/i,
  /PASSWORD/i
];

const SECRET_VALUE_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/u,
  /\bsk-proj-[A-Za-z0-9_-]{16,}\b/u,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
  /\bservice_role\b/u
];

const RELEASE_SCAN_EXTENSIONS = new Set([".html", ".js", ".json", ".css", ".map"]);
const REQUIRED_THREAT_RESPONSE_MARKERS = [
  "Threat Appendix",
  "Threat Response Matrix",
  "Product response",
  "Verification",
  "Distribution failure",
  "Superhuman owns productivity perception",
  "Gemini in Chrome",
  "Claude Code/Cursor",
  "Figma/Canva/Gamma",
  "Payment/security incident",
  "Model cost shock"
];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function getByPath(value, keyPath) {
  return keyPath.reduce((current, key) => (current && typeof current === "object" ? current[key] : undefined), value);
}

function isPlaceholder(value) {
  return !value || /^your-|^YOUR_|^YOUR-|^<.+>$/u.test(value) || value.includes("example.com");
}

function assertUrl(errors, label, value) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") {
      errors.push(`${label} must use https.`);
    }
  } catch {
    errors.push(`${label} must be a valid URL.`);
  }
}

function flattenConfigEntries(value, prefix = []) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [{ key: prefix.join("."), value }];
  }

  return Object.entries(value).flatMap(([key, nested]) => flattenConfigEntries(nested, [...prefix, key]));
}

function collectFiles(rootDir, files = []) {
  if (!existsSync(rootDir)) {
    return files;
  }

  const stat = statSync(rootDir);
  if (stat.isFile()) {
    files.push(rootDir);
    return files;
  }

  for (const entry of readdirSync(rootDir)) {
    const fullPath = path.join(rootDir, entry);
    const entryStat = statSync(fullPath);
    if (entryStat.isDirectory()) {
      collectFiles(fullPath, files);
      continue;
    }
    if (RELEASE_SCAN_EXTENSIONS.has(path.extname(entry).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function scanForSecretValues(rootDir, errors) {
  for (const filePath of collectFiles(rootDir)) {
    const content = readFileSync(filePath, "utf8");
    for (const pattern of SECRET_VALUE_PATTERNS) {
      if (pattern.test(content)) {
        errors.push(`Secret-looking value found in ${path.relative(process.cwd(), filePath)}.`);
      }
    }
  }
}

function validatePackageConfig(packageJson, errors) {
  if (packageJson.build?.asar !== true) {
    errors.push("electron-builder must package with asar enabled.");
  }
  if (packageJson.build?.compression !== "maximum") {
    errors.push("electron-builder compression must be maximum.");
  }
  if (packageJson.build?.removePackageScripts !== true || packageJson.build?.removePackageKeywords !== true) {
    errors.push("release build should remove package scripts and keywords.");
  }
  if (packageJson.build?.nsis?.createDesktopShortcut !== true) {
    errors.push("Windows installer must create a desktop shortcut for testers.");
  }
  if (packageJson.build?.nsis?.createStartMenuShortcut !== true) {
    errors.push("Windows installer must create a Start Menu shortcut for testers.");
  }
  if (!packageJson.scripts?.["dist:win"]?.includes("scripts/package-windows.mjs")) {
    errors.push("dist:win must use the retrying Windows package script.");
  }
}

function validatePublicConfig(publicConfig, errors) {
  for (const required of REQUIRED_PUBLIC_CONFIG) {
    const value = getByPath(publicConfig, required.path);
    if (typeof value !== "string" || isPlaceholder(value.trim())) {
      errors.push(`${required.label} is missing from public/autopilot-config.json.`);
      continue;
    }
    if (required.path.at(-1)?.toLowerCase().includes("url")) {
      assertUrl(errors, required.label, value.trim());
    }
  }

  for (const entry of flattenConfigEntries(publicConfig)) {
    for (const forbidden of FORBIDDEN_PUBLIC_KEYS) {
      if (forbidden.test(entry.key)) {
        errors.push(`Forbidden secret key name "${entry.key}" is present in public config.`);
      }
    }
    if (typeof entry.value === "string") {
      for (const pattern of SECRET_VALUE_PATTERNS) {
        if (pattern.test(entry.value)) {
          errors.push(`Secret-looking value is present at public config key "${entry.key}".`);
        }
      }
    }
  }
}

function validateThreatResponseDocs(rootDir, errors) {
  const threatDocPath = path.join(rootDir, "docs", "COMPETITOR_ANALYSIS.md");
  if (!existsSync(threatDocPath)) {
    errors.push("docs/COMPETITOR_ANALYSIS.md was not found; release readiness needs the threat response matrix.");
    return;
  }

  const threatDoc = readFileSync(threatDocPath, "utf8");
  for (const marker of REQUIRED_THREAT_RESPONSE_MARKERS) {
    if (!threatDoc.includes(marker)) {
      errors.push(`docs/COMPETITOR_ANALYSIS.md is missing threat response marker: ${marker}.`);
    }
  }
}

export function validateReleaseReadiness(rootDir = process.cwd()) {
  const errors = [];
  const packagePath = path.join(rootDir, "package.json");
  const configPath = path.join(rootDir, "public", "autopilot-config.json");
  const distPath = path.join(rootDir, "dist");

  if (!existsSync(packagePath)) {
    return { ok: false, errors: ["package.json was not found."] };
  }

  validatePackageConfig(readJson(packagePath), errors);
  validateThreatResponseDocs(rootDir, errors);

  if (!existsSync(configPath)) {
    errors.push("public/autopilot-config.json was not found. Run npm run build before release verification.");
  } else {
    validatePublicConfig(readJson(configPath), errors);
  }

  if (!existsSync(distPath)) {
    errors.push("dist/ was not found. Run npm run build before release verification.");
  } else {
    scanForSecretValues(distPath, errors);
  }

  return { ok: errors.length === 0, errors };
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(fileURLToPath(import.meta.url))) {
  const result = validateReleaseReadiness();
  if (!result.ok) {
    console.error("Autopilot release readiness failed:");
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Autopilot release readiness passed: package config, public backend config, and build output are safe for beta packaging.");
}

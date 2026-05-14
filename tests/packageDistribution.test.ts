import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

type PackageJson = {
  scripts: Record<string, string>;
  build: {
    appId: string;
    productName: string;
    asar: boolean;
    compression: string;
    removePackageScripts: boolean;
    removePackageKeywords: boolean;
    npmRebuild: boolean;
    directories: { output: string };
    files: string[];
    win: { target: Array<{ target: string; arch: string[] }>; icon: string; signAndEditExecutable: boolean };
    mac: { target: Array<{ target: string; arch: string[] }>; category: string };
    nsis: { shortcutName: string; allowToChangeInstallationDirectory: boolean };
  };
};

function readPackageJson(): PackageJson {
  return JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as PackageJson;
}

describe("desktop distribution config", () => {
  it("has installer scripts for the Phase 3 desktop packaging flow", () => {
    const packageJson = readPackageJson();

    expect(packageJson.scripts.dist).toBe("npm run build && electron-builder");
    expect(packageJson.scripts["dist:win"]).toContain("scripts/package-windows.mjs");
    expect(packageJson.scripts["dist:mac"]).toContain("electron-builder --mac dmg");
    expect(packageJson.scripts["verify:release-config"]).toBe("node scripts/verify-release-readiness.mjs");
    expect(packageJson.scripts["test:packaged-smoke"]).toBe("node scripts/packaged-app-smoke.mjs");
    expect(packageJson.scripts["verify:release"]).toContain("npm run verify:release-config");
    expect(packageJson.scripts["verify:release"]).toContain("npm run dist:win");
    expect(packageJson.scripts["verify:release"]).toContain("npm run test:packaged-smoke");
  });

  it("packages Autopilot Browser as a real desktop app", () => {
    const packageJson = readPackageJson();

    expect(packageJson.build.productName).toBe("Autopilot Browser");
    expect(packageJson.build.appId).toBe("com.autopilot.browser");
    expect(packageJson.build.asar).toBe(true);
    expect(packageJson.build.compression).toBe("maximum");
    expect(packageJson.build.removePackageScripts).toBe(true);
    expect(packageJson.build.removePackageKeywords).toBe(true);
    expect(packageJson.build.npmRebuild).toBe(false);
    expect(packageJson.build.directories.output).toBe("release");
    expect(packageJson.build.files).toContain("dist/**/*");
    expect(packageJson.build.win.icon).toBe("public/autopilot-logo.ico");
    expect(packageJson.build.win.signAndEditExecutable).toBe(false);
    expect(packageJson.build.win.target[0]).toEqual({ target: "nsis", arch: ["x64"] });
    expect(packageJson.build.mac.target[0].target).toBe("dmg");
    expect(packageJson.build.nsis.shortcutName).toBe("Autopilot Browser");
    expect(packageJson.build.nsis.allowToChangeInstallationDirectory).toBe(true);
  });

  it("ships public Supabase account config scaffolding without service-role secrets", () => {
    const envExample = readFileSync(path.join(process.cwd(), ".env.example"), "utf8");
    const configScript = readFileSync(path.join(process.cwd(), "scripts", "generate-app-config.mjs"), "utf8");

    expect(envExample).toContain("AUTOPILOT_SUPABASE_PROJECT_REF=ctvxwmmclsfxortzmkeq");
    expect(envExample).toContain("AUTOPILOT_SUPABASE_URL=https://ctvxwmmclsfxortzmkeq.supabase.co");
    expect(envExample).toContain("AUTOPILOT_SUPABASE_ANON_KEY=");
    expect(envExample).toContain("AUTOPILOT_AI_PROXY_URL=");
    expect(envExample).toContain("AUTOPILOT_AI_ARTIFACT_URL=");
    expect(envExample).toContain("AUTOPILOT_AI_EMAIL_ACTIONS_URL=");
    expect(envExample).toContain("AUTOPILOT_OPENAI_MODEL=gpt-5.5");
    expect(configScript).toContain("ctvxwmmclsfxortzmkeq");
    expect(configScript).toContain("AUTOPILOT_SUPABASE_ANON_KEY");
    expect(configScript).toContain("SUPABASE_ANON_KEY");
    expect(configScript).toContain("AUTOPILOT_AI_PROXY_URL");
    expect(configScript).toContain("AUTOPILOT_AI_ARTIFACT_URL");
    expect(configScript).toContain("AUTOPILOT_AI_EMAIL_ACTIONS_URL");
    expect(configScript).toContain("deriveSiblingFunctionUrl");
    expect(configScript).toContain("functions/v1/ai");
    expect(configScript).toContain("AUTOPILOT_OPENAI_MODEL");
    expect(configScript.toLowerCase()).not.toContain("service_role");
  });

  it("uses a timestamped Windows package directory to avoid locked stale builds", () => {
    const packagingScript = readFileSync(path.join(process.cwd(), "scripts", "package-windows.mjs"), "utf8");

    expect(packagingScript).toContain("release-package-");
    expect(packagingScript).toContain("electron-builder");
    expect(packagingScript).toContain("--win");
    expect(packagingScript).toContain("nsis");
    expect(packagingScript).toContain("AUTOPILOT_RELEASE_DIR");
  });

  it("requires a packaged-app smoke hook for flagship AI generation flows", () => {
    const smokeScript = readFileSync(path.join(process.cwd(), "scripts", "packaged-app-smoke.mjs"), "utf8");

    expect(smokeScript).toContain("PACKAGED_AI_SMOKE_PROMPTS");
    expect(smokeScript).toContain("slideDeck");
    expect(smokeScript).toContain("website");
    expect(smokeScript).toContain("draft");
    expect(smokeScript).toContain("coding");
    expect(smokeScript).toContain("AUTOPILOT_PACKAGED_LIVE_AI_SMOKE");
    expect(smokeScript).toContain("runLiveAiSmoke");
    expect(smokeScript).toContain("No packaged win-unpacked Autopilot executable found");
    expect(smokeScript).toContain("Set AUTOPILOT_PACKAGED_LIVE_AI_SMOKE=true");
  });

  it("has a release readiness verifier for beta-safe packaged config", () => {
    const releaseScript = readFileSync(path.join(process.cwd(), "scripts", "verify-release-readiness.mjs"), "utf8");

    expect(releaseScript).toContain("REQUIRED_PUBLIC_CONFIG");
    expect(releaseScript).toContain("REQUIRED_THREAT_RESPONSE_MARKERS");
    expect(releaseScript).toContain("AI artifact URL");
    expect(releaseScript).toContain("AI email actions URL");
    expect(releaseScript).toContain("FORBIDDEN_PUBLIC_KEYS");
    expect(releaseScript).toContain("OPENAI_API_KEY");
    expect(releaseScript).toContain("SUPABASE_SERVICE_ROLE");
    expect(releaseScript).toContain("SECRET_VALUE_PATTERNS");
    expect(releaseScript).toContain("public/autopilot-config.json");
    expect(releaseScript).toContain("docs/COMPETITOR_ANALYSIS.md");
    expect(releaseScript).toContain("Threat Response Matrix");
    expect(releaseScript).toContain("dist/");
    expect(releaseScript).toContain("Autopilot release readiness passed");
  });

  it("documents launch risk, data flow, and server-side AI for testers", () => {
    const readme = readFileSync(path.join(process.cwd(), "README.md"), "utf8");
    const competitorFormat = readFileSync(path.join(process.cwd(), "docs", "COMPETITOR_ANALYSIS.md"), "utf8");
    const privacyFlow = readFileSync(path.join(process.cwd(), "docs", "PRIVACY_DATA_FLOW.md"), "utf8");

    expect(readme).toContain("docs/AI_BACKEND.md");
    expect(readme).toContain("docs/PRIVACY_DATA_FLOW.md");
    expect(readme).toContain("docs/COMPETITOR_ANALYSIS.md");
    expect(competitorFormat).toContain("Threat Appendix");
    expect(competitorFormat).toContain("Threat Response Matrix");
    expect(competitorFormat).toContain("Distribution failure");
    expect(competitorFormat).toContain("Action this week");
    expect(competitorFormat).toContain("Product response");
    expect(competitorFormat).toContain("Verification");
    expect(privacyFlow).toContain("What Stays Local");
    expect(privacyFlow).toContain("What Goes To The AI Proxy");
    expect(privacyFlow.toLowerCase()).not.toContain("service-role keys should be uploaded");
  });
});

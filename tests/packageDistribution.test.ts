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
    expect(packageJson.scripts["dist:win"]).toContain("electron-builder --win nsis");
    expect(packageJson.scripts["dist:mac"]).toContain("electron-builder --mac dmg");
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
    expect(configScript).toContain("ctvxwmmclsfxortzmkeq");
    expect(configScript).toContain("AUTOPILOT_SUPABASE_ANON_KEY");
    expect(configScript.toLowerCase()).not.toContain("service_role");
  });
});

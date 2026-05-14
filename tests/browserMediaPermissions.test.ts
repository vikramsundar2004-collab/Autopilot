import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const mainSource = readFileSync(new URL("../src/main/main.ts", import.meta.url), "utf8");

describe("browser media permissions", () => {
  it("allows fullscreen and camera/microphone through explicit browser permission handlers", () => {
    expect(mainSource).toContain("function configureSessionPermissions()");
    expect(mainSource).toContain('permission === "fullscreen"');
    expect(mainSource).toContain('permission !== "media"');
    expect(mainSource).toContain("setPermissionCheckHandler");
    expect(mainSource).toContain("setPermissionRequestHandler");
    expect(mainSource).toContain("promptForBrowserMediaPermission");
    expect(mainSource).toContain("browserMediaPermissionGrants");
    expect(mainSource).toContain("normalizePermissionOrigin");
  });

  it("keeps browser media origins constrained to web URLs", () => {
    expect(mainSource).toContain("function isAllowedBrowserMediaOrigin");
    expect(mainSource).toContain('parsedOrigin.protocol === "https:" || parsedOrigin.protocol === "http:"');
    expect(mainSource).toContain("callback(false)");
  });
});

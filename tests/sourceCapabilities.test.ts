import { describe, expect, it } from "vitest";

import { listProductivitySourceCapabilities } from "../src/shared/sourceCapabilities";

describe("productivity source capabilities", () => {
  it("covers the planned source categories without sending raw secrets to AI", () => {
    const capabilities = listProductivitySourceCapabilities();
    const ids = capabilities.map((capability) => capability.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        "gmail",
        "calendar",
        "drive_docs_slides_forms",
        "slack",
        "outlook",
        "onedrive",
        "browser_tabs",
        "downloads",
        "local_files",
        "github",
        "website_accounts"
      ])
    );
    expect(capabilities).toHaveLength(new Set(ids).size);
    expect(capabilities.every((capability) => capability.sendsRawSecretsToAi === false)).toBe(true);
  });

  it("keeps website account scanning opt-in and password-manager gated", () => {
    const websiteAccounts = listProductivitySourceCapabilities().find((capability) => capability.id === "website_accounts");

    expect(websiteAccounts).toEqual(
      expect.objectContaining({
        defaultEnabled: false,
        requiresUserConsent: true,
        canUsePasswordManager: true,
        sendsRawSecretsToAi: false,
        disabledReason: expect.stringContaining("Raw saved passwords are never sent")
      })
    );
  });
});

import { describe, expect, it } from "vitest";

import { decidePermission, getPermissionPolicySummary, inferPermissionRiskLevel, isExternalImpactActionText } from "../src/shared/permissionPolicy";

describe("permission policy", () => {
  it("allows read-only and local preparatory work without approval", () => {
    expect(decidePermission({ action: "read the selected email" })).toEqual(
      expect.objectContaining({
        riskLevel: "read",
        allowed: true,
        requiresApproval: false,
        policy: "safe_read"
      })
    );

    expect(decidePermission({ action: "draft a reply for review" })).toEqual(
      expect.objectContaining({
        riskLevel: "local_write",
        allowed: true,
        requiresApproval: false,
        policy: "safe_local_write"
      })
    );
  });

  it("blocks external writes until explicit approval", () => {
    expect(decidePermission({ action: "send the approved Gmail draft" })).toEqual(
      expect.objectContaining({
        riskLevel: "external_write",
        allowed: false,
        requiresApproval: true,
        policy: "approval_required"
      })
    );

    expect(decidePermission({ action: "send the approved Gmail draft", approved: true })).toEqual(
      expect.objectContaining({
        riskLevel: "external_write",
        allowed: true,
        requiresApproval: true,
        policy: "approval_required"
      })
    );
  });

  it("prevents Shadow Mode from changing external systems", () => {
    expect(decidePermission({ action: "apply labels and archive these emails", mode: "shadow" })).toEqual(
      expect.objectContaining({
        riskLevel: "external_write",
        allowed: false,
        requiresApproval: true,
        policy: "shadow_block"
      })
    );
  });

  it("requires explicit approval for high-impact external actions", () => {
    expect(decidePermission({ action: "commit these changes" })).toEqual(
      expect.objectContaining({
        riskLevel: "high_impact_external",
        allowed: false,
        requiresApproval: true,
        policy: "high_impact_approval_required"
      })
    );
    expect(decidePermission({ action: "pay the invoice", mode: "shadow" })).toEqual(
      expect.objectContaining({
        riskLevel: "high_impact_external",
        allowed: false,
        requiresApproval: true,
        policy: "shadow_block"
      })
    );
    expect(decidePermission({ action: "push the approved branch", approved: true })).toEqual(
      expect.objectContaining({
        riskLevel: "high_impact_external",
        allowed: true,
        requiresApproval: true,
        policy: "high_impact_approval_required"
      })
    );
  });

  it("blocks destructive actions even if the model claims approval", () => {
    expect(decidePermission({ action: "permanently delete the old thread", approved: true })).toEqual(
      expect.objectContaining({
        riskLevel: "destructive",
        allowed: false,
        requiresApproval: true,
        policy: "destructive_block"
      })
    );
  });

  it("distinguishes safe draft preparation from sending", () => {
    expect(inferPermissionRiskLevel("draft a response to the teacher")).toBe("local_write");
    expect(inferPermissionRiskLevel("send a response to the teacher")).toBe("external_write");
    expect(inferPermissionRiskLevel("transfer money to the vendor")).toBe("high_impact_external");
    expect(isExternalImpactActionText("draft a response to the teacher")).toBe(false);
    expect(isExternalImpactActionText("send a response to the teacher")).toBe(true);
    expect(isExternalImpactActionText("commit these changes")).toBe(true);
  });

  it("summarizes the policy for the Home runtime surface", () => {
    expect(getPermissionPolicySummary().map((policy) => policy.riskLevel)).toEqual(["read", "local_write", "external_write", "high_impact_external", "destructive"]);
  });
});

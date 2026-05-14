import { describe, expect, it } from "vitest";

import { WORKSPACE_BUTTON_CONTRACTS, getButtonContractSummary, validateButtonContracts } from "../src/shared/buttonContract";

describe("workspace button contracts", () => {
  it("keeps touched workspace controls backed by real actions or disabled reasons", () => {
    expect(validateButtonContracts(WORKSPACE_BUTTON_CONTRACTS)).toEqual([]);
  });

  it("covers every launch workspace so shell buttons cannot hide in one surface", () => {
    expect(getButtonContractSummary()).toEqual({
      home: expect.any(Number),
      browser: expect.any(Number),
      productivity: expect.any(Number),
      coding: expect.any(Number),
      design: expect.any(Number),
      automation: expect.any(Number),
      settings: expect.any(Number)
    });

    for (const count of Object.values(getButtonContractSummary())) {
      expect(count).toBeGreaterThan(0);
    }
  });

  it("covers critical productization controls in the Design workspace", () => {
    expect(WORKSPACE_BUTTON_CONTRACTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "design-share-artifact", action: "share", hasFeedback: true }),
        expect.objectContaining({ id: "design-send-to-coding", action: "export", disabledReason: "requires_active_artifact" }),
        expect.objectContaining({ id: "design-retry-generation", action: "generate_ai", hasLoadingState: true })
      ])
    );
  });

  it("covers money-management settings controls with real IPC actions or disabled reasons", () => {
    expect(WORKSPACE_BUTTON_CONTRACTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "settings-start-money-verification", workspace: "settings", action: "run_ipc", disabledReason: "requires_account" }),
        expect.objectContaining({ id: "settings-confirm-money-verification", workspace: "settings", action: "run_ipc", disabledReason: "requires_input" }),
        expect.objectContaining({ id: "settings-connect-stripe", workspace: "settings", action: "run_ipc", disabledReason: "not_enabled" }),
        expect.objectContaining({ id: "settings-refresh-stripe", workspace: "settings", action: "run_ipc", disabledReason: "not_enabled" }),
        expect.objectContaining({ id: "settings-disconnect-stripe", workspace: "settings", action: "run_ipc", disabledReason: "requires_connection" })
      ])
    );
  });

  it("covers Work Twin and Shadow Mode controls on Home", () => {
    expect(WORKSPACE_BUTTON_CONTRACTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "work-graph-review-work", workspace: "home", action: "open_panel" }),
        expect.objectContaining({ id: "work-graph-start-safe-work", workspace: "home", action: "run_ipc", hasFeedback: true }),
        expect.objectContaining({ id: "work-graph-show-proof", workspace: "home", action: "open_panel" }),
        expect.objectContaining({ id: "work-graph-approve", workspace: "home", action: "approve", disabledReason: "requires_approval" }),
        expect.objectContaining({ id: "work-graph-reject", workspace: "home", action: "reject", hasFeedback: true }),
        expect.objectContaining({ id: "work-graph-revise", workspace: "home", action: "generate_ai", hasFeedback: true }),
        expect.objectContaining({ id: "work-graph-make-rule", workspace: "home", action: "run_ipc", hasFeedback: true }),
        expect.objectContaining({ id: "work-graph-open-original", workspace: "home", action: "navigate" }),
        expect.objectContaining({ id: "home-review-top-work", workspace: "home", action: "open_panel" }),
        expect.objectContaining({ id: "home-start-safe-work", workspace: "home", action: "run_ipc", hasFeedback: true }),
        expect.objectContaining({ id: "home-source-health-open", workspace: "home", action: "navigate" }),
        expect.objectContaining({ id: "home-latest-activity-open", workspace: "home", action: "navigate" })
      ])
    );
  });

  it("catches async buttons without user-visible feedback", () => {
    expect(
      validateButtonContracts([
        {
          id: "bad-button",
          workspace: "design",
          label: "Generate",
          action: "generate_ai",
          async: true,
          hasLoadingState: false,
          hasFeedback: false,
          accessibleLabel: "Generate"
        }
      ])
    ).toEqual([
      { id: "bad-button", issue: "Async button must expose a loading state." },
      { id: "bad-button", issue: "Async button must expose success or error feedback." }
    ]);
  });
});

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const appSource = readFileSync("src/renderer/App.tsx", "utf8");
const homeCommandSource = readFileSync("src/renderer/components/HomeCommandCenter.tsx", "utf8");
const stylesSource = readFileSync("src/renderer/styles.css", "utf8");

describe("Home command center", () => {
  it("builds cross-workspace attention lanes from Work Twin state", () => {
    expect(appSource).toContain("const homeNeedsApprovalItems = useMemo");
    expect(appSource).toContain("const homeAiWorkingItems = useMemo");
    expect(appSource).toContain("const homeUserMustHandleItems = useMemo");
    expect(appSource).toContain("const homeAttentionLanes = useMemo<HomeAttentionLane[]>");
    expect(homeCommandSource).toContain('aria-label="Work Twin attention lanes"');
  });

  it("keeps Home actions wired to real workspaces or Work Twin operations", () => {
    expect(appSource).toContain("onSelectWorkGraphItem={setSelectedWorkGraphItemId}");
    expect(appSource).toContain("onStartSafeWork={(item) => void startWorkGraphSafeWork(item)}");
    expect(appSource).toContain('openWorkspaceByView("productivity")');
    expect(appSource).toContain('openWorkspaceByView("chatting")');
    expect(appSource).toContain('openWorkspaceByView("design")');
    expect(appSource).toContain("onOpenWorkspace={openWorkspaceByView}");
    expect(homeCommandSource).toContain('onOpenWorkspace("settings")');
  });

  it("surfaces source health and latest activity instead of static summary cards", () => {
    expect(appSource).toContain("const homeLatestActivity = useMemo<HomeActivityItem[]>");
    expect(appSource).toContain("const homeSourceHealth = useMemo<HomeSourceHealthItem[]>");
    expect(homeCommandSource).toContain("sourceHealth.map");
    expect(homeCommandSource).toContain("latestActivity.map");
    expect(appSource).toContain("AI backend");
    expect(homeCommandSource).toContain("Source Health");
  });

  it("surfaces finished payments and recurring payment proposals on Home with receipt verification", () => {
    expect(appSource).toContain("const homePaymentItems = useMemo<HomePaymentItem[]>");
    expect(appSource).toContain("paymentReceipts");
    expect(appSource).toContain("Verify receipt");
    expect(appSource).toContain("onVerifyReceipt={(receiptId) => void verifyHomePaymentReceipt(receiptId)}");
    expect(homeCommandSource).toContain("onVerifyReceipt(item.receiptId)");
    expect(appSource).toContain("payment_proposal");
    expect(stylesSource).toContain(".home-payment-list");
  });

  it("has dedicated responsive styling for the Stage 6 Home surfaces", () => {
    expect(stylesSource).toContain(".home-command-strip");
    expect(stylesSource).toContain(".home-attention-board");
    expect(stylesSource).toContain(".home-source-health-grid");
    expect(stylesSource).toContain(".home-latest-activity-list");
    expect(stylesSource).toContain(':root[data-theme="dark"] .home-attention-lane');
  });
});

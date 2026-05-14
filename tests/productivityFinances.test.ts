import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const appSource = readFileSync("src/renderer/App.tsx", "utf8");
const stylesSource = readFileSync("src/renderer/styles.css", "utf8");
const mainSource = readFileSync("src/main/main.ts", "utf8");

describe("Productivity finance and sender privacy UI", () => {
  it("adds a locked Finances sidebar in Productivity and links invoice notices to Home", () => {
    expect(appSource).toContain('aria-label="Finances"');
    expect(appSource).toContain("Invoices & money");
    expect(appSource).toContain("financeInvoiceCandidates");
    expect(appSource).toContain("Verification required before any payment proposal");
    expect(appSource).toContain("financeReady ? \"Review invoice\" : \"Enable finance\"");
    expect(appSource).toContain("moneyMovementSettings.stripeConnection.connectedAccountId");
    expect(appSource).toContain("getFinanceInvoiceCandidateFromBrowserTab(activeTab)");
    expect(appSource).toContain("activateTab(candidate.sourceId)");
    expect(stylesSource).toContain(".productivity-finance-sidebar");
    expect(stylesSource).toContain(".finance-invoice-card");
  });

  it("blocks selected Gmail senders before AI analysis and task sync", () => {
    expect(appSource).toContain("BLOCKED_EMAIL_SENDERS_STORAGE_KEY");
    expect(appSource).toContain("filterBlockedEmailMessages(emailMessages, normalizedBlockedEmailSenders)");
    expect(appSource).toContain("blocked sender list");
    expect(appSource).toContain("Block sender");
    expect(mainSource).toContain("filterBlockedEmailMessages(inboxResult.messages, blockedEmailSenders)");
    expect(mainSource).toContain("emailService.analyzeActionItems(readableMessages)");
  });

  it("removes the old CanvasFlow product name from the Design rail", () => {
    expect(appSource).not.toContain("CanvasFlow");
    expect(appSource).toContain("design-rail-mark");
    expect(stylesSource).toContain(".design-rail-mark");
  });
});

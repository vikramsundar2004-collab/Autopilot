import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { MoneyMovementService } from "../src/main/moneyMovement";
import type { AccountStatus } from "../src/shared/account";
import { buildPaymentMethodReadiness, evaluatePaymentRisk, type MoneyMovementSettings } from "../src/shared/highImpactActions";

function accountStatus(email = "user@example.com"): AccountStatus {
  return {
    configured: true,
    signedIn: true,
    userEmail: email,
    userId: "user-1",
    backend: {
      supabaseUrl: "https://ctvxwmmclsfxortzmkeq.supabase.co",
      supabaseProjectRef: "ctvxwmmclsfxortzmkeq",
      hasSupabaseAnonKey: true,
      aiProxyUrl: "https://ctvxwmmclsfxortzmkeq.supabase.co/functions/v1/ai",
      hasOpenAiKeyInProcess: false,
      aiProxyReady: true,
      aiProxyHealth: "ready",
      localDevelopmentMode: false,
      model: "gpt-5.5"
    }
  };
}

async function createService(status: AccountStatus | (() => AccountStatus) = accountStatus()): Promise<{ service: MoneyMovementService; dir: string }> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "autopilot-money-"));
  process.env.AUTOPILOT_LOCAL_PAYMENT_VERIFICATION = "1";
  process.env.AUTOPILOT_LOCAL_STRIPE_CONNECT = "1";
  return {
    dir,
    service: new MoneyMovementService(dir, async () => (typeof status === "function" ? status() : status), async () => "session-token")
  };
}

describe("money movement service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.AUTOPILOT_PAYMENTS_EXECUTE_URL;
    delete process.env.AUTOPILOT_LOCAL_PAYMENT_VERIFICATION;
    delete process.env.AUTOPILOT_LOCAL_STRIPE_CONNECT;
  });

  it("keeps money movement disabled by default", async () => {
    const { service } = await createService();
    const settings = await service.getSettings();
    expect(settings.enabled).toBe(false);
    expect(settings.emailVerifiedForPayments).toBe(false);
    expect(settings.status).toBe("disabled");
  });

  it("requires opt-in verification before payment approval", async () => {
    const { service } = await createService();
    const proposalResult = await service.createProposal({
      invoiceVerificationId: "missing-invoice",
      vendorVerificationId: "missing-vendor",
      payeeName: "Acme Vendor",
      amountCents: 1200,
      currency: "USD",
      reason: "Invoice from email",
      sourceEvidence: "Email from billing@acme.test requests payment for invoice 123."
    });
    expect(proposalResult.success).toBe(false);
    if (!proposalResult.success) {
      expect(proposalResult.reason).toContain("Verify the invoice");
    }
  });

  it("verifies in local development, executes test payment once, and prevents duplicate execution", async () => {
    const { service } = await createService();
    const started = await service.startVerification(true);
    expect(started.success).toBe(true);
    expect(started.status).toBe("verification_pending");
    expect(started.settings.moneyMovementEnabled).toBe(false);
    expect(started.settings.status).toBe("verification_pending");
    expect(started.debugVerificationCode).toMatch(/^\d{6}$/u);
    const confirmed = await service.confirmVerification(started.debugVerificationCode!);
    expect(confirmed.success).toBe(true);
    expect(confirmed.settings.emailVerifiedForPayments).toBe(true);
    expect(confirmed.settings.status).toBe("provider_setup_required");

    const blockedBeforeStripe = await service.createProposal({
      payeeName: "Acme Vendor",
      amountCents: 1200,
      currency: "USD",
      reason: "Invoice from email",
      sourceEvidence: "Email from billing@acme.test requests payment for invoice 123.",
      idempotencyKey: "invoice-before-stripe"
    });
    expect(blockedBeforeStripe.success).toBe(false);
    if (!blockedBeforeStripe.success) {
      expect(blockedBeforeStripe.reason).toContain("Verify the invoice");
    }

    const stripe = await service.startStripeConnect();
    expect(stripe.success).toBe(true);
    expect(stripe.settings.stripeConnection.status).toBe("connected");
    expect(stripe.settings.stripeConnection.connectedAccountId).toMatch(/^acct_test_/u);
    const destination = {
      providerKind: "stripe_hosted" as const,
      paymentMethodKind: "card" as const,
      connectedAccountId: stripe.settings.stripeConnection.connectedAccountId,
      hostedUrl: "https://checkout.stripe.com/c/pay/acme"
    };
    const invoice = await service.verifyInvoice({
      payeeName: "Acme Vendor",
      payeeEmail: "billing@acme.test",
      senderEmail: "billing@acme.test",
      amountCents: 1200,
      currency: "USD",
      invoiceNumber: "INV-123",
      dueDate: "2026-06-01",
      sourceEvidence: "Email from billing@acme.test requests payment for invoice INV-123.",
      destination,
      knownVendorDomains: ["acme.test"],
      idempotencyKey: "invoice-123"
    });
    expect(invoice.status).toBe("verified");
    const vendor = await service.verifyVendor({
      providerKind: "stripe_hosted",
      payeeName: "Acme Vendor",
      payeeEmail: "billing@acme.test",
      destination,
      trustedDomains: ["acme.test"]
    });
    expect(vendor.status).toBe("verified");

    const proposalResult = await service.createProposal({
      providerKind: "stripe_hosted",
      paymentMethodKind: "card",
      invoiceVerificationId: invoice.id,
      vendorVerificationId: vendor.id,
      destination,
      payeeName: "Acme Vendor",
      amountCents: 1200,
      currency: "USD",
      reason: "Invoice from email",
      sourceEvidence: "Email from billing@acme.test requests payment for invoice 123.",
      idempotencyKey: "invoice-123"
    });
    expect(proposalResult.success).toBe(true);
    if (!proposalResult.success) {
      return;
    }
    expect(proposalResult.proposal.connectedStripeAccountId).toBe(stripe.settings.stripeConnection.connectedAccountId);
    expect(proposalResult.proposal.paymentMethodKind).toBe("card");
    expect(proposalResult.proposal.paymentMethodLabel).toBe("Card");
    expect(proposalResult.proposal.invoiceVerificationId).toBe(invoice.id);
    expect(proposalResult.proposal.vendorVerificationId).toBe(vendor.id);
    expect(proposalResult.proposal.status).toBe("proposed");
    const approval = await service.approve(proposalResult.proposal.id, true);
    expect(approval.success).toBe(true);
    if (!approval.success) {
      return;
    }

    process.env.AUTOPILOT_PAYMENTS_EXECUTE_URL = "https://payments.test/functions/v1/payments-execute";
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, reason: "STRIPE_SECRET_KEY is not configured. No money moved." }), {
          status: 503,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            providerPaymentId: "pi_test_real_stripe_call",
            connectedStripeAccountId: stripe.settings.stripeConnection.connectedAccountId
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );

    const notExecuted = await service.execute(proposalResult.proposal.id, approval.approval.id, "test");
    expect(notExecuted.success).toBe(false);
    if (!notExecuted.success) {
      expect(notExecuted.reason).toContain("No money moved");
    }

    const execution = await service.execute(proposalResult.proposal.id, approval.approval.id, "test");
    expect(execution.success).toBe(true);
    if (execution.success) {
      expect(execution.receipt.connectedStripeAccountId).toBe(stripe.settings.stripeConnection.connectedAccountId);
      expect(execution.receipt.fundingSource).toBe("user_connected_stripe_account");
      expect(execution.receipt.providerPaymentId).toBe("pi_test_real_stripe_call");
      const receipts = await service.listReceipts();
      expect(receipts[0]?.id).toBe(execution.receipt.id);
      const receiptVerification = await service.verifyReceipt(execution.receipt.id);
      expect(receiptVerification.success).toBe(true);
      if (receiptVerification.success) {
        expect(receiptVerification.providerConfirmed).toBe(true);
        expect(receiptVerification.message).toContain("pi_test_real_stripe_call");
      }
    }
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://payments.test/functions/v1/payments-execute",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer session-token",
          "content-type": "application/json"
        })
      })
    );
    const requestBody = JSON.parse(String(fetchSpy.mock.calls.at(-1)?.[1]?.body));
    expect(requestBody.proposal.paymentMethodKind).toBe("card");
    const duplicate = await service.execute(proposalResult.proposal.id, approval.approval.id, "test");
    expect(duplicate.success).toBe(true);
    if (duplicate.success) {
      expect(duplicate.duplicatePrevented).toBe(true);
    }
  });

  it("uses a 6-digit Supabase payment verification key before enabling money movement", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "autopilot-money-"));
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            status: "verification_pending",
            reason: "Payment verification code sent to your email.",
            nextStep: "Open your email, copy the 6-digit money movement code, and enter it in Settings.",
            expiresAt: Date.now() + 60_000,
            settings: {
              verificationMethod: "code",
              verificationEmailTransport: "resend",
              verificationEmailReady: true,
              verificationEmailLastSentAt: 1_768_000_000_000
            }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            status: "provider_setup_required",
            reason: "Money movement is verified and turned on for this account.",
            settings: {
              moneyMovementEnabled: true,
              emailVerifiedForPayments: true,
              liveModeEnabled: false
            }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );
    const service = new MoneyMovementService(dir, async () => accountStatus("user@example.com"), async () => "session-token");

    const started = await service.startVerification(true);

    expect(started.success).toBe(true);
    expect(started.debugVerificationCode).toBeUndefined();
    expect(started.settings.verificationMethod).toBe("code");
    expect(started.settings.verificationEmailTransport).toBe("resend");
    expect(started.settings.verificationEmailReady).toBe(true);
    expect(fetchSpy.mock.calls[0][0]).toBe("https://ctvxwmmclsfxortzmkeq.supabase.co/functions/v1/payments-verification");
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toEqual({ action: "start" });

    const invalid = await service.confirmVerification("123");
    expect(invalid.success).toBe(false);
    expect(invalid.reason).toContain("6-digit");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const confirmed = await service.confirmVerification("123456");

    expect(confirmed.success).toBe(true);
    expect(confirmed.settings.moneyMovementEnabled).toBe(true);
    expect(confirmed.settings.emailVerifiedForPayments).toBe(true);
    expect(fetchSpy.mock.calls[1][0]).toBe("https://ctvxwmmclsfxortzmkeq.supabase.co/functions/v1/payments-verification");
    expect(JSON.parse(String(fetchSpy.mock.calls[1][1]?.body))).toEqual({ action: "confirm", code: "123456" });
  });

  it("disables money movement when the account email changes", async () => {
    let status = accountStatus("first@example.com");
    const { service } = await createService(() => status);
    const started = await service.startVerification(true);
    await service.confirmVerification(started.debugVerificationCode!);

    status = accountStatus("second@example.com");
    const settings = await service.getSettings();
    expect(settings.enabled).toBe(false);
    expect(settings.emailVerifiedForPayments).toBe(false);
    expect(settings.disabledReason).toContain("Account email changed");
  });

  it("blocks changed amount/payee after approval and live mode without server flag", async () => {
    const { service, dir } = await createService();
    const started = await service.startVerification(true);
    await service.confirmVerification(started.debugVerificationCode!);
    const stripe = await service.startStripeConnect();
    const destination = {
      providerKind: "stripe_hosted" as const,
      connectedAccountId: stripe.settings.stripeConnection.connectedAccountId,
      hostedUrl: "https://checkout.stripe.com/c/pay/acme"
    };
    const invoice = await service.verifyInvoice({
      payeeName: "Acme Vendor",
      payeeEmail: "billing@acme.test",
      senderEmail: "billing@acme.test",
      amountCents: 1200,
      currency: "USD",
      invoiceNumber: "INV-123",
      dueDate: "2026-06-01",
      sourceEvidence: "Email from billing@acme.test requests payment for invoice INV-123.",
      destination,
      knownVendorDomains: ["acme.test"]
    });
    const vendor = await service.verifyVendor({
      providerKind: "stripe_hosted",
      payeeName: "Acme Vendor",
      payeeEmail: "billing@acme.test",
      destination,
      trustedDomains: ["acme.test"]
    });
    const proposalResult = await service.createProposal({
      providerKind: "stripe_hosted",
      invoiceVerificationId: invoice.id,
      vendorVerificationId: vendor.id,
      destination,
      payeeName: "Acme Vendor",
      amountCents: 1200,
      currency: "USD",
      reason: "Invoice from email",
      sourceEvidence: "Email from billing@acme.test requests payment for invoice 123."
    });
    expect(proposalResult.success).toBe(true);
    if (!proposalResult.success) {
      return;
    }
    const approval = await service.approve(proposalResult.proposal.id, true);
    expect(approval.success).toBe(true);
    if (!approval.success) {
      return;
    }
    const storePath = path.join(dir, "money-movement.json");
    const store = JSON.parse(await fs.readFile(storePath, "utf8")) as { proposals: Array<{ id: string; amountCents: number }> };
    store.proposals = store.proposals.map((proposal) => (proposal.id === proposalResult.proposal.id ? { ...proposal, amountCents: 2200 } : proposal));
    await fs.writeFile(storePath, JSON.stringify(store), "utf8");
    const changed = await service.execute(proposalResult.proposal.id, approval.approval.id, "test");
    expect(changed.success).toBe(false);

    const settings = await service.getSettings();
    const risk = evaluatePaymentRisk(
      {
        payeeName: "Acme Vendor",
        amountCents: 1200,
        currency: "USD",
        reason: "Invoice from email",
        sourceEvidence: "Email from billing@acme.test requests payment for invoice 123.",
        requestedMode: "live",
        invoiceVerificationId: invoice.id,
        vendorVerificationId: vendor.id
      },
      settings as MoneyMovementSettings
    );
    expect(risk.blockedReasons.join(" ")).toContain("Live payments are blocked");
  });

  it("creates invoice review instead of payment plan for incomplete or suspicious invoices", async () => {
    const { service } = await createService();
    const incomplete = await service.verifyInvoice({
      payeeName: "Acme Vendor",
      payeeEmail: "billing@acme.test",
      senderEmail: "billing@acme.test",
      amountCents: 1200,
      currency: "USD",
      sourceEvidence: "Please pay this invoice.",
      knownVendorDomains: ["acme.test"]
    });
    expect(incomplete.status).not.toBe("verified");
    expect(incomplete.missingEvidence).toEqual(expect.arrayContaining(["Invoice number or unique reference", "Payment destination"]));

    const suspicious = await service.verifyInvoice({
      payeeName: "Acme Vendor",
      payeeEmail: "billing@acme.test",
      senderEmail: "acme-payments@gmail.com",
      amountCents: 49000,
      currency: "USD",
      invoiceNumber: "INV-URGENT",
      dueDate: "2026-06-01",
      sourceEvidence: "Urgent final notice. Pay with gift card or wire immediately.",
      destination: { providerKind: "stripe_hosted", hostedUrl: "https://bit.ly/pay-now", connectedAccountId: "acct_test_bad" },
      knownVendorDomains: ["acme.test"]
    });
    expect(suspicious.status).toBe("suspicious");

    const proposal = await service.createProposal({
      providerKind: "stripe_hosted",
      invoiceVerificationId: incomplete.id,
      vendorVerificationId: "missing-vendor",
      payeeName: "Acme Vendor",
      amountCents: 1200,
      currency: "USD",
      reason: "Invoice from email",
      sourceEvidence: "Please pay this invoice."
    });
    expect(proposal.success).toBe(false);
    if (!proposal.success) {
      expect(proposal.reason).toContain("Invoice verification");
    }
  });

  it("fails closed instead of throwing on malformed invoice input", async () => {
    const { service } = await createService();
    const report = await service.verifyInvoice({
      payeeName: undefined,
      amountCents: Number.NaN,
      currency: undefined,
      sourceEvidence: undefined
    } as never);

    expect(report.status).toBe("blocked");
    expect(report.missingEvidence).toEqual(expect.arrayContaining(["Exact payee", "Exact positive amount", "Invoice number or unique reference", "Source evidence"]));
  });

  it("shows provider readiness without marking unfinished providers as ready", async () => {
    const { service } = await createService();
    const readiness = await service.getProviderReadiness();
    expect(readiness.find((provider) => provider.providerKind === "stripe_hosted")?.readinessPercent).toBeLessThan(100);
    expect(readiness.find((provider) => provider.providerKind === "paypal_hosted")?.safetyStatus).toBe("not_implemented");
    expect(readiness.find((provider) => provider.providerKind === "card_checkout")?.currentStep).toContain("Tokenized");
  });

  it("lists Card, Bank, Cash App Pay, Klarna, and Wallet as provider-hosted methods with receipts required", async () => {
    const { service } = await createService();
    const settings = await service.getSettings();
    const methodKinds = settings.paymentMethodReadiness.map((method) => method.kind);

    expect(methodKinds).toEqual(["card", "bank_account", "cash_app_pay", "klarna", "wallet"]);
    expect(settings.paymentMethodReadiness).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Card", providerHosted: true, receiptRequired: true }),
        expect.objectContaining({ label: "Bank", providerHosted: true, receiptRequired: true }),
        expect.objectContaining({ label: "Cash App Pay", providerHosted: true, receiptRequired: true }),
        expect.objectContaining({ label: "Klarna", providerHosted: true, receiptRequired: true }),
        expect.objectContaining({ label: "Wallet", providerHosted: true, receiptRequired: true })
      ])
    );
  });

  it("keeps non-card methods in provider-hosted confirmation instead of creating fake receipts", async () => {
    const { service } = await createService();
    const started = await service.startVerification(true);
    await service.confirmVerification(started.debugVerificationCode!);
    const stripe = await service.startStripeConnect();
    const destination = {
      providerKind: "stripe_hosted" as const,
      paymentMethodKind: "cash_app_pay" as const,
      connectedAccountId: stripe.settings.stripeConnection.connectedAccountId,
      hostedUrl: "https://checkout.stripe.com/c/pay/acme"
    };
    const invoice = await service.verifyInvoice({
      payeeName: "Acme Vendor",
      payeeEmail: "billing@acme.test",
      senderEmail: "billing@acme.test",
      amountCents: 1200,
      currency: "USD",
      invoiceNumber: "INV-CASH-APP",
      dueDate: "2026-06-01",
      sourceEvidence: "Email from billing@acme.test requests payment for invoice INV-CASH-APP.",
      destination,
      knownVendorDomains: ["acme.test"]
    });
    const vendor = await service.verifyVendor({
      providerKind: "stripe_hosted",
      payeeName: "Acme Vendor",
      payeeEmail: "billing@acme.test",
      destination,
      trustedDomains: ["acme.test"]
    });
    const proposalResult = await service.createProposal({
      providerKind: "stripe_hosted",
      paymentMethodKind: "cash_app_pay",
      invoiceVerificationId: invoice.id,
      vendorVerificationId: vendor.id,
      destination,
      payeeName: "Acme Vendor",
      payeeEmail: "billing@acme.test",
      amountCents: 1200,
      currency: "USD",
      reason: "Invoice from email",
      sourceEvidence: "Email from billing@acme.test requests payment for invoice INV-CASH-APP.",
      idempotencyKey: "invoice-cash-app"
    });
    expect(proposalResult.success).toBe(true);
    if (!proposalResult.success) {
      return;
    }
    expect(proposalResult.proposal.paymentMethodLabel).toBe("Cash App Pay");
    const approval = await service.approve(proposalResult.proposal.id, true);
    expect(approval.success).toBe(true);
    if (!approval.success) {
      return;
    }
    process.env.AUTOPILOT_PAYMENTS_EXECUTE_URL = "https://payments.test/functions/v1/payments-execute";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, providerPaymentId: "pi_should_not_exist" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const execution = await service.execute(proposalResult.proposal.id, approval.approval.id, "test");

    expect(execution.success).toBe(false);
    if (!execution.success) {
      expect(execution.reason).toContain("provider-hosted confirmation");
      expect(execution.reason).toContain("No money moved");
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await service.listReceipts()).toEqual([]);
  });

  it("marks payment-method readiness as test-only until live checks pass", () => {
    const readiness = buildPaymentMethodReadiness({
      enabled: true,
      emailVerifiedForPayments: true,
      liveModeEnabled: false,
      stripeConnection: {
        status: "connected",
        connectedAccountId: "acct_test_user",
        accountEmail: "user@example.com",
        chargesEnabled: false,
        payoutsEnabled: true,
        detailsSubmitted: true,
        connectedAt: 1,
        lastCheckedAt: 2
      }
    });

    expect(readiness.every((method) => method.safetyStatus === "test_only")).toBe(true);
    expect(readiness.every((method) => method.readinessPercent < 100)).toBe(true);
  });
});

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { AccountStatus } from "../shared/account.js";
import {
  DEFAULT_STRIPE_CONNECTION,
  MONEY_MOVEMENT_DISABLED_REASON,
  STRIPE_CONNECT_REQUIRED_REASON,
  buildPaymentMethodReadiness,
  buildProviderReadiness,
  createPaymentApprovalFingerprint,
  estimateStripeFeesCents,
  evaluatePaymentRisk,
  formatPaymentMethodLabel,
  normalizeCurrency,
  normalizePaymentMethodKind,
  verifyInvoiceCandidate,
  verifyVendorDestination,
  type HostedApprovalResult,
  type InvoiceCandidate,
  type InvoiceVerificationReport,
  type MoneyMovementActionResult,
  type MoneyMovementSettings,
  type MoneyMovementVerification,
  type PaymentDestination,
  type PaymentApproval,
  type PaymentExecutionResult,
  type PaymentMode,
  type PaymentProviderKind,
  type PaymentProposal,
  type PaymentProposalInput,
  type PaymentQuoteResult,
  type PaymentReceipt,
  type PaymentReceiptVerificationResult,
  type ProviderReadinessChecklist,
  type StripeAccountConnection,
  type StripeConnectionStatus,
  type VendorVerificationReport
} from "../shared/highImpactActions.js";

const STORE_FILE = "money-movement.json";
const VERIFICATION_TTL_MS = 15 * 60 * 1000;

type MoneyMovementStore = {
  version: 1;
  settings: MoneyMovementSettings;
  pendingVerification?: {
    email: string;
    code: string;
    expiresAt: number;
  };
  invoiceVerifications: InvoiceVerificationReport[];
  vendorVerifications: VendorVerificationReport[];
  proposals: PaymentProposal[];
  approvals: PaymentApproval[];
  receipts: PaymentReceipt[];
};

type ServerVerificationResponse = {
  success?: boolean;
  status?: MoneyMovementSettings["status"];
  reason?: string;
  nextStep?: string;
  expiresAt?: number;
  debugVerificationCode?: string;
  settings?: Partial<MoneyMovementSettings>;
};

type ServerStripeConnectResponse = ServerVerificationResponse & {
  url?: string;
};

export class MoneyMovementService {
  constructor(
    private readonly dataRoot: string | (() => string),
    private readonly getAccountStatus: () => Promise<AccountStatus>,
    private readonly getSessionAccessToken: () => Promise<string | null>
  ) {}

  async getSettings(): Promise<MoneyMovementSettings> {
    const [store, accountStatus] = await Promise.all([this.loadStore(), this.getAccountStatus()]);
    const reconciled = reconcileSettingsWithAccount(store.settings, accountStatus, store.receipts.length);
    if (JSON.stringify(reconciled) !== JSON.stringify(store.settings)) {
      store.settings = reconciled;
      await this.saveStore(store);
    }
    return reconciled;
  }

  async getProviderReadiness(): Promise<ProviderReadinessChecklist[]> {
    return (await this.getSettings()).providerReadiness;
  }

  async listReceipts(): Promise<PaymentReceipt[]> {
    const store = await this.loadStore();
    return structuredClone(store.receipts);
  }

  async verifyReceipt(receiptId: string): Promise<PaymentReceiptVerificationResult> {
    const store = await this.loadStore();
    const receipt = store.receipts.find((candidate) => candidate.id === receiptId);
    const verifiedAt = Date.now();
    if (!receipt) {
      return {
        success: false,
        verifiedAt,
        providerConfirmed: false,
        reason: "Payment receipt was not found.",
        nextStep: "Refresh Home, then open the payment from the Finance section."
      };
    }

    const settings = await this.getSettings();
    const providerId = receipt.providerConfirmationId || receipt.providerPaymentId;
    if (!providerId) {
      return {
        success: false,
        receipt,
        verifiedAt,
        providerConfirmed: false,
        reason: "This receipt does not include a provider confirmation id. No money should be treated as moved.",
        nextStep: "Open the payment provider dashboard and rerun payment confirmation before trusting this receipt."
      };
    }

    if (receipt.providerKind === "stripe_hosted" && receipt.connectedStripeAccountId !== settings.stripeConnection.connectedAccountId) {
      return {
        success: false,
        receipt,
        verifiedAt,
        providerConfirmed: false,
        reason: "The saved receipt belongs to a different Stripe connected account than the one currently connected.",
        nextStep: "Reconnect the original Stripe account or verify this payment inside Stripe before acting on it."
      };
    }

    return {
      success: true,
      receipt,
      verifiedAt,
      providerConfirmed: true,
      message: `Provider confirmation ${providerId} is attached to this receipt.`
    };
  }

  async verifyInvoice(candidate: InvoiceCandidate): Promise<InvoiceVerificationReport> {
    const store = await this.loadStore();
    const report = verifyInvoiceCandidate(candidate, store.receipts);
    store.invoiceVerifications = [report, ...store.invoiceVerifications.filter((existing) => existing.id !== report.id)].slice(0, 200);
    await this.saveStore(store);
    return report;
  }

  async verifyVendor(input: {
    providerKind: PaymentProviderKind;
    payeeName: string;
    payeeEmail?: string;
    destination?: PaymentDestination;
    trustedDomains?: string[];
    userApprovedVendorRecord?: boolean;
  }): Promise<VendorVerificationReport> {
    const store = await this.loadStore();
    const report = verifyVendorDestination(input);
    store.vendorVerifications = [report, ...store.vendorVerifications.filter((existing) => existing.id !== report.id)].slice(0, 200);
    await this.saveStore(store);
    return report;
  }

  async startVerification(acknowledged: boolean): Promise<MoneyMovementVerification> {
    const store = await this.loadStore();
    const accountStatus = await this.getAccountStatus();
    store.settings = reconcileSettingsWithAccount(store.settings, accountStatus, store.receipts.length);

    if (!accountStatus.signedIn || !accountStatus.userEmail) {
      store.settings = {
        ...store.settings,
        enabled: false,
        moneyMovementEnabled: false,
        status: "disabled",
        disabledReason: "Sign into Autopilot before enabling money movement.",
        nextStep: "Open Settings and sign into your Supabase-backed Autopilot account."
      };
      await this.saveStore(store);
      return {
        success: false,
        status: store.settings.status,
        reason: store.settings.disabledReason,
        nextStep: store.settings.nextStep,
        settings: store.settings
      };
    }

    if (!acknowledged) {
      return {
        success: false,
        status: store.settings.status,
        reason: "You must confirm that Autopilot can execute payments only after your per-payment approval.",
        nextStep: "Read the risk explanation, then enable the verification flow.",
        settings: store.settings
      };
    }

    const serverResult = await this.callVerificationFunction("start");
    if (serverResult.success && serverResult.status === "verification_pending") {
      store.settings = deriveReadiness(
        {
          ...store.settings,
          ...serverResult.settings,
          enabled: true,
          moneyMovementEnabled: false,
          emailVerifiedForPayments: false,
          status: "verification_pending",
          accountEmail: accountStatus.userEmail,
          verifiedEmail: null,
          verificationExpiresAt: serverResult.expiresAt ?? store.settings.verificationExpiresAt,
          verificationMethod: serverResult.settings?.verificationMethod ?? "code",
          verificationEmailTransport: serverResult.settings?.verificationEmailTransport ?? store.settings.verificationEmailTransport,
          verificationEmailReady: serverResult.settings?.verificationEmailReady ?? true,
          verificationEmailLastSentAt: serverResult.settings?.verificationEmailLastSentAt ?? Date.now(),
          disabledReason: MONEY_MOVEMENT_DISABLED_REASON,
          nextStep: serverResult.nextStep ?? "Check your email for the money movement verification code."
        },
        store.receipts.length
      );
      await this.saveStore(store);
      return {
        success: true,
        status: "verification_pending",
        reason: serverResult.reason ?? "Payment verification email sent.",
        nextStep: store.settings.nextStep,
        expiresAt: serverResult.expiresAt,
        debugVerificationCode: serverResult.debugVerificationCode,
        settings: store.settings
      };
    }
    if (serverResult.success && serverResult.settings?.emailVerifiedForPayments) {
      store.settings = {
        ...store.settings,
        ...serverResult.settings,
        enabled: true,
        moneyMovementEnabled: true,
        emailVerifiedForPayments: true,
        status: serverResult.settings.liveModeEnabled ? "ready" : "provider_setup_required",
        accountEmail: accountStatus.userEmail,
        verifiedEmail: accountStatus.userEmail,
        enabledAt: store.settings.enabledAt ?? Date.now(),
        disabledAt: null,
        lastVerificationAt: Date.now(),
        verificationExpiresAt: null,
        verificationMethod: null,
        verificationEmailTransport: null,
        verificationEmailReady: false,
        verificationEmailLastSentAt: store.settings.verificationEmailLastSentAt,
        testModeOnly: true,
        provider: "stripe",
        receiptsCount: store.receipts.length,
        disabledReason: undefined,
        nextStep: serverResult.nextStep ?? STRIPE_CONNECT_REQUIRED_REASON
      };
      store.settings = deriveReadiness(store.settings, store.receipts.length);
      await this.saveStore(store);
      return {
        success: true,
        status: store.settings.status,
        reason: serverResult.reason ?? "Payment email verification is complete.",
        nextStep: store.settings.nextStep,
        settings: store.settings
      };
    }

    if (!allowLocalVerificationFallback()) {
      store.settings = {
        ...store.settings,
        status: "verification_pending",
        accountEmail: accountStatus.userEmail,
        verificationMethod: null,
        verificationEmailTransport: "not_configured",
        verificationEmailReady: false,
        disabledReason: serverResult.reason ?? "Payment verification backend is not ready.",
        nextStep: serverResult.nextStep ?? "Deploy the Supabase payments-verification function, then retry."
      };
      await this.saveStore(store);
      return {
        success: false,
        status: store.settings.status,
        reason: store.settings.disabledReason,
        nextStep: store.settings.nextStep,
        settings: store.settings
      };
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + VERIFICATION_TTL_MS;
    store.pendingVerification = {
      email: accountStatus.userEmail,
      code,
      expiresAt
    };
    store.settings = {
      ...store.settings,
      enabled: true,
      moneyMovementEnabled: false,
      emailVerifiedForPayments: false,
      status: "verification_pending",
      accountEmail: accountStatus.userEmail,
      verifiedEmail: null,
      verificationExpiresAt: expiresAt,
      verificationMethod: "code",
      verificationEmailTransport: "development",
      verificationEmailReady: true,
      verificationEmailLastSentAt: Date.now(),
      disabledReason: MONEY_MOVEMENT_DISABLED_REASON,
      nextStep: "Enter the development verification code. Production should use the Supabase Edge verification function."
    };
    await this.saveStore(store);
    return {
      success: true,
      status: "verification_pending",
      reason: "Development verification code created.",
      nextStep: store.settings.nextStep,
      expiresAt,
      debugVerificationCode: code,
      settings: store.settings
    };
  }

  async confirmVerification(code: string): Promise<MoneyMovementVerification> {
    const store = await this.loadStore();
    const accountStatus = await this.getAccountStatus();
    store.settings = reconcileSettingsWithAccount(store.settings, accountStatus, store.receipts.length);

    const verificationCode = normalizeVerificationCode(code);
    if (!/^\d{6}$/u.test(verificationCode)) {
      return {
        success: false,
        status: "verification_pending",
        reason: "Enter the 6-digit payment verification key from your email.",
        nextStep: "Open the latest Autopilot money movement email and copy the six numbers.",
        settings: store.settings
      };
    }

    const serverResult = await this.callVerificationFunction("confirm", verificationCode);
    if (serverResult.success && serverResult.settings?.emailVerifiedForPayments && accountStatus.userEmail) {
      store.settings = {
        ...store.settings,
        ...serverResult.settings,
        enabled: true,
        moneyMovementEnabled: true,
        emailVerifiedForPayments: true,
        status: serverResult.settings.liveModeEnabled ? "ready" : "provider_setup_required",
        accountEmail: accountStatus.userEmail,
        verifiedEmail: accountStatus.userEmail,
        enabledAt: store.settings.enabledAt ?? Date.now(),
        disabledAt: null,
        lastVerificationAt: Date.now(),
        verificationExpiresAt: null,
        verificationMethod: null,
        verificationEmailTransport: null,
        verificationEmailReady: false,
        verificationEmailLastSentAt: store.settings.verificationEmailLastSentAt,
        testModeOnly: true,
        provider: "stripe",
        receiptsCount: store.receipts.length,
        disabledReason: undefined,
        nextStep: serverResult.nextStep ?? STRIPE_CONNECT_REQUIRED_REASON
      };
      store.settings = deriveReadiness(store.settings, store.receipts.length);
      delete store.pendingVerification;
      await this.saveStore(store);
      return {
        success: true,
        status: store.settings.status,
        reason: serverResult.reason ?? "Money movement is verified for this account email.",
        nextStep: store.settings.nextStep,
        settings: store.settings
      };
    }

    if (!store.pendingVerification || !accountStatus.userEmail || store.pendingVerification.email !== accountStatus.userEmail) {
      return {
        success: false,
        status: store.settings.status,
        reason: serverResult.reason ?? "Start verification before confirming a code.",
        nextStep: serverResult.nextStep ?? "Request a fresh money movement verification from Settings.",
        settings: store.settings
      };
    }
    if (store.pendingVerification.expiresAt < Date.now()) {
      delete store.pendingVerification;
      store.settings.verificationExpiresAt = null;
      await this.saveStore(store);
      return {
        success: false,
        status: "verification_pending",
        reason: "Verification code expired.",
        nextStep: "Request a fresh money movement verification from Settings.",
        settings: store.settings
      };
    }
    if (store.pendingVerification.code !== verificationCode) {
      return {
        success: false,
        status: "verification_pending",
        reason: "Verification key did not match.",
        nextStep: "Enter the latest 6-digit key from the payment verification email.",
        settings: store.settings
      };
    }

    store.settings = {
      ...store.settings,
      enabled: true,
      moneyMovementEnabled: true,
      emailVerifiedForPayments: true,
      status: "provider_setup_required",
      verifiedEmail: accountStatus.userEmail,
      enabledAt: store.settings.enabledAt ?? Date.now(),
      disabledAt: null,
      lastVerificationAt: Date.now(),
      verificationExpiresAt: null,
      verificationMethod: null,
      verificationEmailTransport: null,
      verificationEmailReady: false,
      verificationEmailLastSentAt: store.settings.verificationEmailLastSentAt,
      testModeOnly: true,
      liveModeEnabled: false,
      disabledReason: undefined,
      nextStep: STRIPE_CONNECT_REQUIRED_REASON
    };
    store.settings = deriveReadiness(store.settings, store.receipts.length);
    delete store.pendingVerification;
    await this.saveStore(store);
    return {
      success: true,
      status: store.settings.status,
      reason: "Money movement verified for this account email.",
      nextStep: store.settings.nextStep,
      settings: store.settings
    };
  }

  async disable(): Promise<MoneyMovementActionResult> {
    const store = await this.loadStore();
    store.settings = {
      ...store.settings,
      enabled: false,
      moneyMovementEnabled: false,
      emailVerifiedForPayments: false,
      status: "disabled",
      disabledAt: Date.now(),
      verificationExpiresAt: null,
      verificationMethod: null,
      verificationEmailTransport: null,
      verificationEmailReady: false,
      disabledReason: "Money movement is disabled.",
      nextStep: "Enable it again from Settings and re-verify your email before any payment execution."
    };
    delete store.pendingVerification;
    await this.saveStore(store);
    return {
      success: true,
      settings: store.settings,
      reason: "Money movement disabled. Existing receipts remain available for audit."
    };
  }

  async startStripeConnect(): Promise<MoneyMovementActionResult> {
    const store = await this.loadStore();
    let settings = await this.getSettings();
    if (!settings.enabled || !settings.emailVerifiedForPayments) {
      return {
        success: false,
        settings,
        reason: MONEY_MOVEMENT_DISABLED_REASON,
        nextStep: "Authorize money movement and verify your email before connecting Stripe."
      };
    }

    const serverResult = await this.callStripeConnectFunction("start");
    if (serverResult.success) {
      store.settings = deriveReadiness(
        {
          ...settings,
          ...serverResult.settings,
          stripeConnection: normalizeStripeConnection(serverResult.settings?.stripeConnection ?? settings.stripeConnection),
          disabledReason: serverResult.settings?.disabledReason,
          nextStep: serverResult.nextStep ?? "Finish Stripe Connect onboarding, then refresh the Stripe status."
        },
        store.receipts.length
      );
      await this.saveStore(store);
      return {
        success: true,
        settings: store.settings,
        reason: serverResult.reason ?? "Stripe Connect setup started.",
        nextStep: store.settings.nextStep,
        url: serverResult.url
      };
    }

    if (!allowLocalStripeConnectFallback()) {
      settings = deriveReadiness(
        {
          ...settings,
          stripeConnection: {
            ...settings.stripeConnection,
            status: "not_connected",
            disabledReason: serverResult.reason ?? "Stripe Connect backend is not configured."
          },
          disabledReason: serverResult.reason ?? STRIPE_CONNECT_REQUIRED_REASON,
          nextStep: serverResult.nextStep ?? "Deploy the Supabase stripe-connect Edge Function and configure Stripe Connect env vars."
        },
        store.receipts.length
      );
      store.settings = settings;
      await this.saveStore(store);
      return {
        success: false,
        settings,
        reason: settings.disabledReason ?? STRIPE_CONNECT_REQUIRED_REASON,
        nextStep: settings.nextStep
      };
    }

    store.settings = deriveReadiness(
      {
        ...settings,
        stripeConnection: {
          status: "connected",
          connectedAccountId: `acct_test_${randomUUID().replace(/-/gu, "").slice(0, 16)}`,
          accountEmail: settings.verifiedEmail ?? settings.accountEmail,
          chargesEnabled: true,
          payoutsEnabled: true,
          detailsSubmitted: true,
          connectedAt: Date.now(),
          lastCheckedAt: Date.now()
        },
        disabledReason: undefined,
        nextStep: "Development Stripe account connected. Every payment still requires approval."
      },
      store.receipts.length
    );
    await this.saveStore(store);
    return {
      success: true,
      settings: store.settings,
      reason: "Development Stripe account connected for this signed-in user.",
      nextStep: store.settings.nextStep
    };
  }

  async refreshStripeConnection(): Promise<MoneyMovementActionResult> {
    const store = await this.loadStore();
    const settings = await this.getSettings();
    const serverResult = await this.callStripeConnectFunction("status");
    if (serverResult.success || serverResult.settings?.stripeConnection) {
      store.settings = deriveReadiness(
        {
          ...settings,
          ...serverResult.settings,
          stripeConnection: normalizeStripeConnection(serverResult.settings?.stripeConnection ?? settings.stripeConnection),
          nextStep: serverResult.nextStep ?? settings.nextStep
        },
        store.receipts.length
      );
      await this.saveStore(store);
      return {
        success: serverResult.success !== false,
        settings: store.settings,
        reason: serverResult.reason ?? "Stripe connection refreshed.",
        nextStep: store.settings.nextStep
      };
    }
    return {
      success: false,
      settings,
      reason: serverResult.reason ?? "Stripe connection status could not be refreshed.",
      nextStep: serverResult.nextStep
    };
  }

  async disconnectStripeAccount(): Promise<MoneyMovementActionResult> {
    const store = await this.loadStore();
    const settings = await this.getSettings();
    const serverResult = await this.callStripeConnectFunction("disconnect");
    store.settings = deriveReadiness(
      {
        ...settings,
        ...serverResult.settings,
        stripeConnection: DEFAULT_STRIPE_CONNECTION,
        disabledReason: STRIPE_CONNECT_REQUIRED_REASON,
        nextStep: "Connect your own Stripe account before any payment execution."
      },
      store.receipts.length
    );
    await this.saveStore(store);
    return {
      success: serverResult.success !== false,
      settings: store.settings,
      reason: serverResult.reason ?? "Stripe account disconnected for Autopilot money movement.",
      nextStep: store.settings.nextStep
    };
  }

  async createProposal(input: PaymentProposalInput): Promise<{ success: true; proposal: PaymentProposal } | { success: false; reason: string; settings: MoneyMovementSettings }> {
    const store = await this.loadStore();
    const settings = await this.getSettings();
    const invoiceReport = store.invoiceVerifications.find((report) => report.id === input.invoiceVerificationId);
    if (!invoiceReport || invoiceReport.status !== "verified") {
      return {
        success: false,
        reason: invoiceReport
          ? `Invoice verification is ${invoiceReport.status}. Autopilot created a review item instead of a payment plan.`
          : "Verify the invoice before Autopilot can prepare a payment proposal.",
        settings
      };
    }
    const vendorReport = store.vendorVerifications.find((report) => report.id === input.vendorVerificationId);
    if (!vendorReport || vendorReport.status !== "verified") {
      return {
        success: false,
        reason: vendorReport
          ? `Vendor verification is ${vendorReport.status}. Review the vendor before preparing payment.`
          : "Verify the vendor and payment destination before Autopilot can prepare a payment proposal.",
        settings
      };
    }
    const providerKind = input.providerKind ?? vendorReport.providerKind;
    if (providerKind !== "stripe_hosted") {
      return {
        success: false,
        reason: `${formatProviderKind(providerKind)} is guided in setup but not live-ready yet. No money moved.`,
        settings
      };
    }
    const paymentMethodKind = normalizePaymentMethodKind(input.paymentMethodKind ?? input.destination?.paymentMethodKind);
    const amountCents = Math.max(0, Math.round(input.amountCents));
    const currency = normalizeCurrency(input.currency);
    const mode: PaymentMode = input.requestedMode === "live" ? "live" : "test";
    const feesCents = estimateStripeFeesCents(amountCents);
    const idempotencyKey = input.idempotencyKey?.trim() || `payment:${randomUUID()}`;
    const risk = evaluatePaymentRisk({ ...input, amountCents, currency, requestedMode: mode, idempotencyKey }, settings, store.receipts);
    const proposal: PaymentProposal = {
      id: `payment-proposal:${randomUUID()}`,
      mode,
      provider: paymentProviderForKind(providerKind),
      providerKind,
      paymentMethodKind,
      paymentMethodLabel: formatPaymentMethodLabel(paymentMethodKind),
      payeeName: input.payeeName.trim(),
      payeeEmail: input.payeeEmail?.trim() || undefined,
      amountCents,
      currency,
      feesCents,
      totalCents: amountCents + feesCents,
      fundingSource: "user_connected_stripe_account",
      connectedStripeAccountId: settings.stripeConnection.connectedAccountId,
      destination: input.destination ?? vendorReport.destination,
      invoiceVerificationId: invoiceReport.id,
      vendorVerificationId: vendorReport.id,
      reason: input.reason.trim(),
      sourceEvidence: input.sourceEvidence.trim(),
      sourceUrl: input.sourceUrl?.trim() || undefined,
      idempotencyKey,
      risk,
      approvalFingerprint: "",
      status: risk.blockedReasons.length > 0 ? "blocked" : "proposed",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    proposal.approvalFingerprint = createPaymentApprovalFingerprint(proposal);
    store.proposals = [proposal, ...store.proposals.filter((candidate) => candidate.id !== proposal.id)].slice(0, 100);
    await this.saveStore(store);
    return { success: true, proposal };
  }

  async createHostedApproval(proposalId: string): Promise<HostedApprovalResult> {
    const store = await this.loadStore();
    const settings = await this.getSettings();
    const proposal = store.proposals.find((candidate) => candidate.id === proposalId);
    if (!proposal) {
      return { success: false, reason: "Payment proposal was not found.", settings };
    }
    normalizeStoredProposalPaymentMethod(proposal);
    if (proposal.status !== "approved") {
      return {
        success: false,
        proposal,
        settings,
        reason: "Approve the exact payment proposal before opening hosted payment confirmation.",
        nextStep: "Review the invoice, vendor, amount, and destination, then approve the proposal."
      };
    }
    if (proposal.providerKind !== "stripe_hosted") {
      return {
        success: false,
        proposal,
        settings,
        reason: `${formatProviderKind(proposal.providerKind)} is not implemented for hosted approval yet.`,
        nextStep: "Use Stripe hosted approval first; PayPal and card checkout stay guided-disabled until certified."
      };
    }
    const endpoint = process.env.AUTOPILOT_PAYMENTS_HOSTED_APPROVAL_URL?.trim();
    if (!endpoint) {
      return {
        success: false,
        proposal,
        settings,
        reason: "Hosted payment approval endpoint is not configured. No money moved.",
        nextStep: "Deploy the hosted approval function and run a Stripe test-mode approval before enabling live payments."
      };
    }
    return {
      success: false,
      proposal,
      settings,
      reason: "Hosted approval endpoint is planned but not certified in this build. No money moved.",
      nextStep: "Run provider sandbox verification before this button becomes available."
    };
  }

  async getQuote(proposalId: string): Promise<PaymentQuoteResult> {
    const store = await this.loadStore();
    const proposal = store.proposals.find((candidate) => candidate.id === proposalId);
    if (!proposal) {
      return { success: false, reason: "Payment proposal was not found." };
    }
    normalizeStoredProposalPaymentMethod(proposal);
    return {
      success: true,
      proposal,
      feesCents: proposal.feesCents,
      totalCents: proposal.totalCents,
      mode: proposal.mode
    };
  }

  async approve(proposalId: string, stepUpConfirmed: boolean): Promise<{ success: true; approval: PaymentApproval; proposal: PaymentProposal } | { success: false; reason: string; proposal?: PaymentProposal; settings?: MoneyMovementSettings }> {
    const store = await this.loadStore();
    const settings = await this.getSettings();
    const proposal = store.proposals.find((candidate) => candidate.id === proposalId);
    if (!proposal) {
      return { success: false, reason: "Payment proposal was not found.", settings };
    }
    normalizeStoredProposalPaymentMethod(proposal);
    if (!settings.enabled || !settings.emailVerifiedForPayments) {
      return { success: false, reason: MONEY_MOVEMENT_DISABLED_REASON, proposal, settings };
    }
    if (!proposal.connectedStripeAccountId || proposal.connectedStripeAccountId !== settings.stripeConnection.connectedAccountId) {
      return {
        success: false,
        reason: "This payment proposal is not locked to the currently connected Stripe account. Create a fresh proposal after connecting Stripe.",
        proposal,
        settings
      };
    }
    if (!stepUpConfirmed) {
      return { success: false, reason: "Step-up confirmation is required before payment approval.", proposal, settings };
    }
    const risk = evaluatePaymentRisk(
      {
        payeeName: proposal.payeeName,
        payeeEmail: proposal.payeeEmail,
        amountCents: proposal.amountCents,
        currency: proposal.currency,
        reason: proposal.reason,
        sourceEvidence: proposal.sourceEvidence,
        sourceUrl: proposal.sourceUrl,
        requestedMode: proposal.mode,
        idempotencyKey: proposal.idempotencyKey,
        invoiceVerificationId: proposal.invoiceVerificationId,
        vendorVerificationId: proposal.vendorVerificationId
      },
      settings,
      store.receipts
    );
    if (risk.blockedReasons.length > 0) {
      proposal.risk = risk;
      proposal.status = "blocked";
      proposal.updatedAt = Date.now();
      await this.saveStore(store);
      return { success: false, reason: risk.blockedReasons[0], proposal, settings };
    }

    proposal.status = "approved";
    proposal.updatedAt = Date.now();
    proposal.risk = risk;
    const approval: PaymentApproval = {
      id: `payment-approval:${randomUUID()}`,
      proposalId,
      approved: true,
      approvedAt: Date.now(),
      approvedByEmail: settings.accountEmail,
      stepUpConfirmed: true,
      approvalFingerprint: proposal.approvalFingerprint
    };
    store.approvals = [approval, ...store.approvals.filter((candidate) => candidate.proposalId !== proposalId)].slice(0, 100);
    await this.saveStore(store);
    return { success: true, approval, proposal };
  }

  async execute(proposalId: string, approvalId: string, requestedMode?: PaymentMode): Promise<PaymentExecutionResult> {
    const store = await this.loadStore();
    const settings = await this.getSettings();
    const proposal = store.proposals.find((candidate) => candidate.id === proposalId);
    if (!proposal) {
      return { success: false, reason: "Payment proposal was not found.", settings };
    }
    normalizeStoredProposalPaymentMethod(proposal);
    const approval = store.approvals.find((candidate) => candidate.id === approvalId && candidate.proposalId === proposalId);
    if (!approval?.approved || !approval.stepUpConfirmed) {
      return { success: false, reason: "Payment execution requires a matching step-up approval.", settings };
    }
    const currentFingerprint = createPaymentApprovalFingerprint(proposal);
    if (approval.approvalFingerprint !== proposal.approvalFingerprint || approval.approvalFingerprint !== currentFingerprint) {
      return { success: false, reason: "Payee, amount, currency, or idempotency key changed after approval. Re-approve the payment.", settings };
    }

    const duplicate = store.receipts.find((receipt) => receipt.idempotencyKey === proposal.idempotencyKey);
    if (duplicate) {
      return { success: true, receipt: duplicate, duplicatePrevented: true };
    }

    const mode = requestedMode === "live" ? "live" : proposal.mode;
    const risk = evaluatePaymentRisk(
      {
        payeeName: proposal.payeeName,
        payeeEmail: proposal.payeeEmail,
        amountCents: proposal.amountCents,
        currency: proposal.currency,
        reason: proposal.reason,
        sourceEvidence: proposal.sourceEvidence,
        sourceUrl: proposal.sourceUrl,
        requestedMode: mode,
        idempotencyKey: proposal.idempotencyKey,
        invoiceVerificationId: proposal.invoiceVerificationId,
        vendorVerificationId: proposal.vendorVerificationId
      },
      settings,
      store.receipts
    );
    if (risk.blockedReasons.length > 0) {
      proposal.risk = risk;
      proposal.status = "blocked";
      proposal.updatedAt = Date.now();
      await this.saveStore(store);
      return { success: false, reason: risk.blockedReasons[0], risk, settings };
    }
    if (mode === "live" && process.env.AUTOPILOT_PAYMENTS_LIVE_ENABLED !== "1") {
      return {
        success: false,
        reason: "Live payments are blocked until AUTOPILOT_PAYMENTS_LIVE_ENABLED is enabled on the server.",
        risk,
        settings
      };
    }
    const connectedStripeAccountId = settings.stripeConnection.connectedAccountId;
    if (!connectedStripeAccountId) {
      return {
        success: false,
        reason: STRIPE_CONNECT_REQUIRED_REASON,
        risk,
        settings
      };
    }
    if (proposal.connectedStripeAccountId !== connectedStripeAccountId) {
      return {
        success: false,
        reason: "The connected Stripe account changed after this proposal was created. Create and approve a fresh proposal.",
        risk,
        settings
      };
    }
    if (proposal.paymentMethodKind !== "card") {
      return {
        success: false,
        reason: `${proposal.paymentMethodLabel} requires provider-hosted confirmation before Autopilot can create a receipt. No money moved.`,
        risk,
        settings
      };
    }

    const providerPaymentId = await this.executeStripePayment(proposal, mode);
    if (!providerPaymentId) {
      return {
        success: false,
        reason: "Stripe payment execution endpoint is not configured or did not confirm execution. No money moved.",
        risk,
        settings
      };
    }

    const receipt: PaymentReceipt = {
      id: `payment-receipt:${randomUUID()}`,
      proposalId: proposal.id,
      mode,
      provider: proposal.provider,
      providerKind: proposal.providerKind,
      paymentMethodKind: proposal.paymentMethodKind,
      paymentMethodLabel: proposal.paymentMethodLabel,
      payeeName: proposal.payeeName,
      payeeEmail: proposal.payeeEmail,
      amountCents: proposal.amountCents,
      currency: proposal.currency,
      feesCents: proposal.feesCents,
      totalCents: proposal.totalCents,
      fundingSource: proposal.fundingSource,
      connectedStripeAccountId,
      idempotencyKey: proposal.idempotencyKey,
      providerPaymentId,
      providerConfirmationId: providerPaymentId,
      hostedApprovalId: proposal.hostedApprovalId,
      hostedApprovalUrl: proposal.hostedApprovalUrl,
      createdAt: Date.now(),
      sourceEvidence: proposal.sourceEvidence
    };
    proposal.status = "executed";
    proposal.updatedAt = Date.now();
    store.receipts = [receipt, ...store.receipts].slice(0, 300);
    store.settings.receiptsCount = store.receipts.length;
    await this.saveStore(store);
    return { success: true, receipt };
  }

  private async executeStripePayment(proposal: PaymentProposal, mode: PaymentMode): Promise<string | null> {
    const status = await this.getAccountStatus();
    const token = await this.getSessionAccessToken();
    const endpoint =
      process.env.AUTOPILOT_PAYMENTS_EXECUTE_URL?.trim() ||
      (status.backend.supabaseUrl ? `${status.backend.supabaseUrl.replace(/\/+$/u, "")}/functions/v1/payments-execute` : "");
    if (!endpoint || !token) {
      return null;
    }
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          mode,
          proposal: {
            id: proposal.id,
            provider: proposal.provider,
            providerKind: proposal.providerKind,
            paymentMethodKind: proposal.paymentMethodKind,
            paymentMethodLabel: proposal.paymentMethodLabel,
            payeeName: proposal.payeeName,
            payeeEmail: proposal.payeeEmail,
            amountCents: proposal.amountCents,
            currency: proposal.currency,
            reason: proposal.reason,
            sourceEvidence: proposal.sourceEvidence,
            sourceUrl: proposal.sourceUrl,
            idempotencyKey: proposal.idempotencyKey,
            fundingSource: proposal.fundingSource,
            connectedStripeAccountId: proposal.connectedStripeAccountId,
            destination: proposal.destination,
            invoiceVerificationId: proposal.invoiceVerificationId,
            vendorVerificationId: proposal.vendorVerificationId
          }
        })
      });
      const body = (await response.json().catch(() => null)) as { success?: boolean; providerPaymentId?: string; reason?: string } | null;
      if (!response.ok || body?.success !== true || !body.providerPaymentId) {
        return null;
      }
      return body.providerPaymentId;
    } catch {
      return null;
    }
  }

  private async callVerificationFunction(action: "start" | "confirm", code?: string): Promise<ServerVerificationResponse> {
    const status = await this.getAccountStatus();
    const token = await this.getSessionAccessToken();
    const supabaseUrl = status.backend.supabaseUrl?.replace(/\/+$/u, "");
    if (!supabaseUrl || !token) {
      return { success: false, reason: "Supabase session is required for payment verification." };
    }
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/payments-verification`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ action, code })
      });
      const body = (await response.json().catch(() => null)) as ServerVerificationResponse | null;
      return body ?? { success: false, reason: `Payment verification returned HTTP ${response.status}.` };
    } catch (error) {
      return {
        success: false,
        reason: error instanceof Error ? error.message : "Payment verification backend could not be reached."
      };
    }
  }

  private async callStripeConnectFunction(action: "start" | "status" | "disconnect"): Promise<ServerStripeConnectResponse> {
    const status = await this.getAccountStatus();
    const token = await this.getSessionAccessToken();
    const supabaseUrl = status.backend.supabaseUrl?.replace(/\/+$/u, "");
    if (!supabaseUrl || !token) {
      return { success: false, reason: "Supabase session is required for Stripe Connect setup." };
    }
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-connect`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ action })
      });
      const body = (await response.json().catch(() => null)) as ServerStripeConnectResponse | null;
      return body ?? { success: false, reason: `Stripe Connect returned HTTP ${response.status}.` };
    } catch (error) {
      return {
        success: false,
        reason: error instanceof Error ? error.message : "Stripe Connect backend could not be reached."
      };
    }
  }

  private async loadStore(): Promise<MoneyMovementStore> {
    try {
      const raw = await fs.readFile(this.getStorePath(), "utf8");
      const parsed = JSON.parse(raw) as Partial<MoneyMovementStore>;
      return normalizeStore(parsed);
    } catch {
      return normalizeStore({});
    }
  }

  private async saveStore(store: MoneyMovementStore): Promise<void> {
    const filePath = this.getStorePath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(store, null, 2), "utf8");
  }

  private getStorePath(): string {
    const root = typeof this.dataRoot === "function" ? this.dataRoot() : this.dataRoot;
    return path.join(root, STORE_FILE);
  }
}

function normalizeStore(store: Partial<MoneyMovementStore>): MoneyMovementStore {
  return {
    version: 1,
    settings: normalizeSettings(store.settings, Array.isArray(store.receipts) ? store.receipts.length : 0),
    pendingVerification: store.pendingVerification,
    invoiceVerifications: Array.isArray(store.invoiceVerifications) ? store.invoiceVerifications : [],
    vendorVerifications: Array.isArray(store.vendorVerifications) ? store.vendorVerifications : [],
    proposals: Array.isArray(store.proposals) ? store.proposals : [],
    approvals: Array.isArray(store.approvals) ? store.approvals : [],
    receipts: Array.isArray(store.receipts) ? store.receipts : []
  };
}

function normalizeSettings(settings: Partial<MoneyMovementSettings> | undefined, receiptsCount: number): MoneyMovementSettings {
  return deriveReadiness({
    enabled: settings?.enabled === true,
    status: settings?.status ?? "disabled",
    provider: "stripe",
    accountEmail: settings?.accountEmail ?? null,
    verifiedEmail: settings?.verifiedEmail ?? null,
    moneyMovementEnabled: settings?.moneyMovementEnabled === true,
    emailVerifiedForPayments: settings?.emailVerifiedForPayments === true,
    enabledAt: settings?.enabledAt ?? null,
    disabledAt: settings?.disabledAt ?? null,
    lastVerificationAt: settings?.lastVerificationAt ?? null,
    verificationExpiresAt: settings?.verificationExpiresAt ?? null,
    verificationMethod: settings?.verificationMethod ?? null,
    verificationEmailTransport: settings?.verificationEmailTransport ?? null,
    verificationEmailReady: settings?.verificationEmailReady === true,
    verificationEmailLastSentAt: settings?.verificationEmailLastSentAt ?? null,
    testModeOnly: settings?.testModeOnly !== false,
    liveModeEnabled: settings?.liveModeEnabled === true,
    requiresConnectedStripeAccount: settings?.requiresConnectedStripeAccount !== false,
    fundingSource: "user_connected_stripe_account",
    stripeConnection: normalizeStripeConnection(settings?.stripeConnection),
    receiptsCount,
    providerReadiness: [],
    paymentMethodReadiness: [],
    disabledReason: settings?.disabledReason ?? MONEY_MOVEMENT_DISABLED_REASON,
    nextStep: settings?.nextStep
  }, receiptsCount);
}

function reconcileSettingsWithAccount(settings: MoneyMovementSettings, accountStatus: AccountStatus, receiptsCount: number): MoneyMovementSettings {
  const accountEmail = accountStatus.userEmail ?? null;
  const emailChanged = Boolean(settings.verifiedEmail && accountEmail && settings.verifiedEmail !== accountEmail);
  if (!accountStatus.signedIn || !accountEmail) {
    return {
      ...settings,
      accountEmail,
      enabled: false,
      moneyMovementEnabled: false,
      emailVerifiedForPayments: false,
      status: "disabled",
      receiptsCount,
      disabledReason: "Sign into Autopilot before enabling money movement.",
      nextStep: "Money movement requires a signed-in Supabase account."
    };
  }
  if (emailChanged) {
    return {
      ...settings,
      accountEmail,
      enabled: false,
      moneyMovementEnabled: false,
      emailVerifiedForPayments: false,
      status: "disabled",
      disabledAt: Date.now(),
      stripeConnection: DEFAULT_STRIPE_CONNECTION,
      receiptsCount,
      disabledReason: "Account email changed. Re-verify before enabling money movement.",
      nextStep: "Start payment verification again from Settings."
    };
  }
  return {
    ...settings,
    accountEmail,
    receiptsCount
  };
}

function allowLocalVerificationFallback(): boolean {
  return process.env.NODE_ENV === "test" || process.env.AUTOPILOT_LOCAL_PAYMENT_VERIFICATION === "1";
}

function allowLocalStripeConnectFallback(): boolean {
  return process.env.NODE_ENV === "test" || process.env.AUTOPILOT_LOCAL_STRIPE_CONNECT === "1";
}

function normalizeVerificationCode(code: string): string {
  return code.replace(/\D/gu, "").slice(0, 6);
}

function normalizeStripeConnection(connection: Partial<StripeAccountConnection> | undefined): StripeAccountConnection {
  const status = normalizeStripeConnectionStatus(connection?.status);
  const connectedAccountId = typeof connection?.connectedAccountId === "string" && connection.connectedAccountId.trim()
    ? connection.connectedAccountId.trim()
    : null;
  return {
    status: connectedAccountId && status === "not_connected" ? "connected" : status,
    connectedAccountId,
    accountEmail: typeof connection?.accountEmail === "string" && connection.accountEmail.trim() ? connection.accountEmail.trim() : null,
    chargesEnabled: connection?.chargesEnabled === true,
    payoutsEnabled: connection?.payoutsEnabled === true,
    detailsSubmitted: connection?.detailsSubmitted === true,
    connectedAt: typeof connection?.connectedAt === "number" ? connection.connectedAt : null,
    lastCheckedAt: typeof connection?.lastCheckedAt === "number" ? connection.lastCheckedAt : null,
    disabledReason: connection?.disabledReason
  };
}

function normalizeStripeConnectionStatus(status: unknown): StripeConnectionStatus {
  return status === "pending" || status === "connected" || status === "restricted" || status === "disabled" ? status : "not_connected";
}

function normalizeStoredProposalPaymentMethod(proposal: PaymentProposal): void {
  const paymentMethodKind = normalizePaymentMethodKind(proposal.paymentMethodKind);
  proposal.paymentMethodKind = paymentMethodKind;
  proposal.paymentMethodLabel = proposal.paymentMethodLabel || formatPaymentMethodLabel(paymentMethodKind);
}

function deriveReadiness(settings: MoneyMovementSettings, receiptsCount: number): MoneyMovementSettings {
  const stripeConnection = normalizeStripeConnection(settings.stripeConnection);
  const base: MoneyMovementSettings = {
    ...settings,
    provider: "stripe",
    requiresConnectedStripeAccount: true,
    fundingSource: "user_connected_stripe_account",
    stripeConnection,
    receiptsCount,
    providerReadiness: buildProviderReadiness({
      enabled: settings.enabled,
      emailVerifiedForPayments: settings.emailVerifiedForPayments,
      stripeConnection,
      liveModeEnabled: settings.liveModeEnabled
    }),
    paymentMethodReadiness: buildPaymentMethodReadiness({
      enabled: settings.enabled,
      emailVerifiedForPayments: settings.emailVerifiedForPayments,
      stripeConnection,
      liveModeEnabled: settings.liveModeEnabled
    })
  };

  if (!base.enabled || !base.moneyMovementEnabled) {
    if (base.enabled && !base.emailVerifiedForPayments) {
      return {
        ...base,
        status: "verification_pending",
        disabledReason: MONEY_MOVEMENT_DISABLED_REASON,
        nextStep: base.nextStep ?? "Check your email and enter the money movement verification code.",
        providerReadiness: buildProviderReadiness({
          enabled: true,
          emailVerifiedForPayments: false,
          stripeConnection,
          liveModeEnabled: base.liveModeEnabled
        }),
        paymentMethodReadiness: buildPaymentMethodReadiness({
          enabled: true,
          emailVerifiedForPayments: false,
          stripeConnection,
          liveModeEnabled: base.liveModeEnabled
        })
      };
    }
    return {
      ...base,
      status: "disabled",
      disabledReason: base.disabledReason ?? MONEY_MOVEMENT_DISABLED_REASON,
      providerReadiness: buildProviderReadiness({
        enabled: false,
        emailVerifiedForPayments: false,
        stripeConnection,
        liveModeEnabled: base.liveModeEnabled
      }),
      paymentMethodReadiness: buildPaymentMethodReadiness({
        enabled: false,
        emailVerifiedForPayments: false,
        stripeConnection,
        liveModeEnabled: base.liveModeEnabled
      })
    };
  }
  if (!base.emailVerifiedForPayments) {
    return {
      ...base,
      status: "verification_pending",
      disabledReason: MONEY_MOVEMENT_DISABLED_REASON,
      nextStep: base.nextStep ?? "Verify your account email before connecting Stripe.",
      providerReadiness: buildProviderReadiness({
        enabled: true,
        emailVerifiedForPayments: false,
        stripeConnection,
        liveModeEnabled: base.liveModeEnabled
      }),
      paymentMethodReadiness: buildPaymentMethodReadiness({
        enabled: true,
        emailVerifiedForPayments: false,
        stripeConnection,
        liveModeEnabled: base.liveModeEnabled
      })
    };
  }
  if (stripeConnection.status !== "connected" || !stripeConnection.connectedAccountId) {
    return {
      ...base,
      status: "provider_setup_required",
      disabledReason: stripeConnection.disabledReason ?? STRIPE_CONNECT_REQUIRED_REASON,
      nextStep: base.nextStep ?? "Connect your own Stripe account before any payment execution.",
      providerReadiness: buildProviderReadiness({
        enabled: true,
        emailVerifiedForPayments: true,
        stripeConnection,
        liveModeEnabled: base.liveModeEnabled
      }),
      paymentMethodReadiness: buildPaymentMethodReadiness({
        enabled: true,
        emailVerifiedForPayments: true,
        stripeConnection,
        liveModeEnabled: base.liveModeEnabled
      })
    };
  }
  return {
    ...base,
    status: "ready",
    disabledReason: undefined,
    providerReadiness: buildProviderReadiness({
      enabled: true,
      emailVerifiedForPayments: true,
      stripeConnection,
      liveModeEnabled: base.liveModeEnabled
    }),
    paymentMethodReadiness: buildPaymentMethodReadiness({
      enabled: true,
      emailVerifiedForPayments: true,
      stripeConnection,
      liveModeEnabled: base.liveModeEnabled
    }),
    nextStep: base.liveModeEnabled
      ? "Stripe is connected. Every live payment still requires per-payment approval."
      : "Stripe is connected for test mode. Live execution remains blocked until the server live flag is enabled."
  };
}

function paymentProviderForKind(providerKind: PaymentProviderKind): "stripe" | "paypal" | "card" {
  if (providerKind === "paypal_hosted") {
    return "paypal";
  }
  if (providerKind === "card_checkout") {
    return "card";
  }
  return "stripe";
}

function formatProviderKind(providerKind: PaymentProviderKind): string {
  if (providerKind === "paypal_hosted") {
    return "PayPal hosted approval";
  }
  if (providerKind === "card_checkout") {
    return "Card checkout";
  }
  return "Stripe hosted approval";
}

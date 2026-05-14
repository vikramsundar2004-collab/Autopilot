export type HighImpactActionKind =
  | "git_commit"
  | "git_push"
  | "git_commit_and_push"
  | "payment_proposal"
  | "payment_quote"
  | "payment_execute"
  | "payment_refund"
  | "payment_dispute"
  | "signature"
  | "production_deploy";

export type PaymentProvider = "stripe" | "paypal" | "card";

export type PaymentProviderKind = "stripe_hosted" | "paypal_hosted" | "card_checkout";

export type PaymentMethodKind = "card" | "bank_account" | "cash_app_pay" | "klarna" | "wallet";

export type PaymentProviderSafetyStatus = "not_implemented" | "test_only" | "qa_required" | "beta_ready" | "live_ready" | "disabled";

export type PaymentMode = "test" | "live";

export type PaymentFundingSource = "user_connected_stripe_account";

export type StripeConnectionStatus = "not_connected" | "pending" | "connected" | "restricted" | "disabled";

export type StripeAccountConnection = {
  status: StripeConnectionStatus;
  connectedAccountId: string | null;
  accountEmail: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  connectedAt: number | null;
  lastCheckedAt: number | null;
  disabledReason?: string;
};

export type MoneyMovementStatus =
  | "disabled"
  | "verification_pending"
  | "verified"
  | "provider_setup_required"
  | "ready"
  | "suspended";

export type MoneyMovementVerificationMethod = "code";

export type MoneyMovementVerificationTransport = "resend" | "development" | "not_configured";

export type MoneyMovementSettings = {
  enabled: boolean;
  status: MoneyMovementStatus;
  provider: PaymentProvider;
  accountEmail: string | null;
  verifiedEmail: string | null;
  moneyMovementEnabled: boolean;
  emailVerifiedForPayments: boolean;
  enabledAt: number | null;
  disabledAt: number | null;
  lastVerificationAt: number | null;
  verificationExpiresAt: number | null;
  verificationMethod: MoneyMovementVerificationMethod | null;
  verificationEmailTransport: MoneyMovementVerificationTransport | null;
  verificationEmailReady: boolean;
  verificationEmailLastSentAt: number | null;
  testModeOnly: boolean;
  liveModeEnabled: boolean;
  requiresConnectedStripeAccount: boolean;
  fundingSource: PaymentFundingSource;
  stripeConnection: StripeAccountConnection;
  receiptsCount: number;
  providerReadiness: ProviderReadinessChecklist[];
  paymentMethodReadiness: PaymentMethodReadiness[];
  disabledReason?: string;
  nextStep?: string;
};

export type MoneyMovementVerification = {
  success: boolean;
  status: MoneyMovementStatus;
  reason?: string;
  nextStep?: string;
  expiresAt?: number;
  debugVerificationCode?: string;
  settings: MoneyMovementSettings;
};

export type PaymentProposalInput = {
  providerKind?: PaymentProviderKind;
  paymentMethodKind?: PaymentMethodKind;
  payeeName: string;
  payeeEmail?: string;
  amountCents: number;
  currency: string;
  reason: string;
  sourceEvidence: string;
  sourceUrl?: string;
  destination?: PaymentDestination;
  invoiceVerificationId?: string;
  vendorVerificationId?: string;
  requestedMode?: PaymentMode;
  idempotencyKey?: string;
};

export type PaymentDestination = {
  providerKind: PaymentProviderKind;
  paymentMethodKind?: PaymentMethodKind;
  hostedUrl?: string;
  connectedAccountId?: string | null;
  paypalMerchantId?: string | null;
  cardProcessor?: "stripe" | "paypal" | "adyen" | "square" | "unknown";
  displayName?: string;
};

export type InvoiceVerificationStatus = "verified" | "needs_user_review" | "suspicious" | "blocked";

export type InvoiceVerificationCheck = {
  id: string;
  label: string;
  passed: boolean;
  severity: "info" | "warning" | "blocker";
  detail: string;
};

export type InvoiceCandidate = {
  payeeName: string;
  payeeEmail?: string;
  senderEmail?: string;
  amountCents: number;
  currency: string;
  invoiceNumber?: string;
  dueDate?: string;
  billingPeriod?: string;
  sourceEvidence: string;
  sourceUrl?: string;
  destination?: PaymentDestination;
  knownVendorDomains?: string[];
  idempotencyKey?: string;
};

export type InvoiceVerificationReport = {
  id: string;
  candidate: InvoiceCandidate;
  status: InvoiceVerificationStatus;
  confidence: number;
  checks: InvoiceVerificationCheck[];
  missingEvidence: string[];
  scamSignals: string[];
  createdAt: number;
};

export type VendorVerificationReport = {
  id: string;
  providerKind: PaymentProviderKind;
  payeeName: string;
  payeeEmail?: string;
  status: InvoiceVerificationStatus;
  confidence: number;
  destination?: PaymentDestination;
  trustedSignals: string[];
  blockers: string[];
  warnings: string[];
  createdAt: number;
};

export type ProviderReadinessStep = {
  id: string;
  label: string;
  complete: boolean;
  actionLabel?: string;
  detail?: string;
};

export type ProviderReadinessChecklist = {
  providerKind: PaymentProviderKind;
  label: string;
  safetyStatus: PaymentProviderSafetyStatus;
  readinessPercent: number;
  currentStep: string;
  nextAction: string;
  liveAvailable: boolean;
  lastSuccessfulTestAt: number | null;
  technicalDetails?: string;
  steps: ProviderReadinessStep[];
};

export type PaymentMethodReadiness = {
  kind: PaymentMethodKind;
  label: string;
  detail: string;
  providerKind: PaymentProviderKind;
  providerLabel: string;
  readinessPercent: number;
  safetyStatus: PaymentProviderSafetyStatus;
  currentStep: string;
  nextAction: string;
  providerHosted: boolean;
  receiptRequired: true;
  liveAvailable: boolean;
  technicalDetails?: string;
};

export type PaymentRiskLevel = "low" | "medium" | "high" | "blocked";

export type PaymentRiskReport = {
  level: PaymentRiskLevel;
  flags: string[];
  warnings: string[];
  blockedReasons: string[];
  invoiceVerificationStatus?: InvoiceVerificationStatus;
  missingInvoiceEvidence?: string[];
  scamSignals?: string[];
  duplicateReceiptId?: string;
  requiresStepUp: boolean;
};

export type PaymentProposal = {
  id: string;
  mode: PaymentMode;
  provider: PaymentProvider;
  providerKind: PaymentProviderKind;
  paymentMethodKind: PaymentMethodKind;
  paymentMethodLabel: string;
  payeeName: string;
  payeeEmail?: string;
  amountCents: number;
  currency: string;
  feesCents: number;
  totalCents: number;
  fundingSource: PaymentFundingSource;
  connectedStripeAccountId: string | null;
  destination?: PaymentDestination;
  invoiceVerificationId: string;
  vendorVerificationId: string;
  hostedApprovalId?: string;
  hostedApprovalUrl?: string;
  reason: string;
  sourceEvidence: string;
  sourceUrl?: string;
  idempotencyKey: string;
  risk: PaymentRiskReport;
  approvalFingerprint: string;
  status: "proposed" | "approved" | "executed" | "rejected" | "blocked";
  createdAt: number;
  updatedAt: number;
};

export type PaymentQuoteResult =
  | {
      success: true;
      proposal: PaymentProposal;
      feesCents: number;
      totalCents: number;
      mode: PaymentMode;
    }
  | {
      success: false;
      reason: string;
    };

export type PaymentApproval = {
  id: string;
  proposalId: string;
  approved: boolean;
  approvedAt: number;
  approvedByEmail: string | null;
  stepUpConfirmed: boolean;
  approvalFingerprint: string;
};

export type PaymentExecutionResult =
  | {
      success: true;
      receipt: PaymentReceipt;
      duplicatePrevented?: boolean;
    }
  | {
      success: false;
      reason: string;
      risk?: PaymentRiskReport;
      settings?: MoneyMovementSettings;
    };

export type HostedApprovalResult =
  | {
      success: true;
      proposal: PaymentProposal;
      providerKind: PaymentProviderKind;
      hostedApprovalId: string;
      hostedApprovalUrl: string;
      nextStep: string;
    }
  | {
      success: false;
      reason: string;
      proposal?: PaymentProposal;
      settings?: MoneyMovementSettings;
      nextStep?: string;
    };

export type PaymentReceipt = {
  id: string;
  proposalId: string;
  mode: PaymentMode;
  provider: PaymentProvider;
  providerKind: PaymentProviderKind;
  paymentMethodKind: PaymentMethodKind;
  paymentMethodLabel: string;
  payeeName: string;
  payeeEmail?: string;
  amountCents: number;
  currency: string;
  feesCents: number;
  totalCents: number;
  fundingSource: PaymentFundingSource;
  connectedStripeAccountId: string;
  idempotencyKey: string;
  providerPaymentId: string;
  providerConfirmationId?: string;
  hostedApprovalId?: string;
  hostedApprovalUrl?: string;
  createdAt: number;
  sourceEvidence: string;
};

export type PaymentReceiptVerificationResult =
  | {
      success: true;
      receipt: PaymentReceipt;
      verifiedAt: number;
      providerConfirmed: true;
      message: string;
    }
  | {
      success: false;
      receipt?: PaymentReceipt;
      verifiedAt: number;
      providerConfirmed: false;
      reason: string;
      nextStep: string;
    };

export type MoneyMovementActionResult =
  | {
      success: true;
      settings: MoneyMovementSettings;
      reason?: string;
      nextStep?: string;
      url?: string;
    }
  | {
      success: false;
      settings: MoneyMovementSettings;
      reason: string;
      nextStep?: string;
    };

export const MONEY_MOVEMENT_DISABLED_REASON = "Verify your email in Settings to enable money movement.";
export const STRIPE_CONNECT_REQUIRED_REASON =
  "Connect your own Stripe account in Settings before Autopilot can prepare or execute payments.";
export const DEFAULT_PAYMENT_AMOUNT_CAP_CENTS = 50_000;
export const DEFAULT_STRIPE_CONNECTION: StripeAccountConnection = {
  status: "not_connected",
  connectedAccountId: null,
  accountEmail: null,
  chargesEnabled: false,
  payoutsEnabled: false,
  detailsSubmitted: false,
  connectedAt: null,
  lastCheckedAt: null
};

export function buildProviderReadiness(settings: Pick<MoneyMovementSettings, "enabled" | "emailVerifiedForPayments" | "stripeConnection" | "liveModeEnabled">): ProviderReadinessChecklist[] {
  const stripeSteps: ProviderReadinessStep[] = [
    {
      id: "email_verified",
      label: "Verify account email",
      complete: settings.enabled && settings.emailVerifiedForPayments,
      actionLabel: "Verify email"
    },
    {
      id: "provider_connected",
      label: "Connect Stripe",
      complete: settings.stripeConnection.status === "connected" && Boolean(settings.stripeConnection.connectedAccountId),
      actionLabel: "Connect provider",
      detail: settings.stripeConnection.connectedAccountId ?? "No connected Stripe account"
    },
    {
      id: "test_payment_ready",
      label: "Ready for test payments",
      complete: settings.stripeConnection.status === "connected" && settings.emailVerifiedForPayments,
      actionLabel: "Run test payment"
    },
    {
      id: "live_mode_approved",
      label: "Ready for live payments",
      complete: settings.liveModeEnabled && settings.stripeConnection.chargesEnabled,
      actionLabel: "Review live setup"
    }
  ];
  return [
    makeReadiness("stripe_hosted", "Stripe hosted approval", "test_only", stripeSteps, settings.liveModeEnabled && settings.stripeConnection.chargesEnabled),
    makeReadiness(
      "paypal_hosted",
      "PayPal hosted approval",
      "not_implemented",
      [{ id: "provider_planned", label: "PayPal provider planned", complete: false, actionLabel: "Setup needed" }],
      false,
      "PayPal sandbox approval is planned but not wired yet."
    ),
    makeReadiness(
      "card_checkout",
      "Card checkout",
      "not_implemented",
      [{ id: "tokenized_card_required", label: "Tokenized/provider-hosted card entry required", complete: false, actionLabel: "Setup needed" }],
      false,
      "Card checkout is blocked until tokenized provider-hosted entry is implemented. Autopilot must never store raw card numbers."
    )
  ];
}

export function buildPaymentMethodReadiness(settings: Pick<MoneyMovementSettings, "enabled" | "emailVerifiedForPayments" | "stripeConnection" | "liveModeEnabled">): PaymentMethodReadiness[] {
  const emailReady = settings.enabled && settings.emailVerifiedForPayments;
  const stripeConnected = settings.stripeConnection.status === "connected" && Boolean(settings.stripeConnection.connectedAccountId);
  const testReady = emailReady && stripeConnected;
  const liveReady = testReady && settings.liveModeEnabled && settings.stripeConnection.chargesEnabled;
  const readinessPercent = Math.round(
    ((settings.enabled ? 1 : 0) + (settings.emailVerifiedForPayments ? 1 : 0) + (stripeConnected ? 1 : 0) + (liveReady ? 1 : 0)) * 25
  );
  const currentStep = !settings.enabled
    ? "Setup needed"
    : !settings.emailVerifiedForPayments
      ? "Verify email"
      : !stripeConnected
        ? "Connect provider"
        : liveReady
          ? "Ready for live confirmation"
          : "Ready for test confirmation";
  const nextAction = !settings.enabled
    ? "Enable money movement"
    : !settings.emailVerifiedForPayments
      ? "Verify email"
      : !stripeConnected
        ? "Connect Stripe"
        : liveReady
          ? "Review payment"
          : "Run test payment";
  const safetyStatus: PaymentProviderSafetyStatus = liveReady ? "live_ready" : testReady ? "test_only" : "disabled";
  const methodDetails: Array<Pick<PaymentMethodReadiness, "kind" | "label" | "detail" | "technicalDetails">> = [
    {
      kind: "card",
      label: "Card",
      detail: "Provider-hosted card confirmation. Autopilot never stores raw card numbers.",
      technicalDetails: "Direct test execution uses a Stripe test PaymentIntent; live card entry must remain provider-hosted."
    },
    {
      kind: "bank_account",
      label: "Bank",
      detail: "Stripe-hosted bank debit or instant bank payment, with account verification handled by the provider.",
      technicalDetails: "ACH and bank methods need provider/dashboard capability checks before live use."
    },
    {
      kind: "cash_app_pay",
      label: "Cash App Pay",
      detail: "Cash App Pay appears in the provider-hosted checkout when the connected account and buyer are eligible.",
      technicalDetails: "Cash App Pay execution must use hosted confirmation or provider-confirmed webhooks."
    },
    {
      kind: "klarna",
      label: "Klarna",
      detail: "Klarna is offered through eligible provider-hosted checkout flows; no pay-later decision is made by Autopilot.",
      technicalDetails: "Klarna availability depends on amount, currency, buyer location, and connected-account capability."
    },
    {
      kind: "wallet",
      label: "Wallet",
      detail: "Wallet checkout such as Apple Pay, Google Pay, or Link is provider-hosted and requires provider confirmation.",
      technicalDetails: "Wallet buttons are shown only by the hosted provider when the browser/device is eligible."
    }
  ];

  return methodDetails.map((method) => ({
    ...method,
    providerKind: "stripe_hosted",
    providerLabel: "Stripe hosted approval",
    readinessPercent,
    safetyStatus,
    currentStep,
    nextAction,
    providerHosted: true,
    receiptRequired: true,
    liveAvailable: liveReady
  }));
}

function makeReadiness(
  providerKind: PaymentProviderKind,
  label: string,
  safetyStatus: PaymentProviderSafetyStatus,
  steps: ProviderReadinessStep[],
  liveAvailable: boolean,
  technicalDetails?: string
): ProviderReadinessChecklist {
  const completeCount = steps.filter((step) => step.complete).length;
  const readinessPercent = steps.length === 0 ? 0 : Math.round((completeCount / steps.length) * 100);
  const nextIncomplete = steps.find((step) => !step.complete);
  return {
    providerKind,
    label,
    safetyStatus: readinessPercent === 100 && liveAvailable ? "live_ready" : safetyStatus,
    readinessPercent,
    currentStep: nextIncomplete?.label ?? (liveAvailable ? "Ready for live payments" : "Ready for test payments"),
    nextAction: nextIncomplete?.actionLabel ?? (liveAvailable ? "Review payment" : "Run test payment"),
    liveAvailable,
    lastSuccessfulTestAt: null,
    technicalDetails,
    steps
  };
}

export function createPaymentApprovalFingerprint(
  proposal: Pick<PaymentProposal, "payeeName" | "payeeEmail" | "amountCents" | "currency" | "mode" | "idempotencyKey" | "connectedStripeAccountId" | "invoiceVerificationId" | "vendorVerificationId"> & {
    paymentMethodKind?: PaymentMethodKind;
  }
): string {
  return [
    proposal.mode,
    proposal.paymentMethodKind ?? "card",
    proposal.connectedStripeAccountId ?? "no_connected_stripe_account",
    proposal.invoiceVerificationId,
    proposal.vendorVerificationId,
    proposal.payeeName.trim().toLowerCase(),
    (proposal.payeeEmail ?? "").trim().toLowerCase(),
    Math.round(proposal.amountCents),
    proposal.currency.trim().toUpperCase(),
    proposal.idempotencyKey.trim()
  ].join("|");
}

export function estimateStripeFeesCents(amountCents: number): number {
  const safeAmount = Math.max(0, Math.round(amountCents));
  return Math.ceil(safeAmount * 0.029) + 30;
}

export function normalizeCurrency(currency: string): string {
  const normalized = normalizeText(currency).toUpperCase();
  return /^[A-Z]{3}$/u.test(normalized) ? normalized : "USD";
}

export function normalizePaymentMethodKind(value: unknown): PaymentMethodKind {
  return value === "bank_account" || value === "cash_app_pay" || value === "klarna" || value === "wallet" ? value : "card";
}

export function formatPaymentMethodLabel(kind: PaymentMethodKind): string {
  switch (kind) {
    case "bank_account":
      return "Bank";
    case "cash_app_pay":
      return "Cash App Pay";
    case "klarna":
      return "Klarna";
    case "wallet":
      return "Wallet";
    case "card":
      return "Card";
  }
}

export function evaluatePaymentRisk(
  input: PaymentProposalInput,
  settings: MoneyMovementSettings,
  existingReceipts: PaymentReceipt[] = [],
  amountCapCents = DEFAULT_PAYMENT_AMOUNT_CAP_CENTS
): PaymentRiskReport {
  const flags: string[] = [];
  const warnings: string[] = [];
  const blockedReasons: string[] = [];
  const payee = normalizeText(input.payeeName);
  const amountCents = Math.round(input.amountCents);
  const currency = normalizeCurrency(input.currency);

  if (!settings.enabled || !settings.moneyMovementEnabled) {
    blockedReasons.push(MONEY_MOVEMENT_DISABLED_REASON);
  }
  if (!settings.emailVerifiedForPayments) {
    blockedReasons.push("Payment email verification is required before Autopilot can execute money movement.");
  }
  if (settings.requiresConnectedStripeAccount && settings.stripeConnection.status !== "connected") {
    blockedReasons.push(settings.stripeConnection.disabledReason ?? STRIPE_CONNECT_REQUIRED_REASON);
  }
  if (settings.requiresConnectedStripeAccount && !settings.stripeConnection.connectedAccountId) {
    blockedReasons.push("Autopilot could not find a connected Stripe account for this signed-in user.");
  }
  if ((input.requestedMode ?? "test") === "live" && !settings.stripeConnection.chargesEnabled) {
    blockedReasons.push("Live payments require a connected Stripe account with charges enabled.");
  }
  if (!payee) {
    blockedReasons.push("A payment proposal needs an exact payee.");
  }
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    blockedReasons.push("A payment proposal needs an exact positive amount.");
  }
  if (amountCents > amountCapCents) {
    blockedReasons.push(`Amount exceeds the configured cap of ${formatMoney(amountCapCents, currency)}.`);
  }
  if (!normalizeText(input.sourceEvidence)) {
    blockedReasons.push("Source evidence is required before payment execution.");
  }
  if (!input.invoiceVerificationId) {
    blockedReasons.push("Invoice verification is required before Autopilot can prepare a payment proposal.");
  }
  if (!input.vendorVerificationId) {
    blockedReasons.push("Vendor verification is required before Autopilot can prepare a payment proposal.");
  }
  if ((input.requestedMode ?? "test") === "live" && !settings.liveModeEnabled) {
    blockedReasons.push("Live payments are blocked until the server-side live-mode flag is enabled.");
  }

  const idempotencyKey = input.idempotencyKey?.trim();
  const duplicate = idempotencyKey ? existingReceipts.find((receipt) => receipt.idempotencyKey === idempotencyKey) : undefined;
  if (duplicate) {
    flags.push("duplicate_idempotency_key");
    warnings.push("A previous receipt already used this idempotency key. Execution will return the existing receipt instead of paying twice.");
  }

  if (amountCents > Math.round(amountCapCents * 0.5)) {
    flags.push("large_amount");
    warnings.push("The amount is high enough to require extra review.");
  }
  if (/(urgent|wire|gift card|crypto|bitcoin|zelle|venmo|cashapp|act now|overdue)/iu.test(`${input.reason} ${input.sourceEvidence}`)) {
    flags.push("suspicious_payment_language");
    warnings.push("The source contains payment-pressure language. Review the original source before approval.");
  }

  const level: PaymentRiskLevel = blockedReasons.length > 0 ? "blocked" : warnings.length > 1 ? "high" : warnings.length === 1 ? "medium" : "low";
  return {
    level,
    flags,
    warnings,
    blockedReasons,
    duplicateReceiptId: duplicate?.id,
    requiresStepUp: true
  };
}

export function verifyInvoiceCandidate(candidate: InvoiceCandidate, existingReceipts: PaymentReceipt[] = []): InvoiceVerificationReport {
  const payeeName = normalizeText(candidate.payeeName);
  const payeeEmail = normalizeText(candidate.payeeEmail) || undefined;
  const senderEmail = normalizeText(candidate.senderEmail) || undefined;
  const invoiceNumber = normalizeText(candidate.invoiceNumber);
  const dueDate = normalizeText(candidate.dueDate);
  const billingPeriod = normalizeText(candidate.billingPeriod);
  const sourceEvidence = normalizeText(candidate.sourceEvidence);
  const idempotencyKey = normalizeText(candidate.idempotencyKey);
  const currency = normalizeCurrency(candidate.currency);
  const missingEvidence: string[] = [];
  const scamSignals = detectPaymentScamSignals(`${sourceEvidence} ${candidate.sourceUrl ?? ""}`);
  const checks: InvoiceVerificationCheck[] = [];
  const addCheck = (id: string, label: string, passed: boolean, severity: InvoiceVerificationCheck["severity"], detail: string): void => {
    checks.push({ id, label, passed, severity, detail });
    if (!passed && severity === "blocker") {
      missingEvidence.push(label);
    }
  };

  addCheck("payee", "Exact payee", Boolean(payeeName), "blocker", payeeName || "Missing payee");
  addCheck("amount", "Exact positive amount", Number.isFinite(candidate.amountCents) && Math.round(candidate.amountCents) > 0, "blocker", formatMoney(candidate.amountCents, currency));
  addCheck("currency", "Three-letter currency", /^[A-Z]{3}$/u.test(currency), "blocker", currency);
  addCheck("invoice_reference", "Invoice number or unique reference", Boolean(invoiceNumber || idempotencyKey), "blocker", invoiceNumber || "Missing invoice reference");
  addCheck("due_or_period", "Due date or billing period", Boolean(dueDate || billingPeriod), "warning", dueDate || billingPeriod || "Missing due date/billing period");
  addCheck("source_evidence", "Source evidence", Boolean(sourceEvidence), "blocker", sourceEvidence ? "Present" : "Missing source evidence");
  addCheck("payment_destination", "Payment destination", Boolean(candidate.destination?.hostedUrl || candidate.destination?.connectedAccountId || candidate.destination?.paypalMerchantId), "blocker", candidate.destination?.hostedUrl ?? candidate.destination?.connectedAccountId ?? "Missing destination");

  const senderDomain = getEmailDomain(senderEmail);
  const payeeDomain = getEmailDomain(payeeEmail);
  const trustedDomains = new Set((candidate.knownVendorDomains ?? []).map((domain) => domain.toLowerCase()));
  const domainMatches = Boolean(senderDomain && (senderDomain === payeeDomain || trustedDomains.has(senderDomain)));
  addCheck("sender_domain", "Sender matches vendor domain", domainMatches, "warning", senderDomain ? `Sender domain: ${senderDomain}` : "Missing sender email");

  const duplicate = existingReceipts.find((receipt) =>
    (idempotencyKey && receipt.idempotencyKey === idempotencyKey) ||
    (invoiceNumber && receipt.sourceEvidence.toLowerCase().includes(invoiceNumber.toLowerCase())) ||
    (receipt.payeeName.toLowerCase() === payeeName.toLowerCase() && receipt.amountCents === Math.round(candidate.amountCents))
  );
  addCheck("duplicate", "No duplicate payment found", !duplicate, "blocker", duplicate ? `Duplicate receipt ${duplicate.id}` : "No duplicate receipt");
  addCheck("scam_signals", "No scam pressure signals", scamSignals.length === 0, scamSignals.length > 0 ? "blocker" : "info", scamSignals.join(", ") || "No scam signals");

  const blockers = checks.filter((check) => !check.passed && check.severity === "blocker").length;
  const warnings = checks.filter((check) => !check.passed && check.severity === "warning").length;
  const status: InvoiceVerificationStatus = blockers > 0 ? (scamSignals.length > 0 ? "suspicious" : "blocked") : warnings > 0 ? "needs_user_review" : "verified";
  const confidence = Math.max(0, Math.min(100, 100 - blockers * 30 - warnings * 15 - scamSignals.length * 20));
  return {
    id: `invoice-verification:${stableVerificationSeed(candidate)}`,
    candidate,
    status,
    confidence,
    checks,
    missingEvidence,
    scamSignals,
    createdAt: Date.now()
  };
}

export function verifyVendorDestination(input: {
  providerKind: PaymentProviderKind;
  payeeName: string;
  payeeEmail?: string;
  destination?: PaymentDestination;
  trustedDomains?: string[];
  userApprovedVendorRecord?: boolean;
}): VendorVerificationReport {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const trustedSignals: string[] = [];
  const destination = input.destination;
  const payeeName = normalizeText(input.payeeName);
  const payeeDomain = getEmailDomain(input.payeeEmail);
  const destinationDomain = destination?.hostedUrl ? getUrlDomain(destination.hostedUrl) : null;
  const trustedDomains = new Set((input.trustedDomains ?? []).map((domain) => domain.toLowerCase()));

  if (!payeeName) {
    blockers.push("Vendor needs an exact payee name.");
  }
  if (!destination) {
    blockers.push("Vendor needs a payment destination.");
  }
  if (input.providerKind === "stripe_hosted") {
    if (destination?.connectedAccountId?.startsWith("acct_")) {
      trustedSignals.push("Stripe connected account id present.");
    }
    if (destinationDomain?.endsWith("stripe.com")) {
      trustedSignals.push("Stripe-hosted payment destination.");
    }
  } else if (input.providerKind === "paypal_hosted") {
    if (destination?.paypalMerchantId) {
      trustedSignals.push("PayPal merchant id present.");
    } else {
      warnings.push("PayPal hosted approval is planned but not live-ready yet.");
    }
  } else {
    blockers.push("Card checkout requires tokenized/provider-hosted entry before vendor approval.");
  }
  if (input.userApprovedVendorRecord) {
    trustedSignals.push("User-approved vendor record.");
  }
  if (payeeDomain && trustedDomains.has(payeeDomain)) {
    trustedSignals.push(`Trusted vendor domain: ${payeeDomain}`);
  }
  if (destinationDomain && payeeDomain && !destinationDomain.endsWith(payeeDomain) && !destinationDomain.endsWith("stripe.com") && !destinationDomain.endsWith("paypal.com")) {
    warnings.push(`Payment destination domain ${destinationDomain} does not match vendor domain ${payeeDomain}.`);
  }
  if (trustedSignals.length === 0 && blockers.length === 0) {
    warnings.push("No strong vendor trust signal found.");
  }

  const status: InvoiceVerificationStatus = blockers.length > 0 ? "blocked" : warnings.length > 0 ? "needs_user_review" : "verified";
  return {
    id: `vendor-verification:${stableVerificationSeed({
      payeeName: input.payeeName,
      payeeEmail: input.payeeEmail,
      destination: input.destination,
      providerKind: input.providerKind
    })}`,
    providerKind: input.providerKind,
    payeeName: input.payeeName,
    payeeEmail: input.payeeEmail,
    status,
    confidence: Math.max(0, Math.min(100, 100 - blockers.length * 35 - warnings.length * 20)),
    destination,
    trustedSignals,
    blockers,
    warnings,
    createdAt: Date.now()
  };
}

export function detectPaymentScamSignals(text: string): string[] {
  const signals: Array<[RegExp, string]> = [
    [/\b(urgent|act now|immediately|today only|final notice)\b/iu, "pressure_language"],
    [/\b(gift card|crypto|bitcoin|wire|zelle|venmo|cashapp)\b/iu, "unsafe_payment_rail"],
    [/\b(new bank|updated payment instructions|changed payment instructions|different account)\b/iu, "changed_payment_instructions"],
    [/\b(shorturl|bit\.ly|tinyurl|t\.co)\b/iu, "shortened_or_redirect_link"]
  ];
  return signals.filter(([pattern]) => pattern.test(text)).map(([, signal]) => signal);
}

function stableVerificationSeed(value: unknown): string {
  let hash = 0;
  const text = JSON.stringify(value) ?? normalizeText(value);
  for (let index = 0; index < text.length; index += 1) {
    hash = (Math.imul(31, hash) + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function getEmailDomain(email: string | undefined): string | null {
  const match = normalizeText(email).toLowerCase().match(/@([^>\s]+)$/u);
  return match?.[1] ?? null;
}

function getUrlDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./u, "").toLowerCase();
  } catch {
    return null;
  }
}

export function formatMoney(amountCents: number, currency: string): string {
  return `${normalizeCurrency(currency)} ${(Math.max(0, Math.round(amountCents)) / 100).toFixed(2)}`;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

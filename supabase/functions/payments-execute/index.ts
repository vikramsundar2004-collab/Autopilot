type SupabaseUser = {
  id?: string;
  email?: string;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
};

type MoneyMovementRow = {
  money_movement_enabled?: boolean;
  email_verified_for_payments?: boolean;
  verified_email?: string | null;
  disabled_at?: string | null;
  stripe_connected_account_id?: string | null;
  stripe_connection_status?: string | null;
  stripe_charges_enabled?: boolean | null;
};

type PaymentExecuteRequest = {
  mode?: "test" | "live";
  proposal?: {
    id?: string;
    providerKind?: "stripe_hosted" | "paypal_hosted" | "card_checkout";
    paymentMethodKind?: "card" | "bank_account" | "cash_app_pay" | "klarna" | "wallet";
    paymentMethodLabel?: string;
    payeeName?: string;
    payeeEmail?: string;
    amountCents?: number;
    currency?: string;
    reason?: string;
    sourceEvidence?: string;
    sourceUrl?: string;
    idempotencyKey?: string;
    fundingSource?: string;
    connectedStripeAccountId?: string | null;
    invoiceVerificationId?: string;
    vendorVerificationId?: string;
  };
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const PAYMENTS_LIVE_ENABLED = Deno.env.get("PAYMENTS_LIVE_ENABLED") === "1";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return json({ success: true });
  }
  if (request.method !== "POST") {
    return json({ success: false, reason: "Use POST for payment execution." }, 405);
  }

  const auth = await requireSupabaseUser(request);
  if (!auth.success) {
    return auth.response;
  }

  const user = auth.user;
  const sessionToken = auth.token;
  if (!user.id || !user.email) {
    return json({ success: false, reason: "Supabase account is missing an email address." }, 400);
  }
  if (!user.email_confirmed_at && !user.confirmed_at) {
    return json({ success: false, reason: "Confirm your account email before payment execution." }, 403);
  }

  const body = (await request.json().catch(() => null)) as PaymentExecuteRequest | null;
  const mode = body?.mode === "live" ? "live" : "test";
  const proposal = body?.proposal;
  const validationError = validateProposal(proposal);
  if (validationError) {
    return json({ success: false, reason: validationError }, 400);
  }

  if (!STRIPE_SECRET_KEY) {
    return json({ success: false, reason: "STRIPE_SECRET_KEY is not configured. No money moved." }, 503);
  }

  if (proposal!.providerKind && proposal!.providerKind !== "stripe_hosted") {
    return json({ success: false, reason: "This payment provider is not certified for execution yet. No money moved." }, 403);
  }
  if (proposal!.paymentMethodKind && proposal!.paymentMethodKind !== "card") {
    return json(
      {
        success: false,
        reason: `${formatPaymentMethodLabel(proposal!.paymentMethodKind)} requires provider-hosted confirmation before Autopilot can create a receipt. No money moved.`
      },
      501
    );
  }

  const settings = await getMoneyMovementSettings(user.id, sessionToken);
  const settingsError = validateServerMoneySettings(settings, user, proposal!, mode);
  if (settingsError) {
    return json({ success: false, reason: `${settingsError} No money moved.` }, 403);
  }

  if (mode === "live") {
    if (!PAYMENTS_LIVE_ENABLED) {
      return json({ success: false, reason: "Live payments are disabled by server policy. No money moved." }, 403);
    }
    return json(
      {
        success: false,
        reason:
          "Live Stripe execution requires a live payment method/payee flow before Autopilot can move real money. No money moved."
      },
      501
    );
  }

  if (!STRIPE_SECRET_KEY.includes("_test_")) {
    return json({ success: false, reason: "Test payment execution requires a Stripe test secret key. No money moved." }, 403);
  }

  const execution = await createTestPaymentIntent(user, proposal!);
  if (!execution.success) {
    return json(execution, 502);
  }

  return json({
    success: true,
    mode,
    provider: "stripe",
    providerPaymentId: execution.providerPaymentId,
    connectedStripeAccountId: proposal!.connectedStripeAccountId,
    reason: "Stripe test PaymentIntent confirmed on the connected account."
  });
});

async function createTestPaymentIntent(
  user: SupabaseUser,
  proposal: NonNullable<PaymentExecuteRequest["proposal"]>
): Promise<{ success: true; providerPaymentId: string } | { success: false; reason: string }> {
  const params = new URLSearchParams();
  params.set("amount", String(proposal.amountCents));
  params.set("currency", String(proposal.currency).toLowerCase());
  params.set("confirm", "true");
  params.set("payment_method", "pm_card_visa");
  params.set("description", truncate(`${proposal.reason ?? "Autopilot approved payment"} - ${proposal.payeeName}`, 400));
  params.set("metadata[autopilot_user_id]", user.id ?? "unknown");
  params.set("metadata[autopilot_proposal_id]", proposal.id ?? "unknown");
  params.set("metadata[autopilot_payee_email]", proposal.payeeEmail ?? "");
  params.set("metadata[autopilot_source_url]", proposal.sourceUrl ?? "");
  params.set("metadata[autopilot_payment_method_kind]", proposal.paymentMethodKind ?? "card");

  const response = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
      "idempotency-key": proposal.idempotencyKey || proposal.id || crypto.randomUUID(),
      "stripe-account": proposal.connectedStripeAccountId!
    },
    body: params
  });
  const body = (await response.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
  if (!response.ok || !body.id) {
    return { success: false, reason: body.error?.message ?? `Stripe returned HTTP ${response.status}. No money moved.` };
  }
  return { success: true, providerPaymentId: body.id };
}

async function getMoneyMovementSettings(userId: string, sessionToken: string): Promise<MoneyMovementRow | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !sessionToken) {
    return null;
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/money_movement_settings?user_id=eq.${encodeURIComponent(
      userId
    )}&select=money_movement_enabled,email_verified_for_payments,verified_email,disabled_at,stripe_connected_account_id,stripe_connection_status,stripe_charges_enabled&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${sessionToken}`,
        accept: "application/json"
      }
    }
  );
  if (!response.ok) {
    return null;
  }

  const rows = (await response.json().catch(() => [])) as MoneyMovementRow[];
  return rows[0] ?? null;
}

function validateServerMoneySettings(
  settings: MoneyMovementRow | null,
  user: SupabaseUser,
  proposal: NonNullable<PaymentExecuteRequest["proposal"]>,
  mode: "test" | "live"
): string | null {
  if (!settings) {
    return "Enable money movement and verify payments in Settings before execution.";
  }
  if (settings.disabled_at) {
    return "Money movement is disabled for this account.";
  }
  if (settings.money_movement_enabled !== true || settings.email_verified_for_payments !== true) {
    return "Payment-specific email verification is required before execution.";
  }
  if (!settings.verified_email || !user.email) {
    return "Payment verification must be tied to the signed-in account email.";
  }
  if (settings.verified_email.toLowerCase() !== user.email.toLowerCase()) {
    return "Payment verification email does not match the signed-in account.";
  }
  if (!settings.stripe_connected_account_id || settings.stripe_connected_account_id !== proposal.connectedStripeAccountId) {
    return "The proposal must use the user's verified connected Stripe account.";
  }
  if (settings.stripe_connection_status !== "connected") {
    return "Reconnect Stripe before payment execution.";
  }
  if (mode === "live" && settings.stripe_charges_enabled !== true) {
    return "Stripe live charges are not enabled for this connected account.";
  }
  return null;
}

function validateProposal(proposal: PaymentExecuteRequest["proposal"]): string | null {
  if (!proposal) {
    return "Payment proposal is required.";
  }
  if (proposal.fundingSource !== "user_connected_stripe_account") {
    return "Payment proposal must use the user's connected Stripe account as the funding source.";
  }
  if (!proposal.invoiceVerificationId || !proposal.vendorVerificationId) {
    return "Invoice and vendor verification are required before payment execution.";
  }
  if (!proposal.connectedStripeAccountId || !/^acct_[A-Za-z0-9_]+$/u.test(proposal.connectedStripeAccountId)) {
    return "A connected Stripe account id is required.";
  }
  if (!Number.isInteger(proposal.amountCents) || proposal.amountCents <= 0) {
    return "Payment amount must be a positive integer number of cents.";
  }
  if (!proposal.currency || !/^[A-Za-z]{3}$/u.test(proposal.currency)) {
    return "Payment currency must be a three-letter ISO currency code.";
  }
  if (!proposal.payeeName || !proposal.payeeEmail) {
    return "Payment proposal must include payee name and email.";
  }
  if (!proposal.sourceEvidence) {
    return "Payment execution requires source evidence.";
  }
  if (
    proposal.paymentMethodKind &&
    !["card", "bank_account", "cash_app_pay", "klarna", "wallet"].includes(proposal.paymentMethodKind)
  ) {
    return "Payment method is not supported by this payment safety gate.";
  }
  return null;
}

function formatPaymentMethodLabel(kind: NonNullable<PaymentExecuteRequest["proposal"]>["paymentMethodKind"]): string {
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
    default:
      return "Card";
  }
}

async function requireSupabaseUser(
  request: Request
): Promise<{ success: true; user: SupabaseUser; token: string } | { success: false; response: Response }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { success: false, response: json({ success: false, reason: "Supabase runtime env is not available." }, 503) };
  }

  const token = getBearerToken(request);
  if (!token) {
    return { success: false, response: json({ success: false, reason: "Missing Supabase session token." }, 401) };
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) {
    return { success: false, response: json({ success: false, reason: "Supabase session is invalid or expired." }, 401) };
  }

  return { success: true, user: (await response.json()) as SupabaseUser, token };
}

function getBearerToken(request: Request): string {
  return (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/iu, "").trim();
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "access-control-allow-headers": "authorization,content-type",
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8"
    }
  });
}

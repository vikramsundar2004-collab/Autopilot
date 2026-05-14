type SupabaseUser = {
  id?: string;
  email?: string;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  last_sign_in_at?: string | null;
};

type MoneyMovementRow = {
  user_id: string;
  verified_email?: string | null;
  money_movement_enabled?: boolean;
  email_verified_for_payments?: boolean;
  test_mode_only?: boolean;
  live_mode_enabled?: boolean;
  stripe_connected_account_id?: string | null;
  stripe_connection_status?: "not_connected" | "pending" | "connected" | "restricted" | "disabled";
  stripe_account_email?: string | null;
  stripe_charges_enabled?: boolean;
  stripe_payouts_enabled?: boolean;
  stripe_details_submitted?: boolean;
  metadata?: Record<string, unknown>;
};

type PaymentVerificationState = {
  codeHash?: string;
  expiresAt?: string;
  requestedAt?: string;
  attempts?: number;
  method?: "code";
  emailTransport?: "resend" | "development" | "not_configured";
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const PAYMENTS_LIVE_ENABLED = Deno.env.get("PAYMENTS_LIVE_ENABLED") === "1";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const VERIFICATION_EMAIL_FROM = Deno.env.get("PAYMENTS_VERIFICATION_EMAIL_FROM") ?? "";
const VERIFICATION_DEBUG_CODES = Deno.env.get("PAYMENTS_VERIFICATION_DEBUG_CODES") === "1";
const VERIFICATION_TTL_MS = 15 * 60 * 1000;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return json({ success: true });
  }
  if (request.method !== "POST") {
    return json({ success: false, reason: "Use POST for payment verification." }, 405);
  }

  const auth = await requireSupabaseUser(request);
  if (!auth.success) {
    return auth.response;
  }

  const user = auth.user;
  if (!user.id || !user.email) {
    return json({ success: false, reason: "Supabase account is missing an email address." }, 400);
  }
  if (!user.email_confirmed_at && !user.confirmed_at) {
    return json(
      {
        success: false,
        status: "verification_pending",
        reason: "Confirm your Supabase account email before enabling money movement.",
        nextStep: "Open the Supabase confirmation email, then retry money movement verification."
      },
      403
    );
  }

  const body = (await request.json().catch(() => ({}))) as { action?: string; code?: string };
  const action = body.action === "confirm" ? "confirm" : "start";
  const token = getBearerToken(request);

  if (action === "confirm") {
    return handleConfirmVerification(user, token, body.code ?? "");
  }

  return handleStartVerification(user, token);
});

async function handleStartVerification(user: SupabaseUser, token: string): Promise<Response> {
  const existing = await getMoneySettingsByUser(token, user.id!);
  const code = createVerificationCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS).toISOString();
  const sent = await sendVerificationEmail(user.email!, code);
  if (!sent.success && !VERIFICATION_DEBUG_CODES) {
    await clearPaymentVerification(token, existing);
    return json(
      {
        success: false,
        status: "verification_pending",
        reason: sent.reason,
        nextStep:
          "Configure RESEND_API_KEY and PAYMENTS_VERIFICATION_EMAIL_FROM so Autopilot can email the 6-digit payment verification key, then try again.",
        settings: {
          ...rowToSettings(existing),
          verificationMethod: null,
          verificationEmailTransport: "not_configured",
          verificationEmailReady: false
        }
      },
      503
    );
  }
  const emailTransport = sent.success ? sent.transport : "development";
  const metadata = {
    ...(existing?.metadata ?? {}),
    paymentVerification: {
      codeHash: await sha256(code),
      expiresAt,
      requestedAt: new Date().toISOString(),
      attempts: 0,
      method: "code",
      emailTransport
    } satisfies PaymentVerificationState
  };

  const row = await upsertMoneySettings(token, {
    user_id: user.id!,
    money_movement_enabled: false,
    email_verified_for_payments: false,
    verified_email: null,
    provider: "stripe",
    test_mode_only: true,
    live_mode_enabled: false,
    disabled_at: null,
    metadata,
    updated_at: new Date().toISOString()
  });
  if (!row) {
    return json(
      {
        success: false,
        status: "verification_pending",
        reason: "Autopilot could not save the payment verification challenge.",
        nextStep: "Check the money_movement_settings migration and RLS policy, then request a fresh verification email."
      },
      500
    );
  }

  return json({
    success: true,
    status: "verification_pending",
    reason:
      emailTransport === "resend"
        ? "Payment verification code sent to your email."
        : "Development payment verification code created.",
    nextStep: "Open your email, copy the 6-digit money movement code, and enter it in Settings.",
    expiresAt: Date.parse(expiresAt),
    debugVerificationCode: VERIFICATION_DEBUG_CODES ? code : undefined,
    settings: {
      ...rowToSettings(row),
      moneyMovementEnabled: false,
      emailVerifiedForPayments: false,
      verifiedEmail: null,
      verificationMethod: "code",
      verificationEmailTransport: emailTransport,
      verificationEmailReady: true,
      verificationEmailLastSentAt: Date.now()
    }
  });
}

async function handleConfirmVerification(user: SupabaseUser, token: string, rawCode: string): Promise<Response> {
  const code = rawCode.trim();
  const existing = await getMoneySettingsByUser(token, user.id!);
  const paymentVerification = readPaymentVerification(existing?.metadata);

  if (!/^\d{6}$/u.test(code)) {
    return json(
      {
        success: false,
        status: "verification_pending",
        reason: "Enter the 6-digit code from the payment verification email.",
        nextStep: "Check the latest Autopilot money movement email and try again."
      },
      400
    );
  }
  if (!paymentVerification?.codeHash || !paymentVerification.expiresAt) {
    return json(
      {
        success: false,
        status: "verification_pending",
        reason: "Start money movement verification before confirming a code.",
        nextStep: "Click Enable money movement to send a fresh verification email.",
        settings: rowToSettings(existing)
      },
      400
    );
  }
  if (Date.parse(paymentVerification.expiresAt) < Date.now()) {
    await clearPaymentVerification(token, existing);
    return json(
      {
        success: false,
        status: "verification_pending",
        reason: "Payment verification code expired.",
        nextStep: "Click Enable money movement to send a fresh verification email.",
        settings: rowToSettings(existing)
      },
      400
    );
  }
  if ((paymentVerification.attempts ?? 0) >= 5) {
    await clearPaymentVerification(token, existing);
    return json(
      {
        success: false,
        status: "verification_pending",
        reason: "Too many incorrect verification attempts.",
        nextStep: "Click Enable money movement to send a fresh verification email.",
        settings: rowToSettings(existing)
      },
      429
    );
  }
  if ((await sha256(code)) !== paymentVerification.codeHash) {
    await upsertMoneySettings(token, {
      user_id: user.id!,
      metadata: {
        ...(existing?.metadata ?? {}),
        paymentVerification: {
          ...paymentVerification,
          attempts: (paymentVerification.attempts ?? 0) + 1
        }
      },
      updated_at: new Date().toISOString()
    });
    return json(
      {
        success: false,
        status: "verification_pending",
        reason: "Verification code did not match.",
        nextStep: "Enter the latest 6-digit code from your email.",
        settings: rowToSettings(existing)
      },
      400
    );
  }

  return completeVerification(user, token, existing);
}

async function completeVerification(user: SupabaseUser, token: string, existing: MoneyMovementRow | null): Promise<Response> {
  const metadata = {
    ...(existing?.metadata ?? {}),
    paymentVerification: null,
    verifiedBy: "payments-verification-edge",
    liveModeServerFlag: PAYMENTS_LIVE_ENABLED
  };
  const row = await upsertMoneySettings(token, {
    user_id: user.id!,
    money_movement_enabled: true,
    email_verified_for_payments: true,
    verified_email: user.email,
    provider: "stripe",
    test_mode_only: true,
    live_mode_enabled: PAYMENTS_LIVE_ENABLED,
    enabled_at: new Date().toISOString(),
    disabled_at: null,
    last_verification_at: new Date().toISOString(),
    metadata,
    updated_at: new Date().toISOString()
  });

  return json({
    success: true,
    status: PAYMENTS_LIVE_ENABLED ? "ready" : "provider_setup_required",
    reason: "Money movement is verified and turned on for this account.",
    nextStep: PAYMENTS_LIVE_ENABLED
      ? "Connect your own provider. Every payment still requires a separate approval."
      : "Connect your own Stripe account. Live payments remain blocked by the server flag.",
    settings: rowToSettings(row)
  });
}

async function sendVerificationEmail(email: string, code: string): Promise<{ success: true; transport: "resend" } | { success: false; reason: string }> {
  if (!RESEND_API_KEY || !VERIFICATION_EMAIL_FROM) {
    return { success: false, reason: "Payment verification email sender is not configured." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: VERIFICATION_EMAIL_FROM,
      to: email,
      subject: "Verify Autopilot money movement",
      text: `Your Autopilot money movement verification code is ${code}. It expires in 15 minutes. If you did not request this, ignore this email.`,
      html: `<p>Your Autopilot money movement verification code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>This code expires in 15 minutes. If you did not request this, ignore this email.</p>`
    })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return { success: false, reason: detail || `Email provider returned HTTP ${response.status}.` };
  }
  return { success: true, transport: "resend" };
}

async function requireSupabaseUser(
  request: Request
): Promise<{ success: true; user: SupabaseUser } | { success: false; response: Response }> {
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

  return { success: true, user: (await response.json()) as SupabaseUser };
}

async function getMoneySettingsByUser(token: string, userId: string): Promise<MoneyMovementRow | null> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/money_movement_settings?user_id=eq.${encodeURIComponent(userId)}&select=*`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${token}`
    }
  });
  const rows = response.ok ? ((await response.json()) as MoneyMovementRow[]) : [];
  return rows[0] ?? null;
}

async function upsertMoneySettings(token: string, settings: Record<string, unknown>): Promise<MoneyMovementRow | null> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/money_movement_settings?on_conflict=user_id`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(settings)
  });
  const rows = response.ok ? ((await response.json()) as MoneyMovementRow[]) : [];
  return rows[0] ?? null;
}

async function clearPaymentVerification(token: string, row: MoneyMovementRow | null): Promise<void> {
  if (!row?.user_id) {
    return;
  }
  await upsertMoneySettings(token, {
    user_id: row.user_id,
    metadata: {
      ...(row.metadata ?? {}),
      paymentVerification: null
    },
    updated_at: new Date().toISOString()
  });
}

function rowToSettings(row: MoneyMovementRow | null | undefined): Record<string, unknown> {
  const paymentVerification = readPaymentVerification(row?.metadata);
  return {
    moneyMovementEnabled: row?.money_movement_enabled === true,
    emailVerifiedForPayments: row?.email_verified_for_payments === true,
    verifiedEmail: row?.verified_email ?? null,
    verificationMethod: paymentVerification?.method ?? null,
    verificationEmailTransport: paymentVerification?.emailTransport ?? null,
    verificationEmailReady: paymentVerification?.emailTransport === "resend",
    verificationEmailLastSentAt: paymentVerification?.requestedAt ? Date.parse(paymentVerification.requestedAt) : null,
    provider: "stripe",
    testModeOnly: row?.test_mode_only !== false,
    liveModeEnabled: row?.live_mode_enabled === true && PAYMENTS_LIVE_ENABLED,
    requiresConnectedStripeAccount: true,
    fundingSource: "user_connected_stripe_account",
    stripeConnection: {
      status: row?.stripe_connection_status ?? "not_connected",
      connectedAccountId: row?.stripe_connected_account_id ?? null,
      accountEmail: row?.stripe_account_email ?? null,
      chargesEnabled: row?.stripe_charges_enabled === true,
      payoutsEnabled: row?.stripe_payouts_enabled === true,
      detailsSubmitted: row?.stripe_details_submitted === true,
      connectedAt: null,
      lastCheckedAt: null,
      disabledReason: row?.stripe_connected_account_id ? undefined : "Connect your own Stripe account in Settings before Autopilot can prepare or execute payments."
    }
  };
}

function readPaymentVerification(metadata: Record<string, unknown> | undefined): PaymentVerificationState | null {
  const value = metadata?.paymentVerification;
  return value && typeof value === "object" ? (value as PaymentVerificationState) : null;
}

function createVerificationCode(): string {
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  return String(100000 + (bytes[0] % 900000));
}

async function sha256(value: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getBearerToken(request: Request): string {
  return (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/iu, "").trim();
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

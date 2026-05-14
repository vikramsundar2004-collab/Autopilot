type SupabaseUser = {
  id?: string;
  email?: string;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
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
  stripe_connected_at?: string | null;
  stripe_last_checked_at?: string | null;
  stripe_connect_state?: string | null;
  metadata?: Record<string, unknown>;
};

type StripeAccount = {
  id?: string;
  email?: string | null;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_CONNECT_CLIENT_ID = Deno.env.get("STRIPE_CONNECT_CLIENT_ID") ?? "";
const STRIPE_CONNECT_REDIRECT_URI = Deno.env.get("STRIPE_CONNECT_REDIRECT_URI") ?? `${SUPABASE_URL}/functions/v1/stripe-connect`;
const PAYMENTS_LIVE_ENABLED = Deno.env.get("PAYMENTS_LIVE_ENABLED") === "1";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return json({ success: true });
  }
  if (request.method === "GET") {
    return handleStripeOAuthCallback(request);
  }
  if (request.method !== "POST") {
    return json({ success: false, reason: "Use POST for Stripe Connect setup." }, 405);
  }

  const auth = await requireSupabaseUser(request);
  if (!auth.success) {
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const action = body.action === "start" || body.action === "disconnect" || body.action === "status" ? body.action : "status";
  const token = getBearerToken(request);

  if (action === "disconnect") {
    const row = await upsertMoneySettings(
      token,
      {
        user_id: auth.user.id!,
        stripe_connected_account_id: null,
        stripe_connection_status: "not_connected",
        stripe_account_email: null,
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
        stripe_details_submitted: false,
        stripe_connected_at: null,
        stripe_last_checked_at: new Date().toISOString(),
        stripe_connect_state: null,
        updated_at: new Date().toISOString()
      }
    );
    return json({
      success: true,
      reason: "Stripe account disconnected from Autopilot.",
      nextStep: "Connect your own Stripe account before payment execution.",
      settings: rowToSettings(row)
    });
  }

  const existing = await getMoneySettingsByUser(token, auth.user.id!);
  if (action === "status") {
    const refreshed = await refreshStripeAccountIfPossible(existing, token);
    return json({
      success: true,
      reason: "Stripe connection status refreshed.",
      nextStep: refreshed?.stripe_connected_account_id
        ? "Stripe is connected. Every payment still requires per-payment approval."
        : "Connect your own Stripe account before any payment execution.",
      settings: rowToSettings(refreshed)
    });
  }

  if (!existing?.money_movement_enabled || !existing?.email_verified_for_payments) {
    return json(
      {
        success: false,
        reason: "Authorize money movement and verify your email before connecting Stripe.",
        nextStep: "Finish the money movement verification step in Settings first.",
        settings: rowToSettings(existing)
      },
      403
    );
  }

  if (!STRIPE_CONNECT_CLIENT_ID || !STRIPE_CONNECT_REDIRECT_URI) {
    return json(
      {
        success: false,
        reason: "Stripe Connect is not configured on the server.",
        nextStep: "Set STRIPE_CONNECT_CLIENT_ID and STRIPE_CONNECT_REDIRECT_URI as Supabase Edge Function secrets.",
        settings: rowToSettings(existing)
      },
      503
    );
  }

  const state = crypto.randomUUID();
  const row = await upsertMoneySettings(token, {
    user_id: auth.user.id!,
    stripe_connection_status: "pending",
    stripe_connect_state: state,
    stripe_last_checked_at: new Date().toISOString(),
    metadata: {
      ...existing?.metadata,
      stripeConnectStartedAt: new Date().toISOString()
    },
    updated_at: new Date().toISOString()
  });
  const params = new URLSearchParams({
    response_type: "code",
    client_id: STRIPE_CONNECT_CLIENT_ID,
    scope: "read_write",
    state,
    redirect_uri: STRIPE_CONNECT_REDIRECT_URI
  });
  if (auth.user.email) {
    params.set("stripe_user[email]", auth.user.email);
  }
  return json({
    success: true,
    reason: "Stripe Connect authorization opened.",
    nextStep: "Finish Stripe authorization, then return to Autopilot and refresh Stripe status.",
    url: `https://connect.stripe.com/oauth/authorize?${params.toString()}`,
    settings: rowToSettings(row)
  });
});

async function handleStripeOAuthCallback(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (error) {
    return html(`Stripe authorization was cancelled: ${escapeHtml(error)}.`);
  }
  if (!code || !state) {
    return html("Stripe authorization callback was missing a code or state.", 400);
  }
  if (!SUPABASE_SERVICE_ROLE_KEY || !STRIPE_SECRET_KEY || !STRIPE_CONNECT_CLIENT_ID) {
    return html("Stripe Connect callback is not configured on the server.", 503);
  }

  const row = await getMoneySettingsByState(state);
  if (!row?.user_id) {
    return html("Stripe authorization state was not recognized. Start again from Autopilot Settings.", 403);
  }

  const tokenResponse = await fetch("https://connect.stripe.com/oauth/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${STRIPE_SECRET_KEY}:`)}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code
    })
  });
  const tokenBody = (await tokenResponse.json().catch(() => ({}))) as { stripe_user_id?: string; error_description?: string; error?: string };
  if (!tokenResponse.ok || !tokenBody.stripe_user_id) {
    return html(`Stripe authorization failed: ${escapeHtml(tokenBody.error_description ?? tokenBody.error ?? "unknown error")}`, 502);
  }

  const account = await retrieveStripeAccount(tokenBody.stripe_user_id);
  await upsertMoneySettingsWithServiceRole({
    user_id: row.user_id,
    stripe_connected_account_id: tokenBody.stripe_user_id,
    stripe_connection_status: "connected",
    stripe_account_email: account?.email ?? row.verified_email ?? null,
    stripe_charges_enabled: account?.charges_enabled === true,
    stripe_payouts_enabled: account?.payouts_enabled === true,
    stripe_details_submitted: account?.details_submitted === true,
    stripe_connected_at: new Date().toISOString(),
    stripe_last_checked_at: new Date().toISOString(),
    stripe_connect_state: null,
    updated_at: new Date().toISOString()
  });

  return html("Stripe is connected to Autopilot. You can return to the app and refresh Stripe status.");
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

  const user = (await response.json()) as SupabaseUser;
  if (!user.id || !user.email || !(user.email_confirmed_at || user.confirmed_at)) {
    return {
      success: false,
      response: json({ success: false, reason: "Confirm your Supabase account email before connecting Stripe." }, 403)
    };
  }
  return { success: true, user };
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

async function getMoneySettingsByState(state: string): Promise<MoneyMovementRow | null> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/money_movement_settings?stripe_connect_state=eq.${encodeURIComponent(state)}&select=*`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );
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

async function upsertMoneySettingsWithServiceRole(settings: Record<string, unknown>): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/money_movement_settings?on_conflict=user_id`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify(settings)
  });
}

async function refreshStripeAccountIfPossible(row: MoneyMovementRow | null, token: string): Promise<MoneyMovementRow | null> {
  if (!row?.stripe_connected_account_id || !STRIPE_SECRET_KEY) {
    return row;
  }
  const account = await retrieveStripeAccount(row.stripe_connected_account_id);
  if (!account?.id) {
    return row;
  }
  return upsertMoneySettings(token, {
    user_id: row.user_id,
    stripe_connected_account_id: account.id,
    stripe_connection_status: "connected",
    stripe_account_email: account.email ?? row.stripe_account_email ?? row.verified_email ?? null,
    stripe_charges_enabled: account.charges_enabled === true,
    stripe_payouts_enabled: account.payouts_enabled === true,
    stripe_details_submitted: account.details_submitted === true,
    stripe_last_checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

async function retrieveStripeAccount(accountId: string): Promise<StripeAccount | null> {
  if (!STRIPE_SECRET_KEY) {
    return null;
  }
  const response = await fetch(`https://api.stripe.com/v1/accounts/${encodeURIComponent(accountId)}`, {
    headers: {
      authorization: `Bearer ${STRIPE_SECRET_KEY}`
    }
  });
  return response.ok ? ((await response.json()) as StripeAccount) : null;
}

function rowToSettings(row: MoneyMovementRow | null | undefined): Record<string, unknown> {
  return {
    moneyMovementEnabled: row?.money_movement_enabled === true,
    emailVerifiedForPayments: row?.email_verified_for_payments === true,
    verifiedEmail: row?.verified_email ?? null,
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
      connectedAt: row?.stripe_connected_at ? Date.parse(row.stripe_connected_at) : null,
      lastCheckedAt: row?.stripe_last_checked_at ? Date.parse(row.stripe_last_checked_at) : null,
      disabledReason: row?.stripe_connected_account_id ? undefined : "Connect your own Stripe account in Settings before Autopilot can prepare or execute payments."
    }
  };
}

function getBearerToken(request: Request): string {
  return (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/iu, "").trim();
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "access-control-allow-headers": "authorization,content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8"
    }
  });
}

function html(message: string, status = 200): Response {
  return new Response(`<!doctype html><meta charset="utf-8"><title>Autopilot Stripe Connect</title><body style="font-family:Inter,system-ui,sans-serif;padding:40px;line-height:1.5"><h1>Autopilot Stripe Connect</h1><p>${message}</p></body>`, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8"
    }
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);
}

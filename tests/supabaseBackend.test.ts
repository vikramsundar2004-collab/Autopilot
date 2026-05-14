import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Supabase AI backend", () => {
  it("provides an AI Edge Function without trying to configure reserved Supabase secrets", () => {
    const source = readFileSync(path.join(process.cwd(), "supabase", "functions", "ai", "index.ts"), "utf8");
    const artifactSource = readFileSync(path.join(process.cwd(), "supabase", "functions", "ai-artifact", "index.ts"), "utf8");
    const emailActionsSource = readFileSync(path.join(process.cwd(), "supabase", "functions", "ai-email-actions", "index.ts"), "utf8");
    const stripeConnectSource = readFileSync(path.join(process.cwd(), "supabase", "functions", "stripe-connect", "index.ts"), "utf8");
    const paymentsVerificationSource = readFileSync(path.join(process.cwd(), "supabase", "functions", "payments-verification", "index.ts"), "utf8");
    const paymentsExecuteSource = readFileSync(path.join(process.cwd(), "supabase", "functions", "payments-execute", "index.ts"), "utf8");
    const moneyMigration = readFileSync(path.join(process.cwd(), "supabase", "migrations", "0002_money_movement.sql"), "utf8");
    const promptSource = readFileSync(path.join(process.cwd(), "supabase", "functions", "_shared", "artifactPrompts.ts"), "utf8");
    const modelRoutingSource = readFileSync(path.join(process.cwd(), "supabase", "functions", "_shared", "modelRouting.ts"), "utf8");
    const docs = readFileSync(path.join(process.cwd(), "docs", "AI_BACKEND.md"), "utf8");

    expect(source).toContain('Deno.env.get("SUPABASE_URL")');
    expect(source).toContain('Deno.env.get("SUPABASE_ANON_KEY")');
    expect(source).toContain('Deno.env.get("OPENAI_API_KEY")');
    expect(source).toContain("/auth/v1/user");
    expect(source).toContain("/responses");
    expect(artifactSource).toContain("buildPlanningPrompt");
    expect(artifactSource).toContain("buildDraftPrompt");
    expect(artifactSource).toContain("buildCritiquePrompt");
    expect(artifactSource).toContain("buildRevisionPrompt");
    expect(artifactSource).toContain("MAX_ATTEMPTS = 3");
    expect(artifactSource).toContain("qualityReport");
    expect(emailActionsSource).toContain("The Action Queue is not an inbox");
    expect(emailActionsSource).toContain('Default ordinary follow-ups to requestedOutput="reply"');
    expect(emailActionsSource).toContain("requires_send_confirmation");
    expect(stripeConnectSource).toContain("https://connect.stripe.com/oauth/authorize");
    expect(stripeConnectSource).toContain("stripe_connected_account_id");
    expect(stripeConnectSource).toContain("STRIPE_CONNECT_CLIENT_ID");
    expect(paymentsVerificationSource).toContain("https://api.resend.com/emails");
    expect(paymentsVerificationSource).toContain("createVerificationCode");
    expect(paymentsVerificationSource).toContain("6-digit money movement code");
    expect(paymentsVerificationSource).toContain("Payment verification email sender is not configured");
    expect(paymentsVerificationSource).not.toContain("/auth/v1/otp");
    expect(paymentsExecuteSource).toContain("https://api.stripe.com/v1/payment_intents");
    expect(paymentsExecuteSource).toContain("pm_card_visa");
    expect(paymentsExecuteSource).toContain("paymentMethodKind");
    expect(paymentsExecuteSource).toContain("requires provider-hosted confirmation");
    expect(paymentsExecuteSource).toContain("No money moved");
    expect(paymentsExecuteSource).toContain('"stripe-account"');
    expect(paymentsExecuteSource).toContain("getMoneyMovementSettings");
    expect(paymentsExecuteSource).toContain("The proposal must use the user's verified connected Stripe account");
    expect(paymentsExecuteSource).toContain("Payment-specific email verification is required before execution");
    expect(paymentsExecuteSource).toContain("Payment verification must be tied to the signed-in account email");
    expect(moneyMigration).toContain("stripe_connected_account_id");
    expect(moneyMigration).toContain("stripe_connection_status");
    expect(promptSource).toContain("SLIDE_DECK_SPEC_V1");
    expect(promptSource).toContain("DOCUMENT_SPEC_V1");
    expect(promptSource).toContain("WEBSITE_DESIGN_SPEC_V1");
    expect(promptSource).toContain("ACTION_LIST_SPEC_V1");
    expect(modelRoutingSource).toContain('coding_prompt_translate: "mini"');
    expect(docs).toContain("do not set them with `supabase secrets set`");
    expect(docs).toContain("npx supabase secrets set OPENAI_API_KEY");
    expect(docs).toContain("npx supabase functions deploy ai --no-verify-jwt");
    expect(docs).toContain("npx supabase functions deploy ai-artifact --no-verify-jwt");
    expect(docs).toContain("npx supabase functions deploy ai-email-actions --no-verify-jwt");
    expect(docs).toContain("npx supabase functions deploy payments-execute --no-verify-jwt");
    expect(docs).toContain("STRIPE_SECRET_KEY");
    const allowedSupabaseSecretsBlock =
      docs.match(/Only set OpenAI secrets:[\s\S]*?```powershell([\s\S]*?)```/)?.[1] ?? "";
    expect(allowedSupabaseSecretsBlock).not.toContain("SUPABASE_URL");
    expect(allowedSupabaseSecretsBlock).not.toContain("SUPABASE_ANON_KEY");
  });

  it("defines enterprise chat tables with membership-scoped RLS", () => {
    const migration = readFileSync(path.join(process.cwd(), "supabase", "migrations", "0001_autopilot_launch.sql"), "utf8");

    for (const table of [
      "organizations",
      "organization_members",
      "organization_invite_keys",
      "chat_channels",
      "chat_channel_members",
      "chat_messages",
      "chat_mentions",
      "chat_notifications",
      "chat_ai_notes",
      "chat_action_suggestions"
    ]) {
      expect(migration).toContain(`create table if not exists public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }

    expect(migration).toContain("create or replace function public.is_org_member");
    expect(migration).toContain("create or replace function public.is_org_admin");
    expect(migration).toContain("chat action suggestions are member scoped");
    expect(migration).toContain("organization_invite_keys");
    expect(migration).toContain("using (public.is_org_admin(organization_id))");
    expect(migration).toContain("status text not null default 'suggested'");
  });
});

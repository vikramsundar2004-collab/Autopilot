# Autopilot AI Backend

Autopilot uses a server-side AI proxy so downloaded desktop apps never contain the OpenAI key.

## Netlify Edge Functions

The desktop app calls one public URL:

```text
AUTOPILOT_AI_PROXY_URL=https://YOUR_SITE.netlify.app/api/ai
```

The Netlify backend exposes these endpoints:

- `GET /api/ai/health` checks Supabase/OpenAI backend readiness without exposing secrets.
- `POST /api/ai` is the generic assistant/artifact/email gateway used by the desktop app.
- `POST /api/ai/email-actions` is a specialized email-to-work classifier endpoint for future direct routing.
- `POST /api/ai/artifact` is a specialized artifact generation endpoint for documents, decks, designs, and action lists.

All POST endpoints require:

```http
Authorization: Bearer <Supabase access token>
```

## Required Netlify Environment Variables

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.5
OPENAI_MODEL_MINI=
OPENAI_MODEL_STANDARD=
OPENAI_MODEL_FRONTIER=
SUPABASE_URL=https://ctvxwmmclsfxortzmkeq.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

Only the Supabase URL, Supabase anon key, and AI proxy URL go into the packaged desktop app. The OpenAI key stays in Netlify.

Model routing is optional but recommended for cost control. If the tier-specific variables are blank, Autopilot safely falls back to `OPENAI_MODEL`. When they are set, high-volume tasks such as email triage, page summaries, prompt suggestions, and artifact critique use the mini tier; artifact drafting and automation planning use the standard tier; final artifact revision, design generation, and coding agent work use the frontier tier.

## Deploy

```powershell
cd C:\Users\vikra\Coding_projects\Autopilot
netlify env:set OPENAI_API_KEY "YOUR_OPENAI_KEY"
netlify env:set OPENAI_MODEL "gpt-5.5"
netlify env:set OPENAI_MODEL_MINI "YOUR_CHEAPER_MODEL"
netlify env:set OPENAI_MODEL_STANDARD "YOUR_STANDARD_MODEL"
netlify env:set OPENAI_MODEL_FRONTIER "gpt-5.5"
netlify env:set SUPABASE_URL "https://ctvxwmmclsfxortzmkeq.supabase.co"
netlify env:set SUPABASE_ANON_KEY "YOUR_SUPABASE_ANON_KEY"
netlify deploy --build --prod
```

Then set:

```env
AUTOPILOT_AI_PROXY_URL=https://YOUR_SITE.netlify.app/api/ai
```

## Preferred Supabase Edge Functions

Supabase reserves `SUPABASE_URL` and `SUPABASE_ANON_KEY`, so do not set them with `supabase secrets set`.
They are already available inside Supabase Edge Functions.

Only set OpenAI secrets:

```powershell
npx supabase secrets set OPENAI_API_KEY='YOUR_OPENAI_KEY'
npx supabase secrets set OPENAI_MODEL='gpt-5.5'
npx supabase secrets set OPENAI_MODEL_MINI='YOUR_CHEAPER_MODEL'
npx supabase secrets set OPENAI_MODEL_STANDARD='YOUR_STANDARD_MODEL'
npx supabase secrets set OPENAI_MODEL_FRONTIER='gpt-5.5'
npx supabase functions deploy ai --no-verify-jwt
npx supabase functions deploy ai-artifact --no-verify-jwt
npx supabase functions deploy ai-email-actions --no-verify-jwt
npx supabase functions deploy payments-verification --no-verify-jwt
npx supabase functions deploy stripe-connect --no-verify-jwt
npx supabase functions deploy payments-execute --no-verify-jwt
```

Do not run these commands:

```powershell
npx supabase secrets set SUPABASE_URL=...
npx supabase secrets set SUPABASE_ANON_KEY=...
```

Supabase rejects those names because `SUPABASE_URL` and `SUPABASE_ANON_KEY` are reserved runtime values.
The `ai` function reads them automatically and still validates the user's Supabase session before any OpenAI call.

The preferred production backend is Supabase:

- `GET/POST /functions/v1/ai` is the generic assistant gateway.
- `GET/POST /functions/v1/ai-artifact` runs the email-to-artifact plan/draft/critique/revise pipeline.
- `GET/POST /functions/v1/ai-email-actions` classifies email into real work without turning the Action Queue into a raw inbox.
- `POST /functions/v1/payments-verification` verifies the signed-in Supabase email before money movement can be enabled.
- `POST/GET /functions/v1/stripe-connect` connects and refreshes the signed-in user's own Stripe account.
- `POST /functions/v1/payments-execute` calls Stripe in test mode and refuses to create a receipt if Stripe does not confirm execution.

Payment execution needs additional server-side secrets. Keep these out of the desktop app:

```powershell
npx supabase secrets set STRIPE_SECRET_KEY='sk_test_...'
npx supabase secrets set STRIPE_CONNECT_CLIENT_ID='ca_...'
npx supabase secrets set STRIPE_CONNECT_REDIRECT_URI='https://ctvxwmmclsfxortzmkeq.supabase.co/functions/v1/stripe-connect'
npx supabase secrets set RESEND_API_KEY='re_...'
npx supabase secrets set PAYMENTS_VERIFICATION_EMAIL_FROM='Autopilot <payments@your-domain.com>'
```

Leave `PAYMENTS_LIVE_ENABLED` unset until the live payment method/payee flow has been reviewed. Test execution uses Stripe's test-mode `pm_card_visa` on the user's connected Stripe account; if the Stripe call fails, Autopilot must show "No money moved" and block the receipt.

Payment verification emails use Resend to send a 6-digit payment verification key. If `RESEND_API_KEY` or `PAYMENTS_VERIFICATION_EMAIL_FROM` is missing, `payments-verification` fails closed and the Settings UI keeps payment methods locked until the email sender is configured.

To get the Stripe values:

1. In Stripe Dashboard, use test mode first and open **Developers -> API keys**. Copy the test secret key that starts with `sk_test_` into `STRIPE_SECRET_KEY`.
2. Open **Settings -> Connect -> OAuth settings**. Copy the Connect client id that starts with `ca_` into `STRIPE_CONNECT_CLIENT_ID`.
3. Add this OAuth redirect URL in Stripe: `https://ctvxwmmclsfxortzmkeq.supabase.co/functions/v1/stripe-connect`.
4. Deploy `payments-verification`, `stripe-connect`, and `payments-execute`, then use Autopilot Settings to enable money movement, verify email, connect the user's own Stripe account, and run a test payment.

The app never pays from Autopilot's Stripe balance. Payment execution requires the signed-in user's server-side `money_movement_settings` row, payment-specific email verification, and a connected Stripe account id that matches the approved proposal.

Then package the desktop app with:

```env
AUTOPILOT_SUPABASE_URL=https://ctvxwmmclsfxortzmkeq.supabase.co
AUTOPILOT_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
AUTOPILOT_AI_PROXY_URL=https://ctvxwmmclsfxortzmkeq.supabase.co/functions/v1/ai
AUTOPILOT_AI_ARTIFACT_URL=https://ctvxwmmclsfxortzmkeq.supabase.co/functions/v1/ai-artifact
AUTOPILOT_AI_EMAIL_ACTIONS_URL=https://ctvxwmmclsfxortzmkeq.supabase.co/functions/v1/ai-email-actions
```

If `AUTOPILOT_AI_PROXY_URL` points at the Supabase `functions/v1/ai` endpoint, `npm run build` derives the sibling `ai-artifact` and `ai-email-actions` URLs automatically. Set the explicit artifact/email-action variables only when those endpoints live somewhere else.

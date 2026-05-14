# Privacy And Data Flow

Autopilot's trust posture is local-first. Connected services are used to read work signals and run AI, but raw personal data should not become cloud product state by default.

## What Stays Local

- Browser tabs, history, downloads, bookmarks, workspace layout, and theme settings.
- Cached Gmail summaries, snippets, detected action suggestions, generated drafts, and task state.
- Google Calendar event cache and derived prep tasks.
- Design artifacts, document drafts, slide drafts, website design drafts, and export files.
- Coding projects, file contents, terminal history, diffs, plugin install output, and `.env` files.
- Diagnostics and run logs unless the user explicitly exports them.

## What Goes To Supabase

- User identity and session state.
- Device metadata needed for account readiness.
- Sync metadata and entitlement/account settings.
- No raw email bodies, generated artifacts, passwords, browser history, or local files should be uploaded by default.

## What Goes To The AI Proxy

Only the minimum context needed for a user-visible AI task:

- Browser assistant: selected tab text or disclosed source summaries.
- Productivity routing: ranked email/calendar candidates, not the entire mailbox by default.
- Design generation: source prompt/email summary plus selected artifact context.
- Coding agent: selected project summary, user prompt, and explicitly inspected file snippets.
- Automation: recipe goal, disclosed source summaries, and run context.

The desktop app sends the user's Supabase access token to the proxy. The proxy validates the user before calling OpenAI with the server-side `OPENAI_API_KEY`.

## OAuth Scopes

Autopilot uses Google OAuth for Gmail and Calendar source sync:

- Gmail readonly scopes let Autopilot show inbox rows and generate local action suggestions/drafts.
- Calendar readonly scopes let Autopilot render meetings/classes/deadlines and create separate prep tasks.
- If Calendar scopes are missing, the UI must ask the user to reconnect Google instead of pretending Calendar is synced.

## Redaction Rules

Never write these values to renderer logs, diagnostics exports, source-controlled files, or packaged public config:

- OpenAI API keys
- Supabase service-role keys
- OAuth access or refresh tokens
- Passwords
- Raw private email bodies
- `.env` secret values

## Launch Checklist

- Confirm `public/autopilot-config.json` contains only public config.
- Confirm packaged apps ignore local OpenAI keys unless explicitly put into local development mode.
- Confirm AI calls go through `AiGateway`.
- Confirm diagnostics and failed sync messages show causes without exposing secrets.
- Confirm users can delete local data from Settings before broad launch.

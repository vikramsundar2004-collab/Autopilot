# Autopilot Browser

Autopilot Browser is an AI-powered Chromium desktop workspace built with Electron, Vite, React, and TypeScript.

## Getting Started

```bash
npm install
npm run dev
```

## Gmail And Google Calendar Setup

Create or edit `.env.local` in the project root. Autopilot also supports `env.local` if that is the file name you already use:

```bash
AUTOPILOT_GOOGLE_CLIENT_ID=your-client-id
AUTOPILOT_GOOGLE_CLIENT_SECRET=optional-local-development-secret
AUTOPILOT_GOOGLE_REDIRECT_PORT=53682
```

Restart Autopilot Browser after changing those values. `.env.local` and `env.local` are ignored by git, and `.env.example` shows the expected keys.

When you run `npm run build` or `npm run dev`, Autopilot Browser generates `public/autopilot-config.json` from the client ID. That generated file is copied into the built app, so people who receive that build can connect Gmail and Google Calendar without creating their own `.env.local`. The client secret is never written to the generated public config.

## Supabase Account Backend Setup

Autopilot Browser is wired for the Supabase project reference `ctvxwmmclsfxortzmkeq`. Add the public anon key to `.env.local` before building an installer:

```bash
AUTOPILOT_SUPABASE_PROJECT_REF=ctvxwmmclsfxortzmkeq
AUTOPILOT_SUPABASE_URL=https://ctvxwmmclsfxortzmkeq.supabase.co
AUTOPILOT_SUPABASE_ANON_KEY=your-public-anon-key
```

`npm run configure:gmail` and the build scripts copy only public Google/Supabase client configuration into `public/autopilot-config.json`. Do not put Supabase service-role keys in `.env.local`; they should never ship in the desktop app.

If your Google OAuth client type is `Web application`, add this Authorized redirect URI in Google Cloud:

```bash
http://127.0.0.1:53682/oauth/gmail/callback
```

If your Google OAuth client type is `Desktop app`, the loopback redirect is handled by Google automatically.

Enable both the Gmail API and Google Calendar API in Google Cloud. Autopilot requests readonly Gmail and Calendar scopes so the Productivity workspace can turn inbox messages, meetings, and deadlines into action items. If you connected Google before Calendar support existed, disconnect and reconnect Google once so the Calendar permission is granted.

## Secure AI Backend

Downloaded users should not need `.env.local` and should never receive your OpenAI key. For a production build, deploy the AI proxy described in [docs/AI_BACKEND.md](docs/AI_BACKEND.md), then package only public backend config:

```bash
AUTOPILOT_SUPABASE_PROJECT_REF=ctvxwmmclsfxortzmkeq
AUTOPILOT_SUPABASE_URL=https://ctvxwmmclsfxortzmkeq.supabase.co
AUTOPILOT_SUPABASE_ANON_KEY=your-public-anon-key
AUTOPILOT_AI_PROXY_URL=https://your-backend.example.com/api/ai
AUTOPILOT_AI_ARTIFACT_URL=https://your-backend.example.com/api/ai/artifact
AUTOPILOT_AI_EMAIL_ACTIONS_URL=https://your-backend.example.com/api/ai/email-actions
AUTOPILOT_OPENAI_MODEL=gpt-5.5
AUTOPILOT_OPENAI_MODEL_MINI=your-cheaper-model
AUTOPILOT_OPENAI_MODEL_STANDARD=your-standard-model
AUTOPILOT_OPENAI_MODEL_FRONTIER=gpt-5.5
```

Local development can still use `AUTOPILOT_OPENAI_API_KEY`, but packaged apps ignore local OpenAI keys by default. The production path is Supabase sign-in plus a server-side AI proxy.
When `AUTOPILOT_AI_PROXY_URL` points at the Supabase `functions/v1/ai` endpoint, the build automatically derives the sibling `ai-artifact` and `ai-email-actions` endpoint URLs.
Tier-specific model variables are optional. If they are set, Autopilot routes routine email/page/critique work to cheaper models and reserves the frontier model for final artifact revision, design generation, and coding agent work.

## Scripts

- `npm run dev` starts Vite and Electron together.
- `npm run build` compiles the Electron main process and renderer.
- `npm start` builds and launches the desktop app.
- `npm run dist:win` builds a Windows installer in a timestamped `release-package-*` folder.
- `npm run verify:release-config` checks that the generated public config and build output are safe for beta packaging.
- `npm run verify:release` runs check, tests, build, release config verification, e2e, and Windows packaging.
- `npm test` runs the test suite.
- `npm run check` type-checks the main process and renderer.

## Launch Readiness

- Keep installer output signed before public launch and smoke-test it on a clean Windows machine.
- Before sending a tester build, run `npm run verify:release-config` after `npm run build`; it fails if Supabase/AI endpoint config is missing or if server-side secret-looking values appear in the packaged public config/build output.
- Verify Browser page-read, Gmail/Calendar sync, Design generation, Coding AI planning, and packaged AI proxy health before sending a tester build.
- Use [docs/PRIVACY_DATA_FLOW.md](docs/PRIVACY_DATA_FLOW.md) when explaining what data stays local and what goes to Supabase or the AI proxy.
- Use [docs/COMPETITOR_ANALYSIS.md](docs/COMPETITOR_ANALYSIS.md) as the format for future competitive reviews; every analysis should end with a threat/action appendix.

## Browser Features

- Multi-tab browsing with Electron-managed web contents.
- Browser-style top tab strip with active tab, memory, and sidebar tab controls.
- Visible tab close controls plus a dedicated delete-tab button.
- Back, forward, reload, home, new tab, and address/search controls.
- Settings page with live color customization, contrast warnings, and reset.

## Workspace Features

- Productivity workspace for Gmail-derived tasks, drafts, calendar-linked work, and AI-vs-user ownership.
- Design workspace for generating, previewing, revising, and exporting documents, slide decks, reports, and website designs.
- Coding workspace for local projects, autosaved manual edits, AI planning, reviewable diffs, approved commands, downloads, plugins, and research.
- Assistant panel with explicit source selection and a Generate → Preview → Approve workflow.

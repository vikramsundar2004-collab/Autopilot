# Autopilot

Autopilot is a Chromium-based desktop browser built with Electron, Vite, React, and TypeScript.

## Getting Started

```bash
npm install
npm run dev
```

## Gmail Setup

Create or edit `.env.local` in the project root. Autopilot also supports `env.local` if that is the file name you already use:

```bash
AUTOPILOT_GOOGLE_CLIENT_ID=your-client-id
AUTOPILOT_GOOGLE_CLIENT_SECRET=optional-local-development-secret
AUTOPILOT_GOOGLE_REDIRECT_PORT=53682
```

Restart Autopilot after changing those values. `.env.local` and `env.local` are ignored by git, and `.env.example` shows the expected keys.

When you run `npm run build` or `npm run dev`, Autopilot generates `public/autopilot-config.json` from the client ID. That generated file is copied into the built app, so people who receive that build can connect Gmail without creating their own `.env.local`. The client secret is never written to the generated public config.

If your Google OAuth client type is `Web application`, add this Authorized redirect URI in Google Cloud:

```bash
http://127.0.0.1:53682/oauth/gmail/callback
```

If your Google OAuth client type is `Desktop app`, the loopback redirect is handled by Google automatically.

## OpenAI Email Planning

Add your OpenAI key to `.env.local` to let Autopilot read synced Gmail snippets and write the real action items into Today's Call:

```bash
AUTOPILOT_OPENAI_API_KEY=your-openai-api-key
AUTOPILOT_OPENAI_MODEL=gpt-4o-mini
AUTOPILOT_OPENAI_BASE_URL=https://api.openai.com/v1
```

The OpenAI key is only read by the Electron main process. It is not written to `public/autopilot-config.json` or exposed to the renderer.

## Scripts

- `npm run dev` starts Vite and Electron together.
- `npm run build` compiles the Electron main process and renderer.
- `npm start` builds and launches the desktop app.
- `npm test` runs the test suite.
- `npm run check` type-checks the main process and renderer.

## Browser Features

- Multi-tab browsing with Electron-managed web contents.
- Visible tab close controls plus a dedicated delete-tab button.
- Back, forward, reload, home, new tab, and address/search controls.
- Settings page with live color customization, contrast warnings, and reset.

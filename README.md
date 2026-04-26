# Autopilot

Autopilot is a Chromium-based desktop browser built with Electron, Vite, React, and TypeScript.

## Getting Started

```bash
npm install
npm run dev
```

## Gmail Setup

Create or edit `.env.local` in the project root:

```bash
AUTOPILOT_GOOGLE_CLIENT_ID=your-client-id
AUTOPILOT_GOOGLE_CLIENT_SECRET=your-client-secret
```

Restart Autopilot after changing those values. `.env.local` is ignored by git, and `.env.example` shows the expected keys.

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

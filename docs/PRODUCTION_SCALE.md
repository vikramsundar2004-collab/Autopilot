# Autopilot Production Scale

Autopilot is a local-first Electron browser. A million users do not hit one Autopilot server at the same time: each user runs their own app process, browser partition, bookmarks, history, password store, and Gmail cache on their own device. The parts that must scale are the shared services around the app.

## What Must Stay Local

- Browser tabs, history, bookmarks, settings, and password storage stay on the user's device.
- Passwords use Electron safe storage and the operating system login gate before reveal.
- Gmail access and inbox cache are per-user and stored under Electron `userData`.
- There is no shared production database in the current app. Do not add one for browser state unless there is a clear sync product requirement.

## Shared Bottlenecks

- Gmail OAuth and Gmail API quotas are the main shared quota surface.
- App distribution and updates need signed installers and a CDN or release platform that can handle rollout spikes.
- If telemetry or crash reporting is added, it must be opt-in, batched, and resilient to collector downtime.
- Any future hosted service must be stateless at the edge and must not block local browsing if it is down.

## Gmail Rollout Rules

- Use one verified Google OAuth application for production.
- Request quota increases before broad release.
- Keep `AUTOPILOT_GMAIL_MESSAGE_CONCURRENCY` low. The default is `4` so one sync does not burst 25 message-detail requests at once.
- Keep request timeouts and retry attempts bounded. Defaults are 15 seconds and 2 retries.
- On Gmail errors, show cached messages and a clear reason instead of blocking the productivity workspace.

## Release Checklist

- Build signed installers for Windows/macOS/Linux.
- Publish updates through a CDN-backed channel with staged rollout support.
- Keep `.env.local` out of git. Only `AUTOPILOT_GOOGLE_CLIENT_ID` should be present in the public app config.
- Load-test OAuth callback and update distribution, not the local browser itself.
- Run `npm run check`, `npm test`, and `npm run build` before each release.
- Smoke-test browser navigation to Google, localhost, a PDF, and a bad domain.

## Current Scale Protections

- Local-first storage avoids a central browser-state bottleneck.
- Gmail sync uses retryable fetches with bounded timeouts.
- Gmail message detail fetches are concurrency-limited.
- Failed API syncs fall back to cached inbox messages.
- Browser navigation failures expose Chromium's real error code and can be retried.

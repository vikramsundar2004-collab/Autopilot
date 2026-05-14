# Competitor Analysis Format

Autopilot competitor analyses should end with a concrete threat/action appendix. The goal is not only to list competitors, but to decide what Autopilot must do this week to avoid losing the wedge.

## Required Structure

1. Workspace-by-workspace comparison:
   - Browser
   - Productivity
   - Coding
   - Design
   - Automation
   - Settings/account/backend
2. Persona comparison:
   - students
   - researchers
   - founders/operators
   - developers
   - creators/designers
   - busy professionals
3. Autopilot advantage:
   - read sources
   - understand work
   - route work
   - produce output
   - quality-check
   - preview
   - approve/export/send
4. Weaknesses and fixes:
   - each weakness must have a concrete product fix
   - no "we should improve" without an owner surface and user-visible behavior
5. Threat appendix:
   - likelihood
   - horizon
   - severity
   - action this week
6. Threat response matrix:
   - product response
   - verification path
   - owner surface
   - no threat may be listed without a concrete product mitigation and test/release check

## Default Threat Appendix

| # | Threat | Likelihood | Horizon | Severity | Action this week |
|---|---|---|---|---|---|
| 1 | Distribution failure | highest | now | existential | Keep signed Windows installers working, publish a clean tester build, and run the install/OAuth/AI smoke path. |
| 2 | Superhuman owns productivity perception | very high | now | severe | Ship keyboard-first triage, split inboxes, fast cached rendering, and blocked-sender privacy. |
| 3 | Gemini in Chrome normalizes page/context agents | very high | now-6 months | severe | Make active-tab reading and browser actions visibly work inside Autopilot's assistant. |
| 4 | Claude/ChatGPT connector ecosystems outpace us | very high | now-12 months | severe | Add connector action controls and MCP-shaped tool governance. |
| 5 | Claude Code/Cursor expose Coding shallowness | very high | now | severe | Prove real edit/test/diff/approval in one E2E. |
| 6 | Figma/Canva/Gamma make Design look weak | high | now | severe | Keep Design canvas result-first and raise export/template quality. |
| 7 | Microsoft Copilot wins enterprise accounts | high | 6-12 months | severe but bounded | Position Autopilot around cross-app and local-first Work Twin routing, not Microsoft-only productivity. |
| 8 | Payment/security incident | medium | anytime | existential | Keep server-side enforcement, verified email matching, connected-account lock, and no fake receipts. |
| 9 | Privacy incident in connected data | medium | anytime | existential for trust | Document source data flow, keep raw email/artifact data local by default, and never log secrets. |
| 10 | OAuth scope breakage | medium-high | anytime | severe | Document Gmail/Calendar scopes, reconnect behavior, and fallback states now. |
| 11 | OSS replication of architecture | high | 12-24 months | moderate | Deepen handoffs, quality gates, sync metadata, Work Twin replay, and local-first privacy. |
| 12 | Model cost shock | medium | 12-24 months | moderate | Centralize model calls through AiGateway so token budgeting and model swaps happen in one place. |

## Default Threat Response Matrix

| # | Threat | Product response | Verification | Owner surface |
|---|---|---|---|---|
| 1 | Distribution failure | Package without `.env.local`, launch cleanly, sign in, pass AI health, and run the flagship demo. | `npm run dist:win` plus clean install/login/AI smoke. | release |
| 2 | Superhuman owns productivity perception | Productivity is instant, keyboard-first, detailed by default, and safe to organize only after approval. | Inbox speed, shortcut, split-inbox, and blocked-sender tests. | productivity |
| 3 | Gemini in Chrome | Active-tab reading, shared-tab context, safe DOM actions, and approval before submit/pay/send. | Browser assistant E2E with approval gate. | browser |
| 4 | Claude/ChatGPT connectors | Connector tools, scopes, risk levels, allow/deny state, and audit trails in Settings. | Connector readiness and permission tests. | settings |
| 5 | Claude Code/Cursor | Coding shows projects/files, recent code, editor/workbench, plan, run log, diff, tests, and approval. | Coding golden-path E2E. | coding |
| 6 | Figma/Canva/Gamma | Design is a result-first artifact studio with Built Items, Sources, Drafts, versions, compact quality, and Send to Coding. | Design visual QA and artifact quality tests. | design |
| 7 | Microsoft Copilot | Cross-app Work Twin routing across non-Microsoft and Microsoft sources. | Home demo includes Gmail/Calendar/Browser/Coding/Design. | home |
| 8 | Payment/security incident | User-owned provider setup, invoice/vendor verification, proposal, approval, provider confirmation, and receipt verification. | Payment safety and receipt verification tests. | backend |
| 9 | Privacy incident | Local-first raw data, redacted logs, no raw saved passwords to AI, clear data controls. | Privacy and secret-redaction tests. | settings |
| 10 | OAuth scope breakage | Granted scopes, missing scopes, reconnect prompts, and honest unavailable states. | Missing-scope tests. | settings |
| 11 | OSS replication | Work Twin replay, provenance, quality gates, approvals, and handoffs visible on generated output. | Work Twin replay tests. | home |
| 12 | Model cost shock | Token/cost/duration/fallback logging through `AiGateway`. | AiGateway cost/token logging tests. | backend |

## Current Product Implications

- Distribution failure is the first existential risk, so `npm run dist:win` must stay green.
- Browser assistant parity depends on `tabs.readPageText` and safe DOM actions being visible in the UI.
- Model cost and vendor risk should be handled in `AiGateway`, not scattered through workspaces.
- Privacy risk must be handled by local-first storage, redacted logs, and clear settings copy.
- OAuth tightening means Gmail and Calendar scopes must be documented and reconnect states must be honest.

## Latest Read: 2026-05-10

### Market Bar Checked

| Competitor | Current bar | Autopilot implication |
|---|---|---|
| Superhuman | Split Inbox, keyboard-first Inbox Zero, Send Later, follow-up reminders, AI reply help. | Productivity must feel instant, keyboard-first, and privacy-controlled. Latest blocked-senders controls help; still need split-inbox speed polish. |
| Claude / Claude Code | MCP connectors, reviewed connector directory, codebase mapping, multi-file edits, tests, PR workflow. | Work Twin + Agent Runtime is directionally right, but Coding needs more visible diff/test/approve proof in daily use. |
| ChatGPT apps/connectors | MCP-backed apps, admin action control, RBAC, action constraints. | Autopilot’s connector permission layer should expose per-tool action controls in Settings, not just global readiness. |
| Gemini in Chrome | Reads current tab by default, can share multiple tabs, summarize/explain/compare pages, multi-step browser actions. | Browser assistant needs tab context and safe DOM actions to be obvious and reliable; Finance now also watches the active browser tab for invoice candidates. |
| Figma AI / Codex-Figma | Prompt/code/design loop and code-to-design MCP workflow. | Design must keep the artifact canvas dominant and make Send to Coding real for website artifacts. |
| Canva Magic Studio | Broad AI creation suite with low-friction design outputs. | Design outputs cannot feel like source text or wireframes; templates/export polish remain a priority. |
| Microsoft 365 Copilot | Microsoft Graph grounding, Outlook/Teams/Office context, enterprise compliance posture. | Autopilot should win on cross-app routing, local-first privacy, and non-Microsoft sources, not by trying to out-Microsoft Microsoft. |

### Latest Code Weaknesses Found And Fixed

| # | Weakness | Concrete fix | Owner surface |
|---|---|---|---|
| W1 | Finance provider readiness could show as ready from a local `connected` status without a connected Stripe account id. | `financeProviderReady` now requires money movement enabled, payment email verified, Stripe status `connected`, and a `connectedAccountId`. | `src/renderer/App.tsx` Productivity/Home |
| W2 | Supabase payment execution could theoretically accept `email_verified_for_payments=true` without a concrete verified email value. | `payments-execute` now requires `verified_email` to exist and exactly match the signed-in Supabase user email. | `supabase/functions/payments-execute/index.ts` |
| W3 | Finance source-opening contract still described email-only behavior after browser invoice candidates were added. | Button contract now says it opens the source email or browser tab. | `src/shared/buttonContract.ts` |

### Remaining Gaps

| # | Gap | Severity | Action next |
|---|---|---|---|
| G1 | Productivity still trails Superhuman on Split Inbox polish and perceived speed. | High | Add virtualized split inboxes, command palette telemetry, and keyboard feedback timing tests. |
| G2 | Browser assistant has page-read, but Gemini in Chrome makes multi-tab context a baseline. | High | Add visible “shared tabs” chips and a safe DOM-action run log. |
| G3 | Coding still needs a more convincing Codex/Claude Code proof loop. | High | Add one golden-path E2E: open project, plan, edit, test, diff, approve. |
| G4 | Design output quality still trails Figma/Canva/Gamma on polish. | High | Keep investing in result-first canvas, slide layouts, export evidence, and versioned artifact replay. |
| G5 | Connector governance is less mature than ChatGPT/Claude enterprise controls. | Medium-high | Settings should expose connector actions, risk level, allow/deny state, and audit trail per tool. |

### Threat Appendix

| # | Threat | Likelihood | Horizon | Severity | Action this week |
|---|---|---|---|---|---|
| 1 | Superhuman owns productivity perception | very high | now | severe | Ship split inbox + blocked-sender privacy + keyboard performance proof. |
| 2 | Gemini in Chrome normalizes page/context agents | very high | now-6 mo | severe | Make Browser “read/share tab” and safe DOM actions unmistakable. |
| 3 | Claude/ChatGPT connector ecosystems outpace us | very high | now-12 mo | severe | Add connector action controls and MCP-shaped tool governance. |
| 4 | Claude Code/Cursor expose Coding shallowness | very high | now | severe | Prove real edit/test/diff/approval in one E2E. |
| 5 | Figma/Canva/Gamma make Design look weak | high | now | severe | Keep Design canvas result-first and raise export/template quality. |
| 6 | Microsoft Copilot wins enterprise accounts | high | 6-12 mo | bounded but serious | Position cross-app/local-first Work Twin, not Microsoft-only productivity. |
| 7 | Payment/security incident | medium | anytime | existential | Server-side enforcement, verified email matching, connected-account lock, and no fake receipts. |
| 8 | Distribution failure | highest | now | existential | Keep `dist:win`, clean install, login, AI health, and payment test-mode smoke green. |

### Current 12-Threat Productization Table

| # | Threat | Likelihood | Horizon | Severity | Action this week |
|---|---|---|---|---|---|
| 1 | Distribution failure | highest | now | existential | Keep `dist:win`, clean install, login, AI health, and payment test-mode smoke green. |
| 2 | Superhuman owns productivity perception | very high | now | severe | Ship keyboard-first triage, split inboxes, fast cached rendering, and blocked-sender privacy. |
| 3 | Gemini in Chrome normalizes page/context agents | very high | now-6 months | severe | Make active-tab reading and browser actions visibly work inside Autopilot's assistant. |
| 4 | Claude/ChatGPT connector ecosystems outpace us | very high | now-12 months | severe | Add connector action controls and MCP-shaped tool governance. |
| 5 | Claude Code/Cursor expose Coding shallowness | very high | now | severe | Prove real edit/test/diff/approval in one E2E. |
| 6 | Figma/Canva/Gamma make Design look weak | high | now | severe | Keep Design canvas result-first and raise export/template quality. |
| 7 | Microsoft Copilot wins enterprise accounts | high | 6-12 months | severe but bounded | Position Autopilot around cross-app and local-first Work Twin routing, not Microsoft-only productivity. |
| 8 | Payment/security incident | medium | anytime | existential | Keep server-side enforcement, verified email matching, connected-account lock, and no fake receipts. |
| 9 | Privacy incident in connected data | medium | anytime | existential for trust | Document source data flow, keep raw email/artifact data local by default, and never log secrets. |
| 10 | OAuth scope breakage | medium-high | anytime | severe | Document Gmail/Calendar scopes, reconnect behavior, and fallback states now. |
| 11 | OSS replication of architecture | high | 12-24 months | moderate | Deepen handoffs, quality gates, sync metadata, Work Twin replay, and local-first privacy. |
| 12 | Model cost shock | medium | 12-24 months | moderate | Centralize model calls through AiGateway so token budgeting and model swaps happen in one place. |

# Autopilot Browser Business Offer

Date: 2026-05-10

## The Offer

**Autopilot Pro turns scattered browser tabs, email, calendar events, docs, and code into a daily action plan with reviewable drafts in your first session.**

This offer is based on the framework from Dan Martell's video, [If I Started Over With $0, Here's My Exact Plan to get to $1M](https://www.youtube.com/watch?v=dyrr4eAdnhg&t=67s):

- Sell a painful problem.
- Promise a clear transformation.
- Use three price points.
- Add guarantees that reduce buyer risk.
- Add bonuses that handle objections.
- Create urgency by showing the cost of waiting.
- Deliver value right after payment.

## The Pain

You do not need another AI chat box.

You need one place that can look at your work and tell you what actually needs to happen next.

Autopilot is for people who are tired of:

- Losing important work across tabs, Gmail, Calendar, docs, and projects.
- Copying context into AI tools over and over.
- Getting AI drafts that still need manual cleanup.
- Wondering which tasks matter today.
- Not trusting agents because they act before showing the plan.

## The Promise

In your first session, Autopilot will help you create at least one useful output from your real work:

- A prioritized daily action plan
- A reply draft
- A meeting prep brief
- A client report outline
- A document or slide draft
- A coding plan with files, risks, and next steps

Plain version:

> Autopilot helps you go from scattered work to one clear next move.

## The Main Package

### Autopilot Pro

**$59/month**

Best for founders, freelancers, consultants, builders, and operators.

Includes:

- AI browser workspace
- Gmail and Calendar work extraction
- Daily action queue
- Source-aware assistant
- Design and document generation
- Coding plan and diff workflow
- Local-first browser data
- Approval before high-impact actions
- Priority AI limits during beta

## Pricing Stack

Use three prices so Pro feels like the obvious choice, while Operator is still high enough for heavier AI usage, early access, and founder support.

| Plan | Price | Included monthly AI budget | Token value at `gpt-5.5` rates | Use case |
|---|---:|---:|---:|---|
| Starter | $19/month | $2 internal API budget | 400K input tokens or 67K output tokens | Light users who want the AI browser and basic action queue |
| Pro | $59/month | $12 internal API budget | 2.4M input tokens or 400K output tokens | Main offer for serious individual operators |
| Operator | $200/month | $50 internal API budget | 10M input tokens or 1.67M output tokens | Power users who want high limits, early features, and founder office hours |

Recommended sales framing:

> Most users should start with Pro. Starter is for light use. Operator is for people who use Autopilot as a daily work command center and want the highest limits.

Why these prices make more sense:

- $19 Starter is cheap enough to try, but the small budget prevents heavy usage from becoming unprofitable.
- $59 Pro is the main offer and leaves room for support, billing fees, product margin, and real daily use.
- $200 Operator is the premium anchor for serious power users who get clear time savings from heavy workflows.
- Internal API budgets stay near 10-25% of plan revenue, which is sane for a product that still has hosting, support, and development costs.
- Heavy runs should be routed, queued, or capped instead of hidden behind an unlimited promise.

Annual pricing:

- Starter: $190/year
- Pro: $590/year
- Operator: $2,000/year

Annual buyers get roughly two months free.

## API Token Cost Per Output

Pricing source checked on 2026-05-10: [OpenAI API pricing](https://openai.com/api/pricing/) and [OpenAI detailed API pricing](https://developers.openai.com/api/docs/pricing).

Autopilot currently defaults to `gpt-5.5`. Official standard short-context pricing is:

| Model | Input | Cached input | Output |
|---|---:|---:|---:|
| `gpt-5.5` | $5.00 / 1M tokens | $0.50 / 1M tokens | $30.00 / 1M tokens |
| `gpt-5.4` | $2.50 / 1M tokens | $0.25 / 1M tokens | $15.00 / 1M tokens |
| `gpt-5.4-mini` | $0.75 / 1M tokens | $0.075 / 1M tokens | $4.50 / 1M tokens |

Token value by plan:

| Plan | Internal API budget | `gpt-5.5` input-token value | `gpt-5.5` output-token value | Best customer-facing explanation |
|---|---:|---:|---:|---|
| Starter | $2/month | 400K input tokens | 67K output tokens | Enough for light planning, summaries, and a few polished outputs |
| Pro | $12/month | 2.4M input tokens | 400K output tokens | Enough for regular daily plans, drafts, meeting briefs, and moderate artifact work |
| Founder Operator | $12/month | 2.4M input tokens | 400K output tokens | Discounted launch tier with Operator features and Pro-sized AI budget |
| Operator | $50/month | 10M input tokens | 1.67M output tokens | Highest included token value for heavy workflows, coding plans, and long-context work |

This is not a literal customer token balance. Real usage mixes input, cached input, and output tokens, so Autopilot should show friendly usage language like "light," "regular," and "heavy" instead of making customers do token math.

Estimated uncached cost per useful output:

| Output type | Estimated tokens | `gpt-5.5` cost | Notes |
|---|---:|---:|---|
| Email triage item | 4K input / 600 output | $0.04 | Cheap enough for Starter if batched carefully |
| Daily action plan | 12K input / 1.5K output | $0.11 | Core Pro use case |
| Reply draft or meeting brief | 10K input / 2K output | $0.11 | Good margin on Pro |
| Document, report, or deck pipeline | 45K input / 8K output | $0.47 | Multi-step plan, draft, critique, revise flow |
| Coding plan or small diff | 80K input / 6K output | $0.58 | Operator use case when repo context is large |
| Heavy repo, artifact, or research run | 180K input / 15K output | $1.35 | Must be metered, queued, or routed carefully |

Budget sanity check:

| Plan | Internal API budget | Budget as % of price | Rough `gpt-5.5` capacity before routing or caps |
|---|---:|---:|---|
| Starter | $2/month | 11% | 18 daily action plans, or 4 document/deck pipelines |
| Pro | $12/month | 20% | 100 daily action plans, or 25 document/deck pipelines, or 8 heavy runs |
| Founder Operator | $12/month | 20% | 100 daily action plans, or 25 document/deck pipelines, or 8 heavy runs |
| Operator | $50/month | 25% | 450 daily action plans, or 100 document/deck pipelines, or 35 heavy runs |

The budget is an internal cost guardrail, not a customer cash credit. When a user approaches the budget, Autopilot should use smaller models for routine work, summarize/cached context, batch similar tasks, or ask before running expensive long-context jobs.

Cost formula:

```text
cost = (input_tokens / 1,000,000 * input_price) + (output_tokens / 1,000,000 * output_price)
```

Practical pricing rule:

- Starter should use `gpt-5.4-mini` or `gpt-5.4` for most work.
- Pro should use `gpt-5.5` for complex outputs and cheaper models for routine triage.
- Operator can use `gpt-5.5` more often, but still needs a monthly API budget.
- Long-context runs above 270K tokens cost more, so Autopilot should summarize, cache, and route instead of sending giant raw context every time.

## Founder Launch Offer

For the first 100 paying users:

**Get Founder Operator access for $59/month for 12 months.**

You get:

- Everything in Pro
- Operator-level features
- $12/month internal API budget
- Founder office hours
- Priority feedback channel
- Locked $59/month price for 12 months while subscribed

This is real scarcity because early onboarding capacity is limited. The offer ends after the first 100 paid users.

## Guarantees

### 1. First Useful Output Guarantee

If Autopilot does not help you produce one useful action plan, draft, artifact, or coding plan from your real work in the first 7 days, you get your first month refunded.

### 2. Setup Guarantee

If you cannot install, sign in, or connect your first source because of an Autopilot product issue, you get a free month after the issue is fixed.

### 3. Approval Guarantee

Autopilot will not send email, execute payments, modify code, or take high-impact external actions without showing the plan and requiring approval.

### 4. Privacy Clarity Guarantee

Browser state, history, bookmarks, passwords, settings, and local caches stay on your device by default. If that changes, it requires opt-in.

## Bonuses

### Bonus 1: First Workflow Setup Guide

A short checklist that gets you from install to first useful output.

### Bonus 2: Operator Prompt Pack

Ready-to-use prompts for:

- Daily planning
- Inbox triage
- Meeting prep
- Client deliverables
- Research summaries
- Coding plans

### Bonus 3: Founder Office Hours

Early paid users get monthly group office hours to improve their workflow and shape the product.

### Bonus 4: Privacy And Data Flow Brief

A plain-English guide showing what stays local, what reaches Supabase, and what reaches the AI backend.

## Cost Of Waiting

If the customer does nothing, the pain stays the same:

- More missed follow-ups
- More scattered tabs
- More repeated context-copying
- More AI drafts that do not become finished work
- More time spent deciding what to do instead of doing it

The real cost is not the $59/month.

The real cost is losing hours every week to work that never becomes a clear next action.

## Sales Page Copy

### Headline

Turn scattered work into one clear action plan.

### Subheadline

Autopilot Browser reads your tabs, email, calendar, docs, and projects, then helps you create reviewable drafts and next steps without losing control.

### Primary CTA

Start with Autopilot Pro

### Secondary CTA

Get the Founder Launch Offer

### Short Pitch

Autopilot is an AI browser for operators, founders, freelancers, and builders who live across too many tabs and tools. It finds the work, drafts the output, and waits for your approval before important actions.

## Outreach Message

Use this for direct outreach:

> I am building Autopilot, an AI browser for people whose work is scattered across tabs, Gmail, Calendar, docs, and code. It turns your real work into a daily action plan and reviewable drafts. I am giving the first 100 paid users Founder Operator access for $59/month instead of the future $200/month Operator price. Want me to run a 10-minute workflow audit and show you where it would save time?

## Sales Call Script

1. What work slipped through the cracks this week?
2. Where did that work live: tabs, email, calendar, docs, code, or chat?
3. What happens if this stays messy for the next 6 months?
4. What would be most valuable: action planning, draft generation, meeting prep, research, or coding help?
5. If Autopilot produced one useful output from your real work today, would you try it for $59/month?
6. Offer the Founder Launch plan.

## Objection Handling

### "I already use ChatGPT."

ChatGPT is useful, but you still have to bring it context. Autopilot starts from the work itself: tabs, email, calendar, docs, and projects.

### "I do not trust AI agents."

That is exactly why Autopilot is built around review before action. It prepares the work, shows the plan, and waits for approval.

### "I do not want another tool."

Autopilot is the browser workspace. It is meant to replace context switching, not add another random dashboard.

### "Is my data safe?"

Autopilot is local-first for browser data. Sensitive actions require explicit approval, and the privacy/data flow brief explains what leaves the device.

### "Why pay now?"

The Founder Launch Offer gives Operator-level features for $59/month for 12 months. After the first 100 paid users, Operator is $200/month.

## First 10-Minute Experience

The offer only works if the first session is useful.

Ideal first session:

1. Install Autopilot.
2. Sign in.
3. Connect Gmail and Calendar, or use current browser tabs.
4. Click "Build today's action plan."
5. Review 3 to 7 prioritized work items.
6. Generate one useful draft, brief, artifact, or coding plan.
7. Approve, copy, export, or save the output.

## Final Offer In One Paragraph

Autopilot Pro turns scattered tabs, email, calendar events, docs, and code into a daily action plan and reviewable drafts. Start with Pro for $59/month, or join the first 100 paid users and get Founder Operator access for $59/month for 12 months before Operator moves to $200/month. If Autopilot does not help you produce one useful output from your real work in the first 7 days, your first month is refunded.

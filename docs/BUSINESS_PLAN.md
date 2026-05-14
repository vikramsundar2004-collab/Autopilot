# Autopilot Browser Business Plan

Date: 2026-05-10

## Simple Summary

Autopilot Browser is an AI-powered desktop browser for people whose work is scattered across tabs, email, calendar, files, code, and documents.

The business should start with one clear promise:

> Turn messy work into a prioritized action plan, useful drafts, and reviewable outputs in one workspace.

This is not a generic AI chat product. The wedge is a browser that can see the work, route the work, draft the output, and ask for approval before anything important happens.

## Video Inspiration

Pricing and offer structure were inspired by Dan Martell's video, [If I Started Over With $0, Here's My Exact Plan to get to $1M](https://www.youtube.com/watch?v=dyrr4eAdnhg&t=67s).

Useful ideas pulled from the video summaries:

- Sell a painful problem, not a vague passion project.
- Make the offer about a clear transformation, not the tools.
- Use guarantees to move risk away from the buyer.
- Use three price points: high anchor, main offer, and lower starter option.
- Deliver value immediately after payment so buyer's remorse does not set in.
- Stress-test the offer against skeptical buyer objections before launching.

Reference summaries:

- [Video Highlight summary](https://videohighlight.com/v/dyrr4eAdnhg)
- [Confession House Media breakdown](https://confessionhousemedia.com/dan-martell-100m-ceo-start-over-plan-2026/)

## Who Buys First

Start with people who already feel the pain every day:

1. Founders and solo operators who live in browser tabs, Gmail, Calendar, docs, and code.
2. Freelancers and consultants who need to turn client chaos into plans, drafts, reports, and follow-ups.
3. Developers and technical founders who want AI coding help but still need reviewable plans, diffs, tests, and approval.
4. Researchers and students who need to turn tabs and source material into usable notes, decks, and documents.

The best first buyer is the solo operator or technical founder. They can decide fast, feel the problem sharply, and do not need enterprise procurement.

## Painkiller Problem

The customer does not wake up wanting "an AI browser."

They wake up thinking:

- "I have too many tabs and no idea what matters."
- "Important emails and tasks are slipping."
- "I keep copying context into AI tools."
- "AI gives me drafts, but I still have to inspect, fix, export, and act."
- "I do not trust agents to take action without showing me the plan."

Autopilot should sell the outcome:

> One command center that reads the work, finds the next action, drafts the output, and waits for approval.

## Offer Ladder

### Main Offer

**Autopilot Pro: Get from scattered work to a usable daily action plan in your first session.**

Includes:

- AI browser workspace
- Gmail and Calendar work extraction
- Productivity action queue
- Design and document generation
- Coding plan, diff, and approval workflow
- Source-aware assistant
- Local-first browser data
- Review before external impact

### Bonuses

Bonuses should remove purchase objections:

1. **First Workflow Setup Guide**
   A short checklist that gets the user from install to first useful output.

2. **Operator Prompt Pack**
   Ready-made commands for daily planning, inbox triage, meeting prep, coding plans, and artifact creation.

3. **Founder Beta Office Hours**
   For early paid users only, a monthly group session to fix onboarding, workflows, and missing features.

4. **Privacy and Data Flow Brief**
   Plain-English explanation of what stays local, what goes to Supabase, and what reaches the AI backend.

## Pricing

Keep pricing simple. Three tiers are enough, but the prices need to respect both product value and API cost.

| Plan | Price | Included monthly AI budget | Token value at `gpt-5.5` rates | Best for | What they get |
|---|---:|---:|---:|---|---|
| Starter | $19/month | $2 internal API budget | 400K input tokens or 67K output tokens | Students, researchers, light users | AI browser, basic action queue, limited AI actions, local browser features |
| Pro | $59/month | $12 internal API budget | 2.4M input tokens or 400K output tokens | Founders, freelancers, operators | Full productivity, Gmail/Calendar, Design, Coding, higher AI limits, priority model access |
| Operator | $200/month | $50 internal API budget | 10M input tokens or 1.67M output tokens | Power users and small teams | Everything in Pro, advanced automations, high limits, early features, founder office hours |

Recommended sales-page framing:

1. Show **Operator at $200/month** first as the high anchor.
2. Highlight **Pro at $59/month** as the main offer.
3. Keep **Starter at $19/month** as the low-friction entry.

Annual pricing:

- Starter: $190/year
- Pro: $590/year
- Operator: $2,000/year

This is roughly two months free for annual buyers. Do not add usage-based pricing at launch. It will make the offer harder to understand.

### API Token Cost Per Output

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

| Output type | Estimated tokens | `gpt-5.5` cost | Pricing implication |
|---|---:|---:|---|
| Email triage item | 4K input / 600 output | $0.04 | Cheap enough for Starter if batched carefully |
| Daily action plan | 12K input / 1.5K output | $0.11 | Core Pro use case |
| Reply draft or meeting brief | 10K input / 2K output | $0.11 | Good margin on Pro |
| Document, report, or deck pipeline | 45K input / 8K output | $0.47 | Should count meaningfully against plan budget |
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

Practical pricing rules:

- Starter should use `gpt-5.4-mini` or `gpt-5.4` for most work.
- Pro should use `gpt-5.5` for complex outputs and cheaper models for routine triage.
- Operator can use `gpt-5.5` more often, but still needs a monthly API budget.
- Long-context runs above 270K tokens cost more, so Autopilot should summarize, cache, and route instead of sending giant raw context every time.

## Guarantees

Use guarantees that are strong but honest.

### 1. First Useful Output Guarantee

If a paid user does not get at least one useful action plan, draft, report, coding plan, or artifact from their real work in the first 7 days, refund the first month.

### 2. Setup Guarantee

If the user cannot complete install, sign-in, and first source connection because of an Autopilot product issue, give them a free month after the issue is fixed.

### 3. Review-Before-Action Guarantee

Autopilot will not send email, execute payments, modify code, or take high-impact external actions without showing the user the plan and requiring approval.

### 4. Privacy Clarity Guarantee

Browser state, history, bookmarks, settings, password storage, and local caches stay on the user's device by default. If this changes, the user must opt in.

## Launch Offer

For the first 100 paid users:

**Founder Operator Plan: $59/month for 12 months**

They get:

- Everything in Pro
- Operator-level features during beta
- $12/month internal API budget
- Founder office hours
- Priority feedback channel
- Locked $59/month price for 12 months as long as subscription stays active

Why this works:

- It creates real urgency without fake scarcity.
- It rewards early trust.
- It gives Autopilot concentrated feedback from serious users.
- It avoids enterprise complexity.

## Customer Acquisition

Start with direct outreach, not ads.

Daily target:

- 25 personalized messages per day
- 5 founder/operator discovery calls per week
- 2 paid conversions per week

Outreach message:

> I am building Autopilot, an AI browser for people whose work is scattered across tabs, Gmail, Calendar, code, and docs. It turns your real work into an action queue and reviewable drafts. Want me to run a 10-minute workflow audit on your current setup?

Best channels:

- Founder communities
- Indie hacker groups
- Local startup communities
- Developer Discords and Slack groups
- Productivity-focused newsletters
- Personal network referrals

Do not lead with "AI browser." Lead with the work pain.

## Sales Call

Keep the call simple.

1. What work slipped through the cracks this week?
2. Where does that work usually live: tabs, email, calendar, docs, code, or chat?
3. What happens if this does not improve in the next 6 months?
4. If Autopilot could turn that into a daily action plan and usable drafts, would that be worth trying?
5. Start them on Pro or the Founder Operator Plan.

The call should make the customer feel understood before the product is pitched.

## Time To First Value

The first session must create a visible win in under 10 minutes.

Ideal flow:

1. Install Autopilot.
2. Sign in.
3. Connect Gmail and Calendar, or skip and use browser tabs only.
4. Run "Build today's action plan."
5. Show 3 to 7 prioritized work items.
6. Let the user generate one draft, artifact, or coding plan.
7. Ask for approval before any external action.

Activation metric:

> A user is activated when they approve, export, or copy one useful output from real work.

## 90-Day Plan

### Days 1-14: Offer Validation

- Publish this offer on a simple landing page or checkout page.
- Sell Founder Operator manually.
- Run 10 workflow audits.
- Record objections.
- Update pricing copy based on objections.

### Days 15-45: Paid Beta

- Convert 25 paid users.
- Personally onboard the first 10.
- Track time to first value.
- Fix install, OAuth, AI health, and source-connection failures first.
- Keep all paid users in one feedback loop.

### Days 46-90: Repeatable Sales

- Reach 100 paid users.
- Add a clear pricing page.
- Add self-serve subscription billing.
- Keep the three pricing tiers.
- Publish 3 case studies:
  - founder/operator daily action plan
  - consultant client deliverable
  - developer coding plan and diff review

## Revenue Targets

Simple first targets:

| Time | Goal | Revenue target |
|---|---:|---:|
| 30 days | 25 paid users | $1,500 MRR at $60 average |
| 90 days | 100 paid users | $6,000 MRR at $60 average |
| 6 months | 500 paid users | $30,000 MRR at $60 average |
| 12 months | 2,000 paid users | $120,000 MRR at $60 average |

Upside comes from Operator customers. Do not depend on enterprise deals in year one.

## Product Requirements For Paid Launch

The paid offer only works if these are reliable:

- Installer works on a clean Windows machine.
- Sign-in works.
- AI backend health is visible.
- Gmail and Calendar connection states are honest.
- Browser page-read works.
- Productivity action queue produces useful items.
- Design exports look finished enough to use.
- Coding plans show files, diffs, tests, and approval state.
- Settings clearly explain privacy, connectors, and money movement safeguards.

## Engineering Review

Keep launch billing separate from in-app money movement.

Subscription billing should be a normal business billing flow:

```text
Stripe Checkout -> Supabase user plan -> Autopilot feature gates
```

Do not reuse the in-app payment execution system for subscriptions. That system is for user-approved money movement and has a different safety model.

Recommended first implementation:

- Stripe Checkout or Payment Links for subscriptions
- Supabase user profile stores `plan`
- App reads plan on sign-in
- Local fallback keeps browser usable if billing status cannot load
- AI usage limits enforced server-side in the AI proxy

Avoid at launch:

- Metered billing
- Enterprise contracts
- Seat management
- Complex coupons
- Hard blocking the browser when billing checks fail

## CEO Review

The strongest version of this business is not "Chrome plus AI."

It is:

> A calm work command center where AI reads the context, prepares the next move, and the user stays in control.

The plan should stay narrow until users are paying. Win one painful workflow first: daily work extraction from tabs, Gmail, Calendar, and projects.

Do not try to beat every AI assistant at once. Beat scattered work.

## Not In Scope

- Enterprise procurement: too slow for the first 100 customers.
- Mobile app: not needed for the desktop work wedge.
- Team admin console: wait until teams pull it from the product.
- Live payment execution as a selling point: high risk and not needed for early adoption.
- Unlimited AI usage: cost risk with no pricing clarity.
- Full browser sync across devices: useful later, distracting now.

## Key Metrics

- Time to first value: under 10 minutes
- Activation rate: 60% of trials produce one useful output
- Trial-to-paid conversion: 20%
- Paid monthly churn: under 5%
- Weekly approved outputs per active user: 5+
- Support-blocked onboarding rate: under 10%

## The Short Version

Sell Autopilot as the browser that turns scattered work into action.

Launch with three prices:

- Starter: $19/month
- Pro: $59/month
- Operator: $200/month

Make Pro the main offer.

Guarantee first useful output in 7 days or refund the first month.

Give the first 100 users Founder Operator access for $59/month.

Win by making the first session useful, not by explaining every feature.

// Deno-compatible mirror of src/shared/artifactPrompts.ts.
// Keep these prompt builders in sync between the two files.

export type AiArtifactKind = "document" | "slide_deck" | "website_design" | "action_list";

export type ArtifactVisualPlan = {
  deckAccent?: "forest" | "clay" | "sage";
  tonePair?: "executive" | "warm" | "consumer" | "technical";
  perSlideLayout?: Array<{ index: number; layout: "cover" | "bullets" | "two_column" | "quote" | "closing"; reason: string }>;
  iconFamily?: "line" | "filled" | "none";
  documentRhythm?: "short-medium-short" | "medium-medium-short" | "short-long-short";
  websitePalette?: string[];
  websiteFontPair?: [string, string];
};

export type ArtifactPlanPayload = {
  inferredAsk?: string;
  audience?: string;
  deliverableKind?: AiArtifactKind;
  tone?: string;
  mustInclude?: string[];
  mustAvoid?: string[];
  people?: string[];
  dates?: string[];
  decisions?: string[];
  actionItems?: string[];
  planningNotes?: string[];
  visualPlan?: ArtifactVisualPlan;
};

export type ArtifactCritiquePayload = {
  flaws?: string[];
  revisionStrategy?: string;
};

export type ArtifactGenerationTrace = {
  inferredAsk: string;
  audience: string;
  deliverableKind: AiArtifactKind;
  planningNotes: string[];
  critique: string[];
  revisionSummary: string;
  attempts: number;
  costEstimateUsd?: number;
  modelRouting?: Record<string, string>;
  visualPlan?: ArtifactVisualPlan;
};

export const SLIDE_DECK_SPEC_V1 = `Slide deck quality spec v1:
- Each slide is one claim with evidence, not a topic with generic bullets.
- Use sharp sentence titles that make a point.
- Aim for 5-9 slides; never fewer than 3 for an email-to-artifact deck.
- First slide is a cover with the central thesis.
- Last slide is an explicit ask, decision, or next step.
- Forbid generic Agenda, Thank you, and Questions slides unless the email explicitly asks for them.
- Include named people, dates, decisions, and owners from the source.
- Layout discipline: each slide picks one shape: cover, bullets, two_column, quote, or closing.
  First slide is cover. Last slide is closing. Pick layout from content shape, not slide order.
- Bullets max: at most 5 bullets per slide, at most 12 words per bullet, claims not topics.
- Accent rotation: pick one of forest, clay, or sage as the slide accent. Use accent on the
  title and on at most one piece of evidence. Body stays neutral.
- Typography: sentence-case titles, body-case bullets, tabular figures for numbers and dates.
- Whitespace is content. Three strong bullets beat eight weak ones.
- Quote slides: include speaker name and role. No anonymous quotes.
- Two-column slides: one shared heading across both columns. The two columns must contrast
  (before vs after, current vs proposed, problem vs solution).`;

export const DOCUMENT_SPEC_V1 = `Document quality spec v1:
- First three sentences must function as an executive summary.
- Use named sections: Context, Findings, Recommendation, Next steps, or more specific equivalents.
- Every major claim must tie back to evidence or a source detail.
- Forbid phrases like "What Autopilot understood", "The email mentions", and "Based on the source".
- Target 250-800 words unless the request needs a longer report.
- Include named people, dates, decisions, owners, and approval points.
- Rhythm: short opening paragraph (1-3 sentences) + medium middle paragraphs (3-6 sentences)
  + short closing paragraph. Avoid wall-of-text sections.
- Visual hierarchy: H1 once at the top, H2 for major sections, H3 only when an H2 has
  3+ distinct subsections. Never skip levels.
- Pull quotes: surface 1-2 key claims as blockquote callouts. Choose the most surprising
  or most consequential sentences in the document.
- Lists: numbered when order matters, bulleted when it does not.
- Numbers: tabular figures with explicit units. Write "40%" not "forty percent".
- Bold for evidence numbers and named decisions. Italics for source attributions.
- Section breaks: leave a blank line between H2 sections so the reader gets breathing room.`;

export const WEBSITE_DESIGN_SPEC_V1 = `Website design quality spec v1:
- One headline, one supporting line, one primary CTA.
- State the conversion intent: this page exists to make one specific thing happen.
- Mobile-first sections with real user-facing copy.
- No lorem ipsum, placeholder sections, or notes about reading an email.
- Include hero, proof/context, workflow/features, and decision/CTA sections.
- Include responsive HTML/CSS that can preview immediately.
- Color discipline: pick exactly 3 colors plus neutrals. One primary brand color, one
  accent reserved for CTAs only, one supporting tone. Never put accent on body text.
- Typography pair: one display font for headings, one body font for content. Body at 16px,
  hero at 48px, line-heights 1.2 for hero and 1.5 for body.
- Spacing scale: use 8, 16, 24, 32, 48, or 64 px only. No arbitrary values.
- Hero hierarchy: ONE headline (max 8 words), ONE supporting line (max 16 words), ONE
  primary CTA. Anything else lives below the fold.
- Section order: hero, proof (logos or quote), how-it-works (3 steps), CTA. In that order.
- Mobile breakpoint: design for 375px first, widen to desktop. CSS must include both.`;

export const ACTION_LIST_SPEC_V1 = `Action list quality spec v1:
- Use SMART action items.
- Each item needs an owner, timeline, and success measure.
- Group by who acts: you, team, external.
- Include implicit follow-ups and dependencies, not only literal asks.
- Separate safe AI-prep work from user-only external actions.
- Visual grouping: render each group (you / team / external) as a distinct section with
  a clear header. Use a priority badge per item (high / medium / low) so the reader scans
  urgency before content.`;

export function getArtifactSpec(kind: AiArtifactKind): string {
  switch (kind) {
    case "slide_deck":
      return SLIDE_DECK_SPEC_V1;
    case "website_design":
      return WEBSITE_DESIGN_SPEC_V1;
    case "action_list":
      return ACTION_LIST_SPEC_V1;
    case "document":
      return DOCUMENT_SPEC_V1;
  }
}

export function buildArtifactPlanningPrompt(requestText: string, kind: AiArtifactKind): string {
  return `Before writing anything, inspect this email or prompt and infer the real work requested.
Plan the visual shape of the deliverable up front, not as an afterthought.
For email-sourced work, always plan a reply draft as a companion output. If the email
only needs a reply, make the reply the main deliverable; otherwise make the artifact
primary and keep the reply draft as the clean response the user can review before sending.

Return JSON only:
{
  "inferredAsk": "one sentence naming the actual deliverable",
  "audience": "who will read or use it",
  "deliverableKind": "${kind}",
  "tone": "specific tone",
  "mustInclude": ["facts that must appear"],
  "mustAvoid": ["failure modes to avoid"],
  "people": ["named people or organizations"],
  "dates": ["dates, deadlines, quarters, meetings, or Date to confirm"],
  "decisions": ["decisions made or needed"],
  "actionItems": ["concrete actions and owners"],
  "replyDraftPlan": "what the response email should say, including whether it is primary or secondary",
  "planningNotes": ["3-6 notes explaining how to transform the source instead of restating it"],
  "visualPlan": {
    "deckAccent": "forest | clay | sage (slide_deck only; otherwise omit)",
    "tonePair": "executive | warm | consumer | technical",
    "perSlideLayout": [{"index": 0, "layout": "cover", "reason": "central thesis up front"}],
    "iconFamily": "line | filled | none",
    "documentRhythm": "short-medium-short | medium-medium-short | short-long-short (document only)",
    "websitePalette": ["#brand", "#accent", "#supporting"],
    "websiteFontPair": ["display-font-name", "body-font-name"]
  }
}

The visualPlan is required. Tailor it to the deliverableKind: slide_deck needs deckAccent +
perSlideLayout; document needs documentRhythm; website_design needs websitePalette +
websiteFontPair; action_list needs only tonePair. Omit fields that do not apply.

Source:
${requestText}`;
}

export function buildArtifactDraftPrompt(requestText: string, kind: AiArtifactKind, planJson: string): string {
  return `Use this plan to create the requested artifact. Do not summarize the source. Create the finished deliverable.
The plan includes a visualPlan: honor it. The deckAccent, tonePair, perSlideLayout, iconFamily,
documentRhythm, websitePalette, and websiteFontPair are part of the deliverable, not optional polish.
Visual decisions go inline with the content (slide layouts in the slides array, palette + fonts
in the website CSS, rhythm reflected in paragraph lengths).
Always write a polished email response draft in replyDraftMarkdown. It must be sendable
after human review, grounded in the source, and never claim it was already sent.
If the email only needs a response, the reply draft is the main output and the artifact
can be a concise supporting document. If the email asks for a deck, document, or website,
the artifact is primary and the reply draft briefly explains what is attached/prepared.

${getArtifactSpec(kind)}

Plan:
${planJson}

Return JSON only:
{
  "title": "artifact title",
  "summary": "short summary naming the deliverable and readiness",
  "artifactKind": "${kind}",
  "replyDraftMarkdown": "Hi Name,\\n\\nThanks for...\\n\\nNext step...\\n\\nBest,",
  "documentMarkdown": "# Title\\n...",
  "slides": [{"title":"Slide title","bullets":["bullet"],"speakerNotes":"notes","layout":"cover|bullets|two_column|quote|closing"}],
  "websiteHtml": "<main>...</main>",
  "websiteCss": "body{...}",
  "websiteSections": [{"name":"Hero","summary":"..."}],
  "finalApprovalReason": "why approval is needed before external action, or empty",
  "humanQuestion": "only if missing information blocks the work"
}

Source:
${requestText}`;
}

export function buildArtifactCritiquePrompt(kind: AiArtifactKind, planJson: string, draftJson: string): string {
  return `Critique this ${kind} draft against the plan and quality spec. Treat this as a separate AI quality-review pass. Be brutally specific. No compliments.

Flag if it restates the email, lacks named people, lacks dates, lacks decisions, has weak structure, has a generic replyDraftMarkdown, or looks like placeholder output.

ALSO critique visual quality and layout decisions, not only content:
- Did the deck pick varied layouts (cover / bullets / two_column / quote / closing) or did
  every slide become bullets?
- Are bullets within the 5-bullet, 12-word limit per slide?
- Is the accent color used on titles or sprayed across body text?
- Does the document have visual rhythm (short / medium / short paragraphs) or is it a wall of text?
- Are pull quotes surfaced for the most consequential claims?
- Did the website pick exactly 3 colors plus neutrals, or sprawl past that?
- Does the website hero stay within ONE headline, ONE supporting line, ONE CTA?
- Did the action list group by you / team / external with priority badges?
- Does replyDraftMarkdown sound like a real response to the sender, with a clear next step
  and explicit human approval before anything is sent?

Flag visual flaws in the same flaws array. The revision step will fix both content and visual issues.

${getArtifactSpec(kind)}

Plan:
${planJson}

Draft:
${draftJson}

Return JSON only:
{
  "flaws": ["3-5 concrete flaws to fix, content and visual"],
  "revisionStrategy": "how to rewrite it into a client-ready, visually-disciplined artifact"
}`;
}

export function buildArtifactRevisionPrompt(
  requestText: string,
  kind: AiArtifactKind,
  planJson: string,
  draftJson: string,
  critiqueJson: string,
  qualityFailure?: string
): string {
  const failure = qualityFailure
    ? `\nThe previous result also failed quality checks: ${qualityFailure}\nFix these failures directly.\n`
    : "";
  return `Rewrite the draft into the final artifact. Fix every critique item, content and visual.
Do not preserve weak wording or weak layout decisions.
${failure}
${getArtifactSpec(kind)}

Hard rules:
- No "What Autopilot understood", "The email mentions", "Based on the source", or meta commentary.
- Keep source-copy ratio below 30%.
- Include named people/orgs, dates or Date to confirm, and decision/action language.
- Include replyDraftMarkdown. It must be a polished response email, not the artifact pasted into an email field.
- The reply draft must never say the message was sent, will be sent automatically, or needs no user approval.
- Output must be ready for approval, not a note stub.
- Honor the visualPlan from the plan: deckAccent, perSlideLayout, documentRhythm,
  websitePalette, websiteFontPair, tonePair, iconFamily. If the critique flagged
  visual flaws, fix them in the revision.

Plan:
${planJson}

Draft:
${draftJson}

Critique:
${critiqueJson}

Return the same artifact JSON shape as the draft.

Source:
${requestText}`;
}

export function parseJsonObject<T>(value: string): T | null {
  const trimmed = value.trim().replace(/^```(?:json)?/u, "").replace(/```$/u, "").trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

export function extractRequestText(prompt: string, source: unknown): string {
  // Prefer concrete source fields if the client passed them; fall back to the raw prompt.
  if (source && typeof source === "object") {
    const record = source as Record<string, unknown>;
    const candidates = [
      typeof record.body === "string" ? record.body : "",
      typeof record.text === "string" ? record.text : "",
      typeof record.snippet === "string" ? record.snippet : "",
      typeof record.subject === "string" ? `Subject: ${record.subject}` : ""
    ];
    const joined = candidates.filter((part) => part && part.trim()).join("\n\n").trim();
    if (joined) {
      return `${prompt.trim()}\n\n${joined}`.trim();
    }
  }
  return prompt.trim();
}

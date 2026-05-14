import type { ArtifactContent, ArtifactKind } from "./artifacts.js";

export type ArtifactQualityCheck = {
  id:
    | "structure"
    | "not_source_restatement"
    | "actionable"
    | "appropriate_length"
    | "low_source_copy_ratio"
    | "research_sources"
    | "export_ready"
    | "named_email_context";
  label: string;
  passed: boolean;
  detail: string;
};

export type ArtifactQualityReport = {
  passed: boolean;
  score: number;
  copyRatio: number;
  sourceCopyRatio: number;
  exportReady: boolean;
  attempts: number;
  strictMode: boolean;
  failedReasonCodes: string[];
  approveAnywayRequired: boolean;
  checks: ArtifactQualityCheck[];
  passedChecks: ArtifactQualityCheck[];
  failedChecks: ArtifactQualityCheck[];
  summary: string;
  regeneration: "not_needed" | "regenerated" | "needs_review";
};

export type ArtifactQualityResult = ArtifactQualityReport;

export type ArtifactQualityOptions = {
  kind?: ArtifactKind;
  minWords?: number;
  maxCopyRatio?: number;
  requireSources?: boolean;
  emailToArtifact?: boolean;
  attempts?: number;
  regeneration?: ArtifactQualityReport["regeneration"];
};

const DEFAULT_MIN_WORDS = 120;
const DEFAULT_MAX_COPY_RATIO = 0.46;
const HEURISTIC_QUALITY_SCORE_CAP = 92;

export function evaluateDocumentQuality(markdown: string, sourceText: string, options: ArtifactQualityOptions = {}): ArtifactQualityResult {
  const normalizedMarkdown = normalizeWhitespace(markdown);
  const words = normalizedMarkdown.match(/\b[\w'-]{2,}\b/gu) ?? [];
  const sourceCopyRatio = calculateSourceCopyRatio(markdown, sourceText);
  const headingCount = (markdown.match(/^#{1,3}\s+\S/gmu) ?? []).length;
  const bulletCount = (markdown.match(/^\s*[-*]\s+\S/gmu) ?? []).length;
  const hasKnownBadRestatement =
    /\bwhat autopilot understood\b/iu.test(markdown) ||
    /\b(ai unavailable|offline placeholder|fallback draft)\b/iu.test(markdown) ||
    /\bautopilot prepared this document from the source email\b/iu.test(markdown) ||
    /\breview the details, ask for changes\b/iu.test(markdown);
  const sourceOnlySentence = normalizeWhitespace(sourceText).slice(0, 220);
  const repeatsSourceOpening =
    sourceOnlySentence.length > 80 && normalizeWhitespace(markdown).toLowerCase().includes(sourceOnlySentence.toLowerCase());
  const minWords = options.minWords ?? (options.emailToArtifact ? 160 : DEFAULT_MIN_WORDS);
  const maxCopyRatio = options.maxCopyRatio ?? (options.emailToArtifact ? 0.3 : DEFAULT_MAX_COPY_RATIO);

  const checks: ArtifactQualityCheck[] = [
    {
      id: "structure",
      label: "Clear deliverable structure",
      passed: options.emailToArtifact ? headingCount >= 3 : headingCount >= 3 || (headingCount >= 2 && bulletCount >= 3),
      detail: options.emailToArtifact
        ? "Email-generated documents need at least three named sections so they feel like a real deliverable."
        : "Documents need multiple named sections or a section plus concrete bullets."
    },
    {
      id: "not_source_restatement",
      label: "Not just a source restatement",
      passed: !hasKnownBadRestatement && !repeatsSourceOpening,
      detail: "The output should transform the source into useful work, not explain that it read it."
    },
    {
      id: "actionable",
      label: "Concrete recommendations or next steps",
      passed:
        /\b(recommend|next step|action plan|draft|timeline|decision|proposal|send|prepare|deliverable|approve|owner|deadline)\b/iu.test(
          normalizedMarkdown
        ),
      detail: "The work needs a usable next move, recommendation, or ready-to-review draft."
    },
    {
      id: "appropriate_length",
      label: "Appropriate length and detail",
      passed: words.length >= minWords,
      detail: `Expected at least ${minWords} words for a useful first pass.`
    },
    {
      id: "low_source_copy_ratio",
      label: "Low source-copy ratio",
      passed: sourceCopyRatio <= maxCopyRatio,
      detail: `Copied ${Math.round(sourceCopyRatio * 100)}% of source-like phrasing; target is ${Math.round(maxCopyRatio * 100)}% or less.`
    },
    {
      id: "export_ready",
      label: "Export-ready formatting",
      passed: headingCount >= 2 && normalizedMarkdown.length > 240,
      detail: "The artifact should have enough clean structure to export without feeling like a note stub."
    }
  ];

  if (options.requireSources) {
    checks.push({
      id: "research_sources",
      label: "Cited sources for research",
      passed: /\bhttps?:\/\//iu.test(markdown) || /\bSources?\b[\s\S]{0,500}\b[-*]\s+/iu.test(markdown),
      detail: "Research briefs need visible source links or a source list."
    });
  }

  if (options.emailToArtifact) {
    checks.push(createNamedEmailContextCheck(markdown));
  }

  return buildQualityReport(checks, sourceCopyRatio, options.regeneration, {
    attempts: options.attempts,
    strictMode: options.emailToArtifact
  });
}

export function evaluateArtifactQuality(content: ArtifactContent, sourceText: string, options: ArtifactQualityOptions = {}): ArtifactQualityReport {
  switch (content.kind) {
    case "document":
      return evaluateDocumentQuality(content.markdown, sourceText, { ...options, kind: "document" });
    case "slide_deck":
      return evaluateSlideDeckQuality(content, sourceText, { ...options, kind: "slide_deck", minWords: options.minWords ?? (options.emailToArtifact ? 90 : 42) });
    case "website_design":
      return evaluateWebsiteDesignQuality(content, sourceText, { ...options, kind: "website_design", minWords: options.minWords ?? (options.emailToArtifact ? 64 : 32) });
  }
}

export function getArtifactContentQualityText(content: ArtifactContent): string {
  switch (content.kind) {
    case "document":
      return content.markdown;
    case "slide_deck":
      return content.slides
        .map((slide) => [slide.title, ...slide.bullets, slide.speakerNotes ?? ""].filter(Boolean).join("\n"))
        .join("\n\n");
    case "website_design":
      return [
        content.sections.map((section) => `${section.name}: ${section.summary}`).join("\n"),
        stripHtml(content.html),
        content.css
      ]
        .filter(Boolean)
        .join("\n\n");
  }
}

export function summarizeQualityFailure(result: ArtifactQualityResult): string {
  if (result.passed) {
    return "Quality checks passed.";
  }

  return result.failedChecks.map((check) => `${check.label}: ${check.detail}`).join(" ");
}

function evaluateSlideDeckQuality(
  content: Extract<ArtifactContent, { kind: "slide_deck" }>,
  sourceText: string,
  options: ArtifactQualityOptions
): ArtifactQualityReport {
  const qualityText = getArtifactContentQualityText(content);
  const normalizedText = normalizeWhitespace(qualityText);
  const sourceCopyRatio = calculateSourceCopyRatio(qualityText, sourceText);
  const bulletCount = content.slides.reduce((total, slide) => total + slide.bullets.length, 0);
  const weakTitles = content.slides.filter((slide) => /^generated slide|^slide\s+\d+$/iu.test(slide.title.trim())).length;
  const wordCount = countWords(qualityText);
  const maxCopyRatio = options.maxCopyRatio ?? (options.emailToArtifact ? 0.3 : DEFAULT_MAX_COPY_RATIO);

  const checks: ArtifactQualityCheck[] = [
    {
      id: "structure",
      label: "Clear deck structure",
      passed: content.slides.length >= 3 && bulletCount >= 5 && weakTitles === 0,
      detail: "Decks need at least three specific slides with useful bullets, not placeholder slide titles."
    },
    {
      id: "not_source_restatement",
      label: "Not just a source restatement",
      passed: !hasRestatementLanguage(normalizedText),
      detail: "The deck should convert the source into a story, not narrate that Autopilot read it."
    },
    {
      id: "actionable",
      label: "Concrete recommendations or next steps",
      passed: hasActionLanguage(normalizedText),
      detail: "Slides need a decision, recommendation, next step, or approval path."
    },
    {
      id: "appropriate_length",
      label: "Appropriate length and detail",
      passed: wordCount >= (options.minWords ?? 42),
      detail: `Expected at least ${options.minWords ?? 42} words across titles, bullets, and notes.`
    },
    {
      id: "low_source_copy_ratio",
      label: "Low source-copy ratio",
      passed: sourceCopyRatio <= maxCopyRatio,
      detail: `Copied ${Math.round(sourceCopyRatio * 100)}% of source-like phrasing; target is ${Math.round(maxCopyRatio * 100)}% or less.`
    },
    {
      id: "export_ready",
      label: "Export-ready formatting",
      passed: content.slides.every((slide) => slide.title.trim().length >= 4 && slide.bullets.length > 0),
      detail: "Every slide needs a meaningful title and at least one bullet before PPTX export."
    }
  ];

  if (options.requireSources) {
    checks.push(createResearchSourcesCheck(qualityText));
  }

  if (options.emailToArtifact) {
    checks.push(createNamedEmailContextCheck(qualityText));
  }

  return buildQualityReport(checks, sourceCopyRatio, options.regeneration, {
    attempts: options.attempts,
    strictMode: options.emailToArtifact
  });
}

function evaluateWebsiteDesignQuality(
  content: Extract<ArtifactContent, { kind: "website_design" }>,
  sourceText: string,
  options: ArtifactQualityOptions
): ArtifactQualityReport {
  const qualityText = getArtifactContentQualityText(content);
  const normalizedText = normalizeWhitespace(qualityText);
  const sourceCopyRatio = calculateSourceCopyRatio(qualityText, sourceText);
  const sectionNames = content.sections.map((section) => section.name.trim()).filter(Boolean);
  const userFacingCopy = stripHtml(content.html);
  const maxCopyRatio = options.maxCopyRatio ?? (options.emailToArtifact ? 0.3 : DEFAULT_MAX_COPY_RATIO);

  const checks: ArtifactQualityCheck[] = [
    {
      id: "structure",
      label: "Clear website structure",
      passed:
        sectionNames.length >= (options.emailToArtifact ? 3 : 2) &&
        /<(main|section|article|header)\b/iu.test(content.html) &&
        /<h1\b/iu.test(content.html),
      detail: options.emailToArtifact
        ? "Email-generated website designs need at least three named sections plus semantic HTML with a visible headline."
        : "Website designs need named sections plus semantic HTML with a visible headline."
    },
    {
      id: "not_source_restatement",
      label: "Not just a source restatement",
      passed: !hasRestatementLanguage(normalizedText),
      detail: "The page copy should be user-facing, not a note about the source."
    },
    {
      id: "actionable",
      label: "Concrete recommendations or next steps",
      passed: /\b(button|cta|contact|start|book|join|learn|download|request|approve|next|action)\b/iu.test(normalizedText),
      detail: "Website drafts need a clear user action, CTA, or next step."
    },
    {
      id: "appropriate_length",
      label: "Appropriate length and detail",
      passed: countWords(userFacingCopy) >= (options.minWords ?? 32),
      detail: `Expected at least ${options.minWords ?? 32} words of user-facing page copy.`
    },
    {
      id: "low_source_copy_ratio",
      label: "Low source-copy ratio",
      passed: sourceCopyRatio <= maxCopyRatio,
      detail: `Copied ${Math.round(sourceCopyRatio * 100)}% of source-like phrasing; target is ${Math.round(maxCopyRatio * 100)}% or less.`
    },
    {
      id: "export_ready",
      label: "Export-ready formatting",
      passed: content.html.trim().length > 80 && content.css.includes("{") && content.css.includes("}"),
      detail: "Website exports need enough HTML and CSS to open as a usable project."
    }
  ];

  if (options.requireSources) {
    checks.push(createResearchSourcesCheck(qualityText));
  }

  if (options.emailToArtifact) {
    checks.push(createNamedEmailContextCheck(qualityText));
  }

  return buildQualityReport(checks, sourceCopyRatio, options.regeneration, {
    attempts: options.attempts,
    strictMode: options.emailToArtifact
  });
}

function buildQualityReport(
  checks: ArtifactQualityCheck[],
  sourceCopyRatio: number,
  regeneration: ArtifactQualityReport["regeneration"] = "not_needed",
  options: { attempts?: number; strictMode?: boolean } = {}
): ArtifactQualityReport {
  const passedChecks = checks.filter((check) => check.passed);
  const failedChecks = checks.filter((check) => !check.passed);
  const rawScore = Math.round((passedChecks.length / checks.length) * 100);
  const score = failedChecks.length === 0 ? Math.min(HEURISTIC_QUALITY_SCORE_CAP, rawScore) : rawScore;
  const passed = failedChecks.length === 0;
  const strictMode = Boolean(options.strictMode);
  const attempts = Number.isInteger(options.attempts) && options.attempts !== undefined ? Math.max(1, options.attempts) : 1;
  return {
    passed,
    score,
    copyRatio: sourceCopyRatio,
    sourceCopyRatio,
    exportReady: passedChecks.some((check) => check.id === "export_ready") && !failedChecks.some((check) => check.id === "export_ready"),
    attempts,
    strictMode,
    failedReasonCodes: failedChecks.map((check) => check.id),
    approveAnywayRequired: strictMode && failedChecks.length > 0,
    checks,
    passedChecks,
    failedChecks,
    summary: passed
      ? `Quality gate passed at ${score}/100. This is a heuristic readiness score, not a guarantee.`
      : `Quality needs review at ${score}/100.`,
    regeneration: passed ? regeneration : regeneration === "regenerated" ? "needs_review" : regeneration
  };
}

function createResearchSourcesCheck(markdown: string): ArtifactQualityCheck {
  return {
    id: "research_sources",
    label: "Cited sources for research",
    passed: /\bhttps?:\/\//iu.test(markdown) || /\bSources?\b[\s\S]{0,500}\b[-*]\s+/iu.test(markdown),
    detail: "Research briefs need visible source links or a source list."
  };
}

function createNamedEmailContextCheck(value: string): ArtifactQualityCheck {
  const hasPerson = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/u.test(value) || /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/iu.test(value);
  const hasDate =
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b/iu.test(value) ||
    /\bQ[1-4]\b/u.test(value) ||
    /\b(?:today|tomorrow|next week|this week|date to confirm|deadline to confirm)\b/iu.test(value) ||
    /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/u.test(value);
  const hasDecision =
    /\b(decision|decide|recommended|recommendation|approve|approval|owner|deadline|next move|next step|action item|open question|deliverable|ship|send|publish)\b/iu.test(
      value
    );

  return {
    id: "named_email_context",
    label: "Named people, dates, and decisions",
    passed: hasPerson && hasDate && hasDecision,
    detail: [
      hasPerson ? "" : "Add named people or a named organization from the source.",
      hasDate ? "" : "Add a real date, quarter, deadline, or an explicit date-to-confirm line.",
      hasDecision ? "" : "Add decisions, owners, next moves, or approval points."
    ]
      .filter(Boolean)
      .join(" ")
  };
}

function calculateSourceCopyRatio(markdown: string, sourceText: string): number {
  const outputWords = tokenizeForCopyRatio(markdown);
  const sourceWords = tokenizeForCopyRatio(sourceText);
  if (outputWords.length < 30 || sourceWords.length < 30) {
    return 0;
  }

  const sourceShingles = new Set(makeShingles(sourceWords, 6));
  const outputShingles = makeShingles(outputWords, 6);
  if (outputShingles.length === 0 || sourceShingles.size === 0) {
    return 0;
  }

  const copied = outputShingles.filter((shingle) => sourceShingles.has(shingle)).length;
  return copied / outputShingles.length;
}

function tokenizeForCopyRatio(value: string): string[] {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/https?:\/\/\S+/gu, " ")
    .replace(/[`*_>#-]/gu, " ")
    .match(/\b[\p{L}\p{N}']{3,}\b/gu) ?? [];
}

function hasRestatementLanguage(value: string): boolean {
  return (
    /\bwhat autopilot understood\b/iu.test(value) ||
    /\b(ai unavailable|offline placeholder|fallback draft)\b/iu.test(value) ||
    /\bautopilot prepared this\b/iu.test(value) ||
    /\bprepared this document from the source\b/iu.test(value) ||
    /\breview the details, ask for changes\b/iu.test(value)
  );
}

function hasActionLanguage(value: string): boolean {
  return /\b(recommend|next step|action plan|draft|timeline|decision|proposal|send|prepare|deliverable|approve|owner|deadline|cta|call to action)\b/iu.test(
    value
  );
}

function countWords(value: string): number {
  return value.match(/\b[\w'-]{2,}\b/gu)?.length ?? 0;
}

function stripHtml(value: string): string {
  return value.replace(/<script[\s\S]*?<\/script>/giu, " ").replace(/<style[\s\S]*?<\/style>/giu, " ").replace(/<[^>]+>/gu, " ");
}

function makeShingles(words: string[], size: number): string[] {
  const shingles: string[] = [];
  for (let index = 0; index <= words.length - size; index += 1) {
    shingles.push(words.slice(index, index + size).join(" "));
  }
  return shingles;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

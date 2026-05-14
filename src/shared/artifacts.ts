import type { EmailMessageSummary } from "./email.js";
import type { CodingSnapshot } from "./coding.js";
import { evaluateArtifactQuality, type ArtifactQualityReport } from "./artifactQuality.js";

export type ArtifactKind = "document" | "slide_deck" | "website_design";
export type ArtifactVisibility = "user_project" | "ai_generated" | "archived";
export type DesignProjectOrigin = "user" | "ai";
export type DesignArtifactKind =
  | ArtifactKind
  | "reply_draft"
  | "brief"
  | "memo"
  | "checklist"
  | "spreadsheet"
  | "form"
  | "asset_pack"
  | "code_handoff"
  | "export"
  | "other";
export type DesignArtifactStatus = "queued" | "generating" | "ready" | "needs_review" | "failed_recoverable";

export type ArtifactSource = {
  provider: "gmail" | "manual";
  label: string;
  messageId?: string;
  threadId?: string;
  url?: string;
  from?: string;
  fromEmail?: string;
  subject?: string;
};

export type DocumentArtifactContent = {
  kind: "document";
  markdown: string;
};

export type SlideArtifactSlide = {
  id: string;
  title: string;
  bullets: string[];
  speakerNotes?: string;
};

export type SlideDeckArtifactContent = {
  kind: "slide_deck";
  slides: SlideArtifactSlide[];
};

export type WebsiteDesignSection = {
  id: string;
  name: string;
  summary: string;
};

export type WebsiteDesignArtifactContent = {
  kind: "website_design";
  html: string;
  css: string;
  sections: WebsiteDesignSection[];
};

export type ArtifactContent = DocumentArtifactContent | SlideDeckArtifactContent | WebsiteDesignArtifactContent;

export type ArtifactVersion = {
  id: string;
  createdAt: number;
  prompt: string;
  summary: string;
  content: ArtifactContent;
};

export type Artifact = {
  id: string;
  kind: ArtifactKind;
  title: string;
  summary: string;
  emailDraftMarkdown?: string;
  source: ArtifactSource;
  visibility: ArtifactVisibility;
  pinned: boolean;
  exportedProjectPath?: string;
  versions: ArtifactVersion[];
  activeVersionId: string;
  createdAt: number;
  updatedAt: number;
};

export type DesignProject = {
  id: string;
  artifactId: string;
  origin: DesignProjectOrigin;
  title: string;
  summary: string;
  kind: ArtifactKind;
  visibility: ArtifactVisibility;
  generatedByAi: boolean;
  pinned: boolean;
  sourceLabel: string;
  updatedAt: number;
  needsReview: boolean;
  exportedProjectPath?: string;
};

export type DesignProjectRecord = {
  id: string;
  origin: DesignProjectOrigin;
  title: string;
  summary: string;
  artifactKindHint?: DesignArtifactKind;
  artifactIds: string[];
  draftIds: string[];
  status: DesignArtifactStatus;
  createdAt: number;
  updatedAt: number;
  sourceLabel: string;
};

export type ArtifactCreateInput = {
  kind: ArtifactKind;
  title: string;
  summary?: string;
  emailDraftMarkdown?: string;
  prompt?: string;
  source?: Partial<ArtifactSource>;
  visibility?: ArtifactVisibility;
  pinned?: boolean;
  content: ArtifactContent;
};

export type ArtifactUpdateInput = {
  artifactId: string;
  prompt: string;
  summary?: string;
  content: ArtifactContent;
};

export type ArtifactExportResult =
  | {
      success: true;
      artifactId: string;
      kind: ArtifactKind;
      path: string;
      exportedAt: number;
    }
  | {
      success: false;
      artifactId: string;
      kind?: ArtifactKind;
      reason: string;
    };

export type ArtifactExportToCodingResult =
  | {
      success: true;
      artifactId: string;
      kind: ArtifactKind;
      path: string;
      projectRootPath: string;
      exportedAt: number;
      codingSnapshot: CodingSnapshot;
    }
  | {
      success: false;
      artifactId: string;
      kind?: ArtifactKind;
      reason: string;
    };

export type DesignSourceContext = {
  provider: ArtifactSource["provider"];
  heading: string;
  description: string;
  meta: string[];
  url?: string;
  requirements: string[];
};

export type ArtifactExportTarget = {
  id: "docx" | "pptx" | "html_css" | "coding_project";
  label: string;
  detail: string;
  available: boolean;
  action: "export" | "to_coding";
};

export type GeneratedArtifactReview = {
  kindLabel: string;
  revisionCount: number;
  latestPrompt: string;
  approvalState: "draft" | "needs_review" | "exported";
  exportReady: boolean;
  qualityReport: ArtifactQualityReport;
  exportTargets: ArtifactExportTarget[];
  notes: string[];
};

export type DesignRecoveryState = {
  status: "retry_available" | "reconnect_required" | "recovered";
  source: "prompt" | "email" | "revision";
  prompt: string;
  messageId?: string;
  artifactId?: string;
  reason: string;
  technicalDetails?: string;
  lastAttemptAt: number;
};

export type ArtifactSourceTrail = {
  artifactId: string;
  sources: Array<{
    provider: ArtifactSource["provider"] | "web" | "drive" | "manual";
    label: string;
    url?: string;
    inspected: boolean;
    permission: "explicit" | "needs_permission";
  }>;
};

export function createArtifactSourceFromEmail(message: EmailMessageSummary): ArtifactSource {
  return {
    provider: "gmail",
    label: `${message.from} - ${message.subject}`.slice(0, 160),
    messageId: message.id,
    threadId: message.threadId,
    url: message.url,
    from: message.from,
    fromEmail: message.fromEmail,
    subject: message.subject
  };
}

export function sanitizeArtifactKind(value: unknown): ArtifactKind {
  return value === "slide_deck" || value === "website_design" ? value : "document";
}

export function sanitizeArtifacts(value: unknown): Artifact[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const artifact = sanitizeArtifact(item);
    return artifact ? [artifact] : [];
  });
}

export function sanitizeArtifact(value: unknown): Artifact | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<Artifact>;
  const kind = sanitizeArtifactKind(candidate.kind);
  const versions = Array.isArray(candidate.versions)
    ? candidate.versions.flatMap((version) => {
        const sanitizedVersion = sanitizeArtifactVersion(version, kind);
        return sanitizedVersion ? [sanitizedVersion] : [];
      })
    : [];
  if (versions.length === 0) {
    return null;
  }

  const activeVersionId =
    typeof candidate.activeVersionId === "string" && versions.some((version) => version.id === candidate.activeVersionId)
      ? candidate.activeVersionId
      : versions[versions.length - 1].id;

  return {
    id: cleanString(candidate.id, 160) || makeArtifactId(kind),
    kind,
    title: cleanString(candidate.title, 160) || defaultArtifactTitle(kind),
    summary: cleanString(candidate.summary, 360) || "Generated by Autopilot.",
    emailDraftMarkdown: cleanBlockString(candidate.emailDraftMarkdown, 24000) || undefined,
    source: sanitizeArtifactSource(candidate.source),
    visibility: sanitizeArtifactVisibility(candidate.visibility, candidate.source),
    pinned: Boolean(candidate.pinned),
    exportedProjectPath: cleanString(candidate.exportedProjectPath, 2048) || undefined,
    versions,
    activeVersionId,
    createdAt: cleanTime(candidate.createdAt),
    updatedAt: cleanTime(candidate.updatedAt)
  };
}

export function sanitizeDesignProjectRecords(value: unknown): DesignProjectRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const record = sanitizeDesignProjectRecord(item);
    return record ? [record] : [];
  });
}

export function sanitizeDesignProjectRecord(value: unknown): DesignProjectRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<DesignProjectRecord>;
  const id = cleanString(candidate.id, 160);
  const title = cleanString(candidate.title, 160);
  if (!id || !title) {
    return null;
  }

  const artifactKindHint = sanitizeDesignArtifactKind(candidate.artifactKindHint);
  const status = sanitizeDesignArtifactStatus(candidate.status);
  return {
    id,
    origin: candidate.origin === "ai" ? "ai" : "user",
    title,
    summary: cleanString(candidate.summary, 360) || "Project created in Design.",
    artifactKindHint,
    artifactIds: sanitizeIdArray(candidate.artifactIds),
    draftIds: sanitizeIdArray(candidate.draftIds),
    status,
    createdAt: cleanTime(candidate.createdAt),
    updatedAt: cleanTime(candidate.updatedAt),
    sourceLabel: cleanString(candidate.sourceLabel, 160) || "Manual prompt"
  };
}

export function getActiveArtifactVersion(artifact: Artifact): ArtifactVersion {
  return artifact.versions.find((version) => version.id === artifact.activeVersionId) ?? artifact.versions[artifact.versions.length - 1];
}

export function getArtifactTextPreview(artifact: Artifact): string {
  const version = getActiveArtifactVersion(artifact);
  switch (version.content.kind) {
    case "document":
      return version.content.markdown;
    case "slide_deck":
      return version.content.slides.map((slide) => `${slide.title}\n${slide.bullets.join("\n")}`).join("\n\n");
    case "website_design":
      return `${version.content.sections.map((section) => section.name).join(", ")}\n${version.content.html}`;
  }
}

export function buildDesignSourceContext(artifact: Artifact): DesignSourceContext {
  const version = getActiveArtifactVersion(artifact);
  const heading = artifact.source.provider === "gmail" ? "Original email" : "Original prompt";
  const description = artifact.source.subject || artifact.source.label || artifact.title;
  const meta = [
    artifact.source.from ? `From ${artifact.source.from}` : "",
    artifact.source.fromEmail ? artifact.source.fromEmail : "",
    artifact.source.threadId ? `Thread ${artifact.source.threadId}` : "",
    artifact.source.messageId ? `Message ${artifact.source.messageId}` : "",
    artifact.source.provider === "manual" ? "Manual request" : ""
  ].filter(Boolean);

  return {
    provider: artifact.source.provider,
    heading,
    description,
    meta: uniqueStrings(meta).slice(0, 4),
    url: artifact.source.url,
    requirements: buildSourceRequirements(artifact, version)
  };
}

export function getArtifactExportTargets(artifact: Artifact): ArtifactExportTarget[] {
  switch (artifact.kind) {
    case "document":
      return [
        {
          id: "docx",
          label: "Export DOCX",
          detail: "Word-compatible document",
          available: true,
          action: "export"
        }
      ];
    case "slide_deck":
      return [
        {
          id: "pptx",
          label: "Export PPTX",
          detail: "PowerPoint-compatible deck",
          available: true,
          action: "export"
        }
      ];
    case "website_design":
      return [
        {
          id: "html_css",
          label: "Export HTML/CSS",
          detail: "Static website folder",
          available: true,
          action: "export"
        },
        {
          id: "coding_project",
          label: "Send to Coding",
          detail: "Open as an editable local project",
          available: true,
          action: "to_coding"
        }
      ];
  }
}

export function buildGeneratedArtifactReview(artifact: Artifact): GeneratedArtifactReview {
  const version = getActiveArtifactVersion(artifact);
  const readiness = getArtifactReadiness(version.content);
  const qualityReport = evaluateArtifactQuality(version.content, buildArtifactQualitySourceText(artifact, version), {
    requireSources: isResearchLikeArtifact(artifact, version),
    emailToArtifact: artifact.source.provider === "gmail" || /\bFrom:\s+\S/iu.test(version.prompt)
  });
  const approvalState =
    artifact.exportedProjectPath && artifact.exportedProjectPath.trim()
      ? "exported"
      : artifact.visibility === "ai_generated"
        ? "needs_review"
        : "draft";

  return {
    kindLabel: getArtifactReviewKindLabel(artifact.kind),
    revisionCount: artifact.versions.length,
    latestPrompt: version.prompt,
    approvalState,
    exportReady: readiness.ready && qualityReport.exportReady,
    qualityReport,
    exportTargets: getArtifactExportTargets(artifact).map((target) => ({
      ...target,
      available: target.available && readiness.ready && qualityReport.exportReady
    })),
    notes: [
      readiness.summary,
      qualityReport.summary,
      ...qualityReport.failedChecks.slice(0, 2).map((check) => `${check.label}: ${check.detail}`),
      artifact.versions.length === 1 ? "One saved version." : `${artifact.versions.length} saved versions.`,
      approvalState === "needs_review" ? "Review before sending, sharing, or exporting outside Autopilot." : "",
      artifact.exportedProjectPath ? `Last sent to Coding at ${artifact.exportedProjectPath}.` : ""
    ].filter(Boolean)
  };
}

export function createDesignProjectFromArtifact(artifact: Artifact, needsReview = false, generatedByAi = artifact.visibility !== "user_project"): DesignProject {
  return {
    id: `design-project:${artifact.id}`,
    artifactId: artifact.id,
    origin: generatedByAi ? "ai" : "user",
    title: artifact.title,
    summary: artifact.summary,
    kind: artifact.kind,
    visibility: artifact.visibility,
    generatedByAi,
    pinned: artifact.pinned,
    sourceLabel: artifact.source.label,
    updatedAt: artifact.updatedAt,
    needsReview,
    exportedProjectPath: artifact.exportedProjectPath
  };
}

export function isAiDesignProject(project: Pick<DesignProject, "generatedByAi" | "visibility" | "needsReview">): boolean {
  return project.generatedByAi || project.visibility === "ai_generated" || project.visibility === "archived" || project.needsReview;
}

function sanitizeDesignArtifactKind(value: unknown): DesignArtifactKind | undefined {
  if (
    value === "document" ||
    value === "slide_deck" ||
    value === "website_design" ||
    value === "reply_draft" ||
    value === "brief" ||
    value === "memo" ||
    value === "checklist" ||
    value === "spreadsheet" ||
    value === "form" ||
    value === "asset_pack" ||
    value === "code_handoff" ||
    value === "export" ||
    value === "other"
  ) {
    return value;
  }

  return undefined;
}

function sanitizeDesignArtifactStatus(value: unknown): DesignArtifactStatus {
  return value === "generating" || value === "ready" || value === "needs_review" || value === "failed_recoverable" ? value : "queued";
}

function sanitizeIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueStrings(value.map((item) => cleanString(item, 180)).filter(Boolean)).slice(0, 80);
}

export function defaultArtifactContent(kind: ArtifactKind, title = defaultArtifactTitle(kind)): ArtifactContent {
  switch (kind) {
    case "slide_deck":
      return {
        kind,
        slides: [
          {
            id: makeId("slide"),
            title,
            bullets: ["Autopilot will build this deck from the selected context.", "Ask for a revision to shape the story."],
            speakerNotes: "Generated as a starter deck."
          }
        ]
      };
    case "website_design":
      return {
        kind,
        html: `<main class="artifact-page"><section class="hero"><p>Autopilot</p><h1>${escapeHtml(title)}</h1><span>Generated website design</span></section></main>`,
        css: ".artifact-page{min-height:100vh;padding:64px;font-family:Inter,system-ui,sans-serif;background:#fff8ed;color:#123c2b}.hero{max-width:760px}.hero p{text-transform:uppercase;letter-spacing:.08em;color:#b67349}.hero h1{font-size:64px;line-height:1;margin:0 0 16px}",
        sections: [
          {
            id: makeId("section"),
            name: "Hero",
            summary: "Opening section generated by Autopilot."
          }
        ]
      };
    case "document":
      return {
        kind,
        markdown: `# ${title}\n\nAutopilot will draft this document from the selected context.\n`
      };
  }
}

export function defaultArtifactTitle(kind: ArtifactKind): string {
  switch (kind) {
    case "slide_deck":
      return "Generated slide deck";
    case "website_design":
      return "Generated website design";
    case "document":
      return "Generated document";
  }
}

export function makeArtifactId(kind: ArtifactKind): string {
  return makeId(`artifact-${kind}`);
}

export function makeArtifactVersionId(): string {
  return makeId("version");
}

function sanitizeArtifactVersion(value: unknown, fallbackKind: ArtifactKind): ArtifactVersion | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const version = value as Partial<ArtifactVersion>;
  const content = sanitizeArtifactContent(version.content, fallbackKind);
  if (!content) {
    return null;
  }

  return {
    id: cleanString(version.id, 160) || makeArtifactVersionId(),
    createdAt: cleanTime(version.createdAt),
    prompt: cleanString(version.prompt, 2000) || "Generated by Autopilot.",
    summary: cleanString(version.summary, 360) || "Autopilot generated this version.",
    content
  };
}

function sanitizeArtifactContent(value: unknown, fallbackKind: ArtifactKind): ArtifactContent | null {
  if (!value || typeof value !== "object") {
    return defaultArtifactContent(fallbackKind);
  }

  const content = value as Partial<ArtifactContent>;
  const kind = sanitizeArtifactKind(content.kind);
  if (kind === "document") {
    const markdown = cleanBlockString((content as Partial<DocumentArtifactContent>).markdown, 50000);
    return {
      kind,
      markdown: markdown || "# Generated document\n\nNo content yet.\n"
    };
  }

  if (kind === "slide_deck") {
    const rawSlides = (content as Partial<SlideDeckArtifactContent>).slides;
    const slides = Array.isArray(rawSlides)
      ? rawSlides.flatMap((slide) => {
          if (!slide || typeof slide !== "object") {
            return [];
          }

          const candidate = slide as Partial<SlideArtifactSlide>;
          const title = cleanString(candidate.title, 180);
          if (!title) {
            return [];
          }

          const bullets = Array.isArray(candidate.bullets)
            ? candidate.bullets.map((bullet) => cleanString(bullet, 220)).filter(Boolean).slice(0, 8)
            : [];

          return [
            {
              id: cleanString(candidate.id, 120) || makeId("slide"),
              title,
              bullets: bullets.length > 0 ? bullets : ["Add supporting detail."],
              speakerNotes: cleanString(candidate.speakerNotes, 1000) || undefined
            }
          ];
        })
      : [];

    return {
      kind,
      slides:
        slides.length > 0
          ? slides.slice(0, 24)
          : [
              {
                id: makeId("slide"),
                title: "Generated slide",
                bullets: ["No content yet."]
              }
            ]
    };
  }

  const website = content as Partial<WebsiteDesignArtifactContent>;
  const sections = Array.isArray(website.sections)
    ? website.sections
        .flatMap((section) => {
          if (!section || typeof section !== "object") {
            return [];
          }

          const candidate = section as Partial<WebsiteDesignSection>;
          const name = cleanString(candidate.name, 120);
          if (!name) {
            return [];
          }

          return [
            {
              id: cleanString(candidate.id, 120) || makeId("section"),
              name,
              summary: cleanString(candidate.summary, 360) || "Generated section."
            }
          ];
        })
        .slice(0, 24)
    : [];

  const fallbackWebsite = defaultArtifactContent("website_design");
  return {
    kind,
    html: cleanBlockString(website.html, 100000) || (fallbackWebsite.kind === "website_design" ? fallbackWebsite.html : ""),
    css: cleanBlockString(website.css, 100000) || (fallbackWebsite.kind === "website_design" ? fallbackWebsite.css : ""),
    sections
  };
}

function sanitizeArtifactSource(value: unknown): ArtifactSource {
  if (!value || typeof value !== "object") {
    return {
      provider: "manual",
      label: "Manual prompt"
    };
  }

  const source = value as Partial<ArtifactSource>;
  return {
    provider: source.provider === "gmail" ? "gmail" : "manual",
    label: cleanString(source.label, 180) || "Manual prompt",
    messageId: cleanString(source.messageId, 220) || undefined,
    threadId: cleanString(source.threadId, 220) || undefined,
    url: cleanString(source.url, 2048) || undefined,
    from: cleanString(source.from, 180) || undefined,
    fromEmail: cleanString(source.fromEmail, 220) || undefined,
    subject: cleanString(source.subject, 260) || undefined
  };
}

function sanitizeArtifactVisibility(value: unknown, source: unknown): ArtifactVisibility {
  if (value === "user_project" || value === "ai_generated" || value === "archived") {
    return value;
  }

  if (source && typeof source === "object" && (source as Partial<ArtifactSource>).provider === "gmail") {
    return "ai_generated";
  }

  return "user_project";
}

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function cleanBlockString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.replace(/\r/g, "").trim().slice(0, maxLength) : "";
}

function cleanTime(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : Date.now();
}

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }

  return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
}

function buildSourceRequirements(artifact: Artifact, version: ArtifactVersion): string[] {
  const requirements = [
    artifact.source.subject ? `Respond to: ${artifact.source.subject}` : "",
    artifact.source.provider === "gmail" && artifact.source.from ? `Use context from ${artifact.source.from}.` : "",
    version.prompt ? `Instruction: ${version.prompt}` : "",
    version.summary ? `Current version: ${version.summary}` : "",
    getDeliverableRequirement(version.content),
    ...getContentRequirements(version.content)
  ];

  return uniqueStrings(requirements.map((requirement) => requirement.trim()).filter(Boolean)).slice(0, 6);
}

function buildArtifactQualitySourceText(artifact: Artifact, version: ArtifactVersion): string {
  return [
    artifact.source.label,
    artifact.source.subject,
    artifact.source.from,
    artifact.summary,
    version.prompt,
    version.summary
  ]
    .filter(Boolean)
    .join("\n");
}

function isResearchLikeArtifact(artifact: Artifact, version: ArtifactVersion): boolean {
  return /\b(research|brief|sources|market|industry|competitor|analysis|report)\b/iu.test(
    `${artifact.title} ${artifact.summary} ${version.prompt} ${version.summary}`
  );
}

function getDeliverableRequirement(content: ArtifactContent): string {
  switch (content.kind) {
    case "document":
      return "Deliverable: editable document exportable as DOCX.";
    case "slide_deck":
      return "Deliverable: editable slide deck exportable as PPTX.";
    case "website_design":
      return "Deliverable: website design exportable as HTML/CSS or Coding project.";
  }
}

function getContentRequirements(content: ArtifactContent): string[] {
  switch (content.kind) {
    case "document":
      return countWords(content.markdown) > 0 ? [`Draft length: ${countWords(content.markdown)} words.`] : [];
    case "slide_deck":
      return [`Deck structure: ${content.slides.length} slides.`];
    case "website_design":
      return content.sections.slice(0, 3).map((section) => `Section: ${section.name} - ${section.summary}`);
  }
}

function getArtifactReadiness(content: ArtifactContent): { ready: boolean; summary: string } {
  switch (content.kind) {
    case "document": {
      const wordCount = countWords(content.markdown);
      const ready = wordCount >= 24 && !content.markdown.toLowerCase().includes("autopilot will draft this document");
      return {
        ready,
        summary: ready ? `${wordCount} words with export-ready document structure.` : "Needs more original document content before export."
      };
    }
    case "slide_deck": {
      const bulletCount = content.slides.reduce((total, slide) => total + slide.bullets.length, 0);
      const ready = content.slides.length > 0 && bulletCount > 0 && !content.slides.some((slide) => slide.title.toLowerCase().includes("generated slide"));
      return {
        ready,
        summary: ready ? `${content.slides.length} slides with ${bulletCount} supporting bullets.` : "Needs stronger slide titles and bullets before export."
      };
    }
    case "website_design": {
      const ready = content.html.includes("<") && content.css.includes("{") && content.sections.length > 0;
      return {
        ready,
        summary: ready ? `${content.sections.length} named sections with HTML/CSS ready for export.` : "Needs website markup, styles, and named sections before export."
      };
    }
  }
}

function getArtifactReviewKindLabel(kind: ArtifactKind): string {
  switch (kind) {
    case "document":
      return "Document";
    case "slide_deck":
      return "Slide deck";
    case "website_design":
      return "Website design";
  }
}

function countWords(value: string): number {
  return value.split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word)).length;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(value);
  }
  return unique;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

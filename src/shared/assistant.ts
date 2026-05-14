import { isAiModelTask, type AiModelTask } from "./aiModels.js";

export type AssistantContextSourceId = "current-tab" | "selected-tabs" | "gmail" | "downloads" | "coding-project";

export type AssistantContextSource = {
  id: AssistantContextSourceId;
  label: string;
  detail: string;
  available: boolean;
  enabled: boolean;
};

export type AssistantContextItem = {
  sourceId: AssistantContextSourceId;
  title: string;
  url?: string;
  text: string;
};

export type AssistantRequest = {
  prompt: string;
  sources: AssistantContextSourceId[];
  activeTabId?: string | null;
  task?: AiModelTask;
  timeoutMs?: number;
  responseFormat?: "text" | "json_object";
};

export type DesignPromptSuggestionRequest = {
  artifactId?: string | null;
  title?: string;
  kind?: "document" | "slide_deck" | "website_design";
  summary?: string;
  contentPreview?: string;
};

export type DesignPromptTranslationRequest = {
  prompt: string;
  sourceKind?: "prompt" | "email" | "artifact";
  currentArtifactKind?: "document" | "slide_deck" | "website_design";
  sourcePreview?: string;
};

export type CodingPromptTranslationRequest = {
  prompt: string;
  projectName?: string;
  activeFilePath?: string;
  openFiles?: string[];
  sourcePreview?: string;
};

export type AssistantResponse = {
  success: boolean;
  answer: string;
  model?: string;
  sources: AssistantContextItem[];
  reason?: string;
};

const ASSISTANT_PROMPT_MAX_LENGTH = 20_000;

export type DesignPromptSuggestionResponse = {
  success: boolean;
  suggestions: string[];
  model?: string;
  reason?: string;
};

export type DesignPromptTranslationResponse = {
  success: boolean;
  refinedPrompt: string;
  inferredArtifactKind?: "document" | "slide_deck" | "website_design";
  followUpQuestion?: string;
  options: string[];
  model?: string;
  reason?: string;
};

export type CodingPromptTranslationResponse = {
  success: boolean;
  refinedPrompt: string;
  implementationIntent?: string;
  targetFiles: string[];
  followUpQuestion?: string;
  options: string[];
  model?: string;
  reason?: string;
};

export const DEFAULT_ASSISTANT_CONTEXT_SOURCES: AssistantContextSource[] = [
  {
    id: "current-tab",
    label: "Current tab",
    detail: "Share the visible page text from the active browser tab.",
    available: true,
    enabled: true
  },
  {
    id: "selected-tabs",
    label: "Open tabs",
    detail: "Share titles and URLs from the current browser workspace.",
    available: true,
    enabled: false
  },
  {
    id: "gmail",
    label: "Gmail inbox",
    detail: "Share cached Gmail subject lines, senders, and snippets.",
    available: false,
    enabled: false
  },
  {
    id: "downloads",
    label: "Downloads",
    detail: "Share recent download names, URLs, and statuses.",
    available: true,
    enabled: false
  },
  {
    id: "coding-project",
    label: "Coding project",
    detail: "Share the active coding project, access mode, and file tree summary.",
    available: false,
    enabled: false
  }
];

export function sanitizeAssistantRequest(value: unknown): AssistantRequest {
  if (!value || typeof value !== "object") {
    return {
      prompt: "",
      sources: ["current-tab"]
    };
  }

  const request = value as Partial<AssistantRequest>;
  const sources = Array.isArray(request.sources)
    ? request.sources.filter(isAssistantContextSourceId)
    : DEFAULT_ASSISTANT_CONTEXT_SOURCES.filter((source) => source.enabled).map((source) => source.id);

  const sanitized: AssistantRequest = {
    prompt: typeof request.prompt === "string" ? cleanAssistantPrompt(request.prompt) : "",
    sources: sources.length > 0 ? [...new Set(sources)] : ["current-tab"],
    activeTabId: typeof request.activeTabId === "string" ? request.activeTabId : null
  };
  if (isAiModelTask(request.task)) {
    sanitized.task = request.task;
  }
  if (Number.isInteger(request.timeoutMs) && request.timeoutMs !== undefined && request.timeoutMs >= 5_000 && request.timeoutMs <= 120_000) {
    sanitized.timeoutMs = request.timeoutMs;
  }
  if (request.responseFormat === "json_object") {
    sanitized.responseFormat = "json_object";
  }
  return sanitized;
}

export function summarizeAssistantSources(items: AssistantContextItem[]): string {
  if (items.length === 0) {
    return "No sources shared.";
  }

  return items.map((item) => `${item.title} (${item.sourceId})`).join(", ");
}

export function sanitizeDesignPromptSuggestionRequest(value: unknown): DesignPromptSuggestionRequest {
  if (!value || typeof value !== "object") {
    return {};
  }

  const request = value as Partial<DesignPromptSuggestionRequest>;
  return {
    artifactId: cleanOptionalString(request.artifactId, 160),
    title: cleanOptionalString(request.title, 180),
    kind: request.kind === "document" || request.kind === "slide_deck" || request.kind === "website_design" ? request.kind : undefined,
    summary: cleanOptionalString(request.summary, 500),
    contentPreview: cleanOptionalString(request.contentPreview, 4000)
  };
}

export function sanitizeDesignPromptTranslationRequest(value: unknown): DesignPromptTranslationRequest {
  if (!value || typeof value !== "object") {
    return { prompt: "" };
  }

  const request = value as Partial<DesignPromptTranslationRequest>;
  const currentArtifactKind =
    request.currentArtifactKind === "document" || request.currentArtifactKind === "slide_deck" || request.currentArtifactKind === "website_design"
      ? request.currentArtifactKind
      : undefined;
  const sourceKind = request.sourceKind === "email" || request.sourceKind === "artifact" || request.sourceKind === "prompt" ? request.sourceKind : "prompt";
  return {
    prompt: typeof request.prompt === "string" ? cleanAssistantPrompt(request.prompt) : "",
    sourceKind,
    currentArtifactKind,
    sourcePreview: cleanOptionalString(request.sourcePreview, 4000)
  };
}

export function sanitizeCodingPromptTranslationRequest(value: unknown): CodingPromptTranslationRequest {
  if (!value || typeof value !== "object") {
    return { prompt: "" };
  }

  const request = value as Partial<CodingPromptTranslationRequest>;
  const openFiles = Array.isArray(request.openFiles)
    ? request.openFiles.map((filePath) => cleanOptionalString(filePath, 260)).filter((filePath): filePath is string => Boolean(filePath)).slice(0, 12)
    : undefined;

  return {
    prompt: typeof request.prompt === "string" ? cleanAssistantPrompt(request.prompt) : "",
    projectName: cleanOptionalString(request.projectName, 180),
    activeFilePath: cleanOptionalString(request.activeFilePath, 260),
    openFiles,
    sourcePreview: cleanOptionalString(request.sourcePreview, 4000)
  };
}

function isAssistantContextSourceId(value: unknown): value is AssistantContextSourceId {
  return value === "current-tab" || value === "selected-tabs" || value === "gmail" || value === "downloads" || value === "coding-project";
}

function cleanAssistantPrompt(value: string): string {
  return value
    .replace(/\r\n?/gu, "\n")
    .replace(/\u00a0/gu, " ")
    .replace(/\n{4,}/gu, "\n\n\n")
    .trim()
    .slice(0, ASSISTANT_PROMPT_MAX_LENGTH);
}

function cleanOptionalString(value: unknown, maxLength: number): string | undefined {
  const cleaned = typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
  return cleaned || undefined;
}

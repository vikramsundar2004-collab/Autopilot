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
};

export type DesignPromptSuggestionRequest = {
  artifactId?: string | null;
  title?: string;
  kind?: "document" | "slide_deck" | "website_design";
  summary?: string;
  contentPreview?: string;
};

export type AssistantResponse = {
  success: boolean;
  answer: string;
  model?: string;
  sources: AssistantContextItem[];
  reason?: string;
};

export type DesignPromptSuggestionResponse = {
  success: boolean;
  suggestions: string[];
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

  return {
    prompt: typeof request.prompt === "string" ? request.prompt.replace(/\s+/g, " ").trim().slice(0, 4000) : "",
    sources: sources.length > 0 ? [...new Set(sources)] : ["current-tab"],
    activeTabId: typeof request.activeTabId === "string" ? request.activeTabId : null
  };
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

function isAssistantContextSourceId(value: unknown): value is AssistantContextSourceId {
  return value === "current-tab" || value === "selected-tabs" || value === "gmail" || value === "downloads" || value === "coding-project";
}

function cleanOptionalString(value: unknown, maxLength: number): string | undefined {
  const cleaned = typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
  return cleaned || undefined;
}

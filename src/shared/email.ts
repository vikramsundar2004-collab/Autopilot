export type EmailProviderId = "gmail";

export const GOOGLE_GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const GOOGLE_CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
export const GOOGLE_SYNC_SCOPE = `${GOOGLE_GMAIL_READONLY_SCOPE} ${GOOGLE_CALENDAR_READONLY_SCOPE}`;
export const DEFAULT_GMAIL_MAX_RESULTS = 200;
export const MIN_GMAIL_MAX_RESULTS = 25;
export const MAX_GMAIL_MAX_RESULTS = 500;
export const EMAIL_ACTION_ANALYSIS_CANDIDATE_LIMIT = 16;

export type GoogleConnectionCapabilities = {
  gmail: boolean;
  calendar: boolean;
};

export type EmailConnectionStatus = {
  provider: EmailProviderId;
  configured: boolean;
  connected: boolean;
  accountEmail: string | null;
  grantedScopes?: string[];
  capabilities?: GoogleConnectionCapabilities;
  reason?: string;
  updatedAt?: number;
};

export type EmailMessageSummary = {
  id: string;
  provider: EmailProviderId;
  threadId: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  actionText?: string;
  receivedAt: number;
  unread: boolean;
  url: string;
};

export type EmailConnectResult = {
  success: boolean;
  status: EmailConnectionStatus;
  messages?: EmailMessageSummary[];
  reason?: string;
};

export type EmailSyncResult = {
  success: boolean;
  status: EmailConnectionStatus;
  messages: EmailMessageSummary[];
  reason?: string;
};

export type EmailRecommendedAssistant = "productivity" | "design" | "coding" | "automation";

export type EmailRequestedOutput =
  | "reply"
  | "document"
  | "slide_deck"
  | "website_design"
  | "code_change"
  | "research_brief"
  | "scheduling"
  | "task";

export type EmailActionSuggestion = {
  title: string;
  context: string;
  sourceMessageId?: string;
  priority?: "high" | "medium" | "low";
  summary?: string;
  confidence?: number;
  recommendedAssistant?: EmailRecommendedAssistant;
  requestedOutput?: EmailRequestedOutput;
  reason?: string;
  draftSuggested?: boolean;
};

export type EmailActionAnalysisResult = {
  success: boolean;
  configured: boolean;
  actions: EmailActionSuggestion[];
  model?: string;
  reason?: string;
};

export function parseEmailSender(value: string): { name: string; email: string } {
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:"?([^"<]+)"?\s*)?<([^>]+)>$/);
  if (!match) {
    return {
      name: trimmed || "Unknown sender",
      email: ""
    };
  }

  const name = match[1]?.trim() || match[2].trim();
  return {
    name,
    email: match[2].trim()
  };
}

export function getGrantedGoogleScopes(value: string | string[] | null | undefined): string[] {
  const rawScopes = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\s+/) : [];
  return [...new Set(rawScopes.map((scope) => scope.trim()).filter(Boolean))].sort();
}

export function getGoogleConnectionCapabilities(value: string | string[] | null | undefined): GoogleConnectionCapabilities {
  const grantedScopes = new Set(getGrantedGoogleScopes(value));
  return {
    gmail: grantedScopes.has(GOOGLE_GMAIL_READONLY_SCOPE) || grantedScopes.has("https://mail.google.com/"),
    calendar: grantedScopes.has(GOOGLE_CALENDAR_READONLY_SCOPE)
  };
}

export function getGmailMaxResults(value: string | number | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed)) {
    return DEFAULT_GMAIL_MAX_RESULTS;
  }

  return Math.max(MIN_GMAIL_MAX_RESULTS, Math.min(MAX_GMAIL_MAX_RESULTS, parsed));
}

export function getEmailActionAnalysisCandidates(
  messages: EmailMessageSummary[],
  limit = EMAIL_ACTION_ANALYSIS_CANDIDATE_LIMIT
): EmailMessageSummary[] {
  return [...messages]
    .map((message) => ({ message, score: scoreEmailForActionAnalysis(message) }))
    .sort((left, right) => right.score - left.score || right.message.receivedAt - left.message.receivedAt)
    .slice(0, Math.max(0, limit))
    .map(({ message }) => message);
}

function scoreEmailForActionAnalysis(message: EmailMessageSummary): number {
  const text = `${message.from} ${message.fromEmail} ${message.subject} ${message.snippet} ${message.actionText ?? ""}`.toLowerCase();
  let score = 0;

  if (message.unread) {
    score += 12;
  }
  if (/\b(urgent|asap|today|tomorrow|deadline|due|overdue|action required|needs action|please|can you|could you|follow up|reply|respond|confirm|approve|review|schedule|meeting|interview|assignment|homework|failed|failure|blocked|error)\b/u.test(text)) {
    score += 34;
  }
  if (/\b(slide|deck|presentation|document|report|proposal|resume|website|design|code|repo|github|pull request|build|deploy|debug)\b/u.test(text)) {
    score += 24;
  }
  if (/\?/.test(message.subject) || /\b(question|request|ask)\b/u.test(text)) {
    score += 10;
  }
  if (/\b(no-?reply|newsletter|unsubscribe|promotion|sale|discount|receipt|invoice paid|digest|weekly update|marketing|advertisement)\b/u.test(text)) {
    score -= 22;
  }
  if (/\b(github|gitlab|workflow|ci|build|test|failed|failure|security alert|password reset)\b/u.test(text)) {
    score += 12;
  }

  const ageHours = Math.max(0, (Date.now() - message.receivedAt) / (60 * 60 * 1000));
  score += Math.max(0, 18 - Math.floor(ageHours / 12));
  return score;
}

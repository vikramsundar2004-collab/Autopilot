export type EmailProviderId = "gmail";

export const GOOGLE_GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const GOOGLE_GMAIL_MODIFY_SCOPE = "https://www.googleapis.com/auth/gmail.modify";
export const GOOGLE_GMAIL_COMPOSE_SCOPE = "https://www.googleapis.com/auth/gmail.compose";
export const GOOGLE_GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
export const GOOGLE_CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
export const GOOGLE_CALENDAR_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events";
export const GOOGLE_DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
export const GOOGLE_DOCS_READONLY_SCOPE = "https://www.googleapis.com/auth/documents.readonly";
export const GOOGLE_SLIDES_READONLY_SCOPE = "https://www.googleapis.com/auth/presentations.readonly";
export const GOOGLE_FORMS_READONLY_SCOPE = "https://www.googleapis.com/auth/forms.body.readonly";
export const GOOGLE_SYNC_SCOPE = [
  GOOGLE_GMAIL_READONLY_SCOPE,
  GOOGLE_GMAIL_MODIFY_SCOPE,
  GOOGLE_GMAIL_COMPOSE_SCOPE,
  GOOGLE_CALENDAR_READONLY_SCOPE,
  GOOGLE_CALENDAR_EVENTS_SCOPE,
  GOOGLE_DRIVE_READONLY_SCOPE
].join(" ");
export const DEFAULT_GMAIL_MAX_RESULTS = 200;
export const MIN_GMAIL_MAX_RESULTS = 25;
export const MAX_GMAIL_MAX_RESULTS = 500;
export const EMAIL_ACTION_ANALYSIS_CANDIDATE_LIMIT = 16;

export type GoogleConnectionCapabilities = {
  gmail: boolean;
  calendar: boolean;
  gmailRead: boolean;
  gmailModify: boolean;
  gmailDrafts: boolean;
  gmailSend: boolean;
  calendarRead: boolean;
  calendarWrite: boolean;
  driveRead: boolean;
  docsRead: boolean;
  slidesRead: boolean;
  formsRead: boolean;
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

export type ReplyWorthinessDecision = {
  status: "reply_worthy" | "artifact_required" | "skip";
  reason: string;
  requestedOutput?: EmailRequestedOutput;
  recommendedAssistant?: EmailRecommendedAssistant;
};

export function classifyEmailReplyWorthiness(message: EmailMessageSummary, context = ""): ReplyWorthinessDecision {
  const text = `${message.from} ${message.fromEmail} ${message.subject} ${message.snippet} ${message.actionText ?? ""} ${context}`.toLowerCase();

  if (
    /\b(newsletter|unsubscribe|promotion|sale|discount|receipt|invoice paid|payment received|digest|weekly update|marketing|advertisement|verification code|verify your email|one-time code|otp|security code|login code|no-?reply)\b/u.test(
      text
    ) &&
    !/\b(please|can you|could you|reply|respond|review|approve|schedule|failed|failure|urgent|deadline|due|action required|question|\?)\b/u.test(text)
  ) {
    return {
      status: "skip",
      reason: "Low-value automated mail; no draft or artifact spend."
    };
  }

  if (/\b(slide|slides|deck|presentation|pitch)\b/u.test(text)) {
    return {
      status: "artifact_required",
      reason: "This explicitly asks for a presentation artifact.",
      requestedOutput: "slide_deck",
      recommendedAssistant: "design"
    };
  }

  if (/\b(code|repo|github|pull request|bug|build failed|failing build|test failed|debug|deploy|api|workflow|ci)\b/u.test(text)) {
    return {
      status: "artifact_required",
      reason: "This asks for coding work, so route it to Coding instead of making a generic draft.",
      requestedOutput: "code_change",
      recommendedAssistant: "coding"
    };
  }

  if (/\b(website|landing page|homepage|mockup|figma|design a page|web page)\b/u.test(text)) {
    return {
      status: "artifact_required",
      reason: "This explicitly asks for a website or visual design artifact.",
      requestedOutput: "website_design",
      recommendedAssistant: "design"
    };
  }

  if (/\b(document|doc|report|proposal|memo|brief|write up|write-up|summary packet|client brief|project brief)\b/u.test(text)) {
    return {
      status: "artifact_required",
      reason: "This explicitly asks for a written artifact.",
      requestedOutput: "document",
      recommendedAssistant: "design"
    };
  }

  if (/\b(reply|respond|follow up|follow-up|please|can you|could you|available|availability|schedule|confirm|approve|review|question|\?)\b/u.test(text)) {
    return {
      status: "reply_worthy",
      reason: "This looks like a real response or follow-up request.",
      requestedOutput: "reply",
      recommendedAssistant: "productivity"
    };
  }

  return {
    status: "skip",
    reason: "No clear user response, deliverable, or scheduling action was detected."
  };
}

export type EmailSenderSummary = {
  name: string;
  email: string;
  count: number;
  lastReceivedAt: number;
};

export function normalizeEmailSenderAddress(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return "";
  }

  const bracketed = trimmed.match(/<([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)>/u)?.[1];
  const direct = trimmed.match(/[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+/u)?.[0];
  return (bracketed ?? direct ?? trimmed).replace(/^mailto:/u, "").replace(/[),;]+$/u, "");
}

export function isEmailBlockedBySender(message: EmailMessageSummary, blockedSenders: readonly string[]): boolean {
  if (blockedSenders.length === 0) {
    return false;
  }

  const blocked = new Set(blockedSenders.map(normalizeEmailSenderAddress).filter(Boolean));
  const senderEmail = normalizeEmailSenderAddress(message.fromEmail || message.from);
  const senderName = message.from.trim().toLowerCase();
  return Boolean((senderEmail && blocked.has(senderEmail)) || (senderName && blocked.has(senderName)));
}

export function filterBlockedEmailMessages(messages: EmailMessageSummary[], blockedSenders: readonly string[]): EmailMessageSummary[] {
  return messages.filter((message) => !isEmailBlockedBySender(message, blockedSenders));
}

export function listEmailSenders(messages: EmailMessageSummary[]): EmailSenderSummary[] {
  const senders = new Map<string, EmailSenderSummary>();

  for (const message of messages) {
    const email = normalizeEmailSenderAddress(message.fromEmail || message.from);
    if (!email) {
      continue;
    }

    const existing = senders.get(email);
    if (existing) {
      existing.count += 1;
      existing.lastReceivedAt = Math.max(existing.lastReceivedAt, message.receivedAt);
      if (!existing.name && message.from) {
        existing.name = message.from;
      }
      continue;
    }

    senders.set(email, {
      name: message.from || email,
      email,
      count: 1,
      lastReceivedAt: message.receivedAt
    });
  }

  return [...senders.values()].sort((left, right) => right.lastReceivedAt - left.lastReceivedAt || right.count - left.count || left.email.localeCompare(right.email));
}

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

export type EmailActionPermission = "read_only" | "organize_with_user_command" | "draft_locally" | "requires_send_confirmation";

export type EmailOrganizationMode = "off" | "suggest_only" | "approve_batches" | "trusted_rules";

export const EMAIL_ORGANIZATION_MODE_OPTIONS: Array<{
  id: EmailOrganizationMode;
  label: string;
  description: string;
}> = [
  {
    id: "off",
    label: "Off",
    description: "Do not ask AI to suggest mailbox organization."
  },
  {
    id: "suggest_only",
    label: "Suggest only",
    description: "AI can recommend labels and cleanup, but Gmail is unchanged until you act."
  },
  {
    id: "approve_batches",
    label: "Approve batches",
    description: "AI prepares batches that you review and apply with one explicit command."
  },
  {
    id: "trusted_rules",
    label: "Trusted rules",
    description: "Only user-created safe rules may organize matching email automatically."
  }
];

export function normalizeEmailOrganizationMode(value: unknown): EmailOrganizationMode {
  return value === "off" || value === "approve_batches" || value === "trusted_rules" ? value : "suggest_only";
}

export type EmailOrganizationAction = {
  kind: "archive" | "label" | "unlabel" | "mark_read" | "mark_unread" | "star" | "unstar" | "snooze" | "move";
  messageId: string;
  label?: string;
  snoozeUntil?: number;
  requiresUserCommand: true;
};

export function sanitizeEmailOrganizationActions(value: unknown): EmailOrganizationAction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const actions: EmailOrganizationAction[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const action = item as Partial<EmailOrganizationAction>;
    if (
      action.kind !== "archive" &&
      action.kind !== "label" &&
      action.kind !== "unlabel" &&
      action.kind !== "mark_read" &&
      action.kind !== "mark_unread" &&
      action.kind !== "star" &&
      action.kind !== "unstar" &&
      action.kind !== "snooze" &&
      action.kind !== "move"
    ) {
      continue;
    }

    const messageId = typeof action.messageId === "string" ? action.messageId.trim() : "";
    if (!messageId || action.requiresUserCommand !== true) {
      continue;
    }

    actions.push({
      kind: action.kind,
      messageId,
      label: typeof action.label === "string" ? action.label.replace(/\s+/g, " ").trim().slice(0, 80) : undefined,
      snoozeUntil: typeof action.snoozeUntil === "number" && Number.isFinite(action.snoozeUntil) ? action.snoozeUntil : undefined,
      requiresUserCommand: true
    });
  }

  return actions;
}

export type GmailLabelPlan = {
  id: string;
  labelName: string;
  reason: string;
  affectedMessageIds: string[];
  confidence: number;
  requiresApproval: true;
};

export type GmailOrganizationBatch = {
  id: string;
  plans: GmailLabelPlan[];
  actions: EmailOrganizationAction[];
  createdAt: number;
  approvedAt?: number;
  appliedAt?: number;
};

export type GmailOrganizationResult = {
  success: boolean;
  appliedCount: number;
  skippedCount: number;
  reason?: string;
  details: Array<{
    messageId: string;
    action: EmailOrganizationAction["kind"];
    success: boolean;
    reason?: string;
  }>;
};

export type EmailDraftQualityReport = {
  score: number;
  passed: boolean;
  checks: Array<{
    id: string;
    label: string;
    passed: boolean;
    detail: string;
  }>;
  sendReady: boolean;
  failedReasonCodes: string[];
  summary: string;
};

export type DraftSendApproval = {
  draftId: string;
  sourceMessageId?: string;
  approvedByUserAt: number;
  approvalText: string;
  qualityReport: EmailDraftQualityReport;
};

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
  permission?: EmailActionPermission;
  organizationActions?: EmailOrganizationAction[];
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
  const gmailAll = grantedScopes.has("https://mail.google.com/");
  const gmailRead = gmailAll || grantedScopes.has(GOOGLE_GMAIL_READONLY_SCOPE) || grantedScopes.has(GOOGLE_GMAIL_MODIFY_SCOPE);
  const gmailModify = gmailAll || grantedScopes.has(GOOGLE_GMAIL_MODIFY_SCOPE);
  const gmailDrafts = gmailAll || grantedScopes.has(GOOGLE_GMAIL_COMPOSE_SCOPE) || grantedScopes.has(GOOGLE_GMAIL_MODIFY_SCOPE);
  const gmailSend = gmailAll || grantedScopes.has(GOOGLE_GMAIL_SEND_SCOPE);
  const calendarRead = grantedScopes.has(GOOGLE_CALENDAR_READONLY_SCOPE) || grantedScopes.has(GOOGLE_CALENDAR_EVENTS_SCOPE);
  const calendarWrite = grantedScopes.has(GOOGLE_CALENDAR_EVENTS_SCOPE);
  const driveRead = grantedScopes.has(GOOGLE_DRIVE_READONLY_SCOPE);
  return {
    gmail: gmailRead,
    calendar: calendarRead,
    gmailRead,
    gmailModify,
    gmailDrafts,
    gmailSend,
    calendarRead,
    calendarWrite,
    driveRead,
    docsRead: driveRead || grantedScopes.has(GOOGLE_DOCS_READONLY_SCOPE),
    slidesRead: driveRead || grantedScopes.has(GOOGLE_SLIDES_READONLY_SCOPE),
    formsRead: driveRead || grantedScopes.has(GOOGLE_FORMS_READONLY_SCOPE)
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

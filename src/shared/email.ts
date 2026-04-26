export type EmailProviderId = "gmail";

export type EmailConnectionStatus = {
  provider: EmailProviderId;
  configured: boolean;
  connected: boolean;
  accountEmail: string | null;
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

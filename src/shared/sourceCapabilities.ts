export type ProductivitySourceCategory =
  | "gmail"
  | "calendar"
  | "drive_docs_slides_forms"
  | "slack"
  | "outlook"
  | "onedrive"
  | "browser_tabs"
  | "downloads"
  | "local_files"
  | "github"
  | "website_accounts";

export type ProductivitySourceCapability = {
  id: ProductivitySourceCategory;
  label: string;
  description: string;
  defaultEnabled: boolean;
  requiresUserConsent: boolean;
  requiresConnector: boolean;
  canCreateWorkItems: boolean;
  canUsePasswordManager: boolean;
  sendsRawSecretsToAi: false;
  disabledReason?: string;
};

export const PRODUCTIVITY_SOURCE_CAPABILITIES: ProductivitySourceCapability[] = [
  {
    id: "gmail",
    label: "Gmail",
    description: "Read inbox messages, draft replies, and organize labels after approval.",
    defaultEnabled: true,
    requiresUserConsent: true,
    requiresConnector: true,
    canCreateWorkItems: true,
    canUsePasswordManager: false,
    sendsRawSecretsToAi: false
  },
  {
    id: "calendar",
    label: "Google Calendar",
    description: "Read commitments and write approved event changes back to Google Calendar.",
    defaultEnabled: true,
    requiresUserConsent: true,
    requiresConnector: true,
    canCreateWorkItems: true,
    canUsePasswordManager: false,
    sendsRawSecretsToAi: false
  },
  {
    id: "drive_docs_slides_forms",
    label: "Drive, Docs, Slides, and Forms",
    description: "Use granted Google files as source context for artifacts and prep.",
    defaultEnabled: false,
    requiresUserConsent: true,
    requiresConnector: true,
    canCreateWorkItems: true,
    canUsePasswordManager: false,
    sendsRawSecretsToAi: false
  },
  {
    id: "slack",
    label: "Slack",
    description: "Turn mentions, decisions, and requests into reviewable work suggestions.",
    defaultEnabled: false,
    requiresUserConsent: true,
    requiresConnector: true,
    canCreateWorkItems: true,
    canUsePasswordManager: false,
    sendsRawSecretsToAi: false
  },
  {
    id: "outlook",
    label: "Outlook",
    description: "Rank Microsoft mail and calendar signals when Microsoft auth is configured.",
    defaultEnabled: false,
    requiresUserConsent: true,
    requiresConnector: true,
    canCreateWorkItems: true,
    canUsePasswordManager: false,
    sendsRawSecretsToAi: false,
    disabledReason: "Connect Microsoft before enabling Outlook sources."
  },
  {
    id: "onedrive",
    label: "OneDrive",
    description: "Use Microsoft files as approved source context after Microsoft auth.",
    defaultEnabled: false,
    requiresUserConsent: true,
    requiresConnector: true,
    canCreateWorkItems: true,
    canUsePasswordManager: false,
    sendsRawSecretsToAi: false,
    disabledReason: "Connect Microsoft before enabling OneDrive sources."
  },
  {
    id: "browser_tabs",
    label: "Browser tabs",
    description: "Read active tab text and safe page state for assistant and work routing.",
    defaultEnabled: true,
    requiresUserConsent: false,
    requiresConnector: false,
    canCreateWorkItems: true,
    canUsePasswordManager: false,
    sendsRawSecretsToAi: false
  },
  {
    id: "downloads",
    label: "Downloads",
    description: "Use downloaded files as local context when the user selects them.",
    defaultEnabled: false,
    requiresUserConsent: true,
    requiresConnector: false,
    canCreateWorkItems: true,
    canUsePasswordManager: false,
    sendsRawSecretsToAi: false
  },
  {
    id: "local_files",
    label: "Local files",
    description: "Use selected local folders and files for Coding, Design, and research tasks.",
    defaultEnabled: false,
    requiresUserConsent: true,
    requiresConnector: false,
    canCreateWorkItems: true,
    canUsePasswordManager: false,
    sendsRawSecretsToAi: false
  },
  {
    id: "github",
    label: "GitHub",
    description: "Route repository failures, pull requests, and issues to Coding.",
    defaultEnabled: false,
    requiresUserConsent: true,
    requiresConnector: true,
    canCreateWorkItems: true,
    canUsePasswordManager: false,
    sendsRawSecretsToAi: false
  },
  {
    id: "website_accounts",
    label: "Website accounts",
    description: "Opt-in browser automation can inspect signed-in websites without exposing saved passwords to AI.",
    defaultEnabled: false,
    requiresUserConsent: true,
    requiresConnector: false,
    canCreateWorkItems: true,
    canUsePasswordManager: true,
    sendsRawSecretsToAi: false,
    disabledReason: "Enable explicitly in Settings. Raw saved passwords are never sent to AI."
  }
];

export function listProductivitySourceCapabilities(): ProductivitySourceCapability[] {
  return PRODUCTIVITY_SOURCE_CAPABILITIES.map((capability) => ({ ...capability }));
}

export type ButtonDisabledReason =
  | "requires_account"
  | "requires_connection"
  | "requires_selection"
  | "requires_active_project"
  | "requires_active_artifact"
  | "requires_approval"
  | "requires_verified_invoice_candidate"
  | "requires_input"
  | "not_supported_in_preview"
  | "not_enabled"
  | "coming_after_setup";

export type ButtonActionContract = {
  id: string;
  workspace: "home" | "browser" | "productivity" | "coding" | "design" | "automation" | "settings";
  label: string;
  action:
    | "navigate"
    | "open_panel"
    | "open_modal"
    | "run_ipc"
    | "save_local"
    | "sync_source"
    | "generate_ai"
    | "export"
    | "share"
    | "approve"
    | "reject"
    | "undo";
  async?: boolean;
  hasLoadingState?: boolean;
  hasFeedback?: boolean;
  disabledReason?: ButtonDisabledReason;
  accessibleLabel: string;
};

export type ButtonContractIssue = {
  id: string;
  issue: string;
};

export const WORKSPACE_BUTTON_CONTRACTS: ButtonActionContract[] = [
  {
    id: "work-graph-review-work",
    workspace: "home",
    label: "Review Work",
    action: "open_panel",
    disabledReason: "requires_selection",
    accessibleLabel: "Review the selected Work Twin item"
  },
  {
    id: "work-graph-start-safe-work",
    workspace: "home",
    label: "Start safe work",
    action: "run_ipc",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_selection",
    accessibleLabel: "Start safe Shadow Mode work for the selected item"
  },
  {
    id: "work-graph-show-proof",
    workspace: "home",
    label: "Show proof",
    action: "open_panel",
    disabledReason: "requires_selection",
    accessibleLabel: "Show the source trail, run log, quality checks, and route reason"
  },
  {
    id: "work-graph-approve",
    workspace: "home",
    label: "Approve",
    action: "approve",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_approval",
    accessibleLabel: "Approve the selected Work Twin item"
  },
  {
    id: "work-graph-reject",
    workspace: "home",
    label: "Reject",
    action: "reject",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_selection",
    accessibleLabel: "Reject the selected Work Twin item"
  },
  {
    id: "work-graph-revise",
    workspace: "home",
    label: "Revise",
    action: "generate_ai",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_active_artifact",
    accessibleLabel: "Revise the selected Work Twin output"
  },
  {
    id: "work-graph-assign",
    workspace: "home",
    label: "Assign",
    action: "open_modal",
    disabledReason: "requires_selection",
    accessibleLabel: "Assign the selected Work Twin item to a workspace"
  },
  {
    id: "work-graph-make-rule",
    workspace: "home",
    label: "Make Rule",
    action: "run_ipc",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_selection",
    accessibleLabel: "Create a Shadow Mode rule from the selected Work Twin item"
  },
  {
    id: "work-graph-undo",
    workspace: "home",
    label: "Undo",
    action: "undo",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_selection",
    accessibleLabel: "Undo the supported local or source action"
  },
  {
    id: "work-graph-open-original",
    workspace: "home",
    label: "Open Original",
    action: "navigate",
    disabledReason: "requires_selection",
    accessibleLabel: "Open the original source for the selected Work Twin item"
  },
  {
    id: "home-review-top-work",
    workspace: "home",
    label: "Review Work",
    action: "open_panel",
    disabledReason: "requires_selection",
    accessibleLabel: "Review the highest-priority Home Work Twin item"
  },
  {
    id: "home-start-safe-work",
    workspace: "home",
    label: "Start safe work",
    action: "run_ipc",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_selection",
    accessibleLabel: "Start safe Shadow Mode work from Home"
  },
  {
    id: "home-open-productivity",
    workspace: "home",
    label: "Open Productivity",
    action: "navigate",
    accessibleLabel: "Open the Productivity command center from Home"
  },
  {
    id: "home-open-design",
    workspace: "home",
    label: "Open Design",
    action: "navigate",
    accessibleLabel: "Open the Design artifact studio from Home"
  },
  {
    id: "home-source-health-open",
    workspace: "home",
    label: "Open source",
    action: "navigate",
    accessibleLabel: "Open the workspace or settings page for a Home source-health item"
  },
  {
    id: "home-latest-activity-open",
    workspace: "home",
    label: "Open activity",
    action: "navigate",
    accessibleLabel: "Open the workspace for a latest activity item"
  },
  {
    id: "home-payment-refresh",
    workspace: "home",
    label: "Refresh payments",
    action: "run_ipc",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    accessibleLabel: "Refresh payment receipts and provider readiness from Home"
  },
  {
    id: "home-payment-verify-receipt",
    workspace: "home",
    label: "Verify receipt",
    action: "run_ipc",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_selection",
    accessibleLabel: "Verify a finished payment receipt from Home"
  },
  {
    id: "home-payment-open-automation",
    workspace: "home",
    label: "Open automation",
    action: "navigate",
    disabledReason: "requires_selection",
    accessibleLabel: "Open the recurring payment automation from Home"
  },
  {
    id: "browser-assistant-toggle",
    workspace: "browser",
    label: "Assistant",
    action: "open_panel",
    accessibleLabel: "Open browser assistant"
  },
  {
    id: "browser-read-tab",
    workspace: "browser",
    label: "Read this tab",
    action: "run_ipc",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_selection",
    accessibleLabel: "Read the active browser tab"
  },
  {
    id: "productivity-sync-selected",
    workspace: "productivity",
    label: "Sync selected",
    action: "sync_source",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_connection",
    accessibleLabel: "Sync selected productivity sources"
  },
  {
    id: "productivity-start-safe-work",
    workspace: "productivity",
    label: "Start safe work",
    action: "run_ipc",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_approval",
    accessibleLabel: "Start safe Autopilot work"
  },
  {
    id: "productivity-block-sender",
    workspace: "productivity",
    label: "Block sender",
    action: "save_local",
    hasFeedback: true,
    accessibleLabel: "Block a Gmail sender from Productivity AI analysis"
  },
  {
    id: "productivity-unblock-sender",
    workspace: "productivity",
    label: "Unblock sender",
    action: "save_local",
    hasFeedback: true,
    accessibleLabel: "Remove a Gmail sender from the blocked sender list"
  },
  {
    id: "productivity-finance-enable",
    workspace: "productivity",
    label: "Enable in Settings",
    action: "navigate",
    disabledReason: "requires_account",
    accessibleLabel: "Open Settings to enable money management"
  },
  {
    id: "productivity-finance-run-safety-check",
    workspace: "productivity",
    label: "Run safety check",
    action: "run_ipc",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_verified_invoice_candidate",
    accessibleLabel: "Verify a possible invoice before any payment proposal"
  },
  {
    id: "productivity-finance-open-source",
    workspace: "productivity",
    label: "Open source",
    action: "navigate",
    accessibleLabel: "Open the source email or browser tab for a finance invoice candidate"
  },
  {
    id: "coding-open-project",
    workspace: "coding",
    label: "Open local folder",
    action: "run_ipc",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    accessibleLabel: "Open a local coding project folder"
  },
  {
    id: "coding-start-agent-run",
    workspace: "coding",
    label: "Ask Autopilot",
    action: "generate_ai",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_active_project",
    accessibleLabel: "Ask Autopilot to plan or edit code"
  },
  {
    id: "design-generate-artifact",
    workspace: "design",
    label: "Generate",
    action: "generate_ai",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_account",
    accessibleLabel: "Generate a design artifact with Autopilot"
  },
  {
    id: "design-export-artifact",
    workspace: "design",
    label: "Export",
    action: "export",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_active_artifact",
    accessibleLabel: "Export the active design artifact"
  },
  {
    id: "design-share-artifact",
    workspace: "design",
    label: "Share",
    action: "share",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_active_artifact",
    accessibleLabel: "Copy a review-ready artifact share summary"
  },
  {
    id: "design-send-to-coding",
    workspace: "design",
    label: "Send to Coding",
    action: "export",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_active_artifact",
    accessibleLabel: "Send the active website design to Coding"
  },
  {
    id: "design-retry-generation",
    workspace: "design",
    label: "Retry",
    action: "generate_ai",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_account",
    accessibleLabel: "Retry the failed design generation"
  },
  {
    id: "automation-test-run",
    workspace: "automation",
    label: "Run now",
    action: "run_ipc",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_selection",
    accessibleLabel: "Run the selected automation recipe"
  },
  {
    id: "automation-pause-recipe",
    workspace: "automation",
    label: "Pause recipe",
    action: "save_local",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_selection",
    accessibleLabel: "Pause the selected automation recipe"
  },
  {
    id: "automation-recurring-payment-proposal",
    workspace: "automation",
    label: "Payment proposal",
    action: "save_local",
    hasFeedback: true,
    disabledReason: "requires_approval",
    accessibleLabel: "Create a recurring payment proposal automation that still requires approval"
  },
  {
    id: "settings-save-password-preferences",
    workspace: "settings",
    label: "Save password settings",
    action: "save_local",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    accessibleLabel: "Save password manager settings"
  },
  {
    id: "settings-refresh-backend-status",
    workspace: "settings",
    label: "Refresh backend status",
    action: "run_ipc",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    accessibleLabel: "Refresh account and AI backend readiness"
  },
  {
    id: "settings-start-money-verification",
    workspace: "settings",
    label: "Enable money movement",
    action: "run_ipc",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_account",
    accessibleLabel: "Start email verification before enabling money movement"
  },
  {
    id: "settings-confirm-money-verification",
    workspace: "settings",
    label: "Confirm verification",
    action: "run_ipc",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_input",
    accessibleLabel: "Confirm money movement email verification code"
  },
  {
    id: "settings-disable-money-movement",
    workspace: "settings",
    label: "Disable money movement",
    action: "run_ipc",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "not_enabled",
    accessibleLabel: "Disable money movement"
  },
  {
    id: "settings-connect-stripe",
    workspace: "settings",
    label: "Connect my Stripe",
    action: "run_ipc",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "not_enabled",
    accessibleLabel: "Connect the signed-in user's own Stripe account"
  },
  {
    id: "settings-refresh-stripe",
    workspace: "settings",
    label: "Refresh Stripe",
    action: "run_ipc",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "not_enabled",
    accessibleLabel: "Refresh Stripe connection readiness"
  },
  {
    id: "settings-disconnect-stripe",
    workspace: "settings",
    label: "Disconnect Stripe",
    action: "run_ipc",
    async: true,
    hasLoadingState: true,
    hasFeedback: true,
    disabledReason: "requires_connection",
    accessibleLabel: "Disconnect the linked Stripe account"
  },
  {
    id: "settings-account-link-autopilot-browser",
    workspace: "settings",
    label: "Autopilot Browser",
    action: "save_local",
    async: false,
    hasLoadingState: false,
    hasFeedback: true,
    accessibleLabel: "Use Autopilot Browser for account authorization links"
  },
  {
    id: "settings-account-link-external-browser",
    workspace: "settings",
    label: "Another browser",
    action: "save_local",
    async: false,
    hasLoadingState: false,
    hasFeedback: true,
    accessibleLabel: "Use another browser for account authorization links"
  }
];

export function validateButtonContracts(contracts: ButtonActionContract[]): ButtonContractIssue[] {
  const issues: ButtonContractIssue[] = [];
  const seenIds = new Set<string>();

  for (const contract of contracts) {
    if (!contract.id.trim()) {
      issues.push({ id: contract.id || "(missing id)", issue: "Button contract is missing an id." });
    }
    if (seenIds.has(contract.id)) {
      issues.push({ id: contract.id, issue: "Button contract id must be unique." });
    }
    seenIds.add(contract.id);

    if (!contract.label.trim()) {
      issues.push({ id: contract.id, issue: "Button contract is missing visible label text." });
    }
    if (!contract.accessibleLabel.trim()) {
      issues.push({ id: contract.id, issue: "Button contract is missing an accessible label." });
    }
    if (contract.async && !contract.hasLoadingState) {
      issues.push({ id: contract.id, issue: "Async button must expose a loading state." });
    }
    if (contract.async && !contract.hasFeedback) {
      issues.push({ id: contract.id, issue: "Async button must expose success or error feedback." });
    }
    if (contract.action === "approve" && contract.disabledReason !== "requires_approval") {
      issues.push({ id: contract.id, issue: "Approval actions must declare an approval disabled reason." });
    }
  }

  return issues;
}

export function getButtonContractSummary(contracts: ButtonActionContract[] = WORKSPACE_BUTTON_CONTRACTS): Record<ButtonActionContract["workspace"], number> {
  return contracts.reduce(
    (summary, contract) => ({
      ...summary,
      [contract.workspace]: summary[contract.workspace] + 1
    }),
    {
      home: 0,
      browser: 0,
      productivity: 0,
      coding: 0,
      design: 0,
      automation: 0,
      settings: 0
    } satisfies Record<ButtonActionContract["workspace"], number>
  );
}

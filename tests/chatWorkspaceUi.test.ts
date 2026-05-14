import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../src/renderer/App.tsx", import.meta.url), "utf8");
const workspacesSource = readFileSync(new URL("../src/shared/workspaces.ts", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../src/renderer/styles.css", import.meta.url), "utf8");

describe("enterprise Chatting workspace", () => {
  it("keeps Chatting routed to its own workspace instead of Browser", () => {
    expect(appSource).toContain('type AppView = "home" | "browser" | "coding" | "productivity" | "chatting" | "design" | "settings"');
    expect(workspacesSource).toContain('id: "chatting"');
    expect(workspacesSource).toContain('label: "chatting"');
    expect(workspacesSource).toContain('view: "chatting"');
    expect(appSource).toContain('{view === "chatting" && (');
  });

  it("provides enterprise key join controls and rejects stale rotated keys", () => {
    expect(appSource).toContain("function joinEnterpriseOrganizationWithKey()");
    expect(appSource).toContain("chatJoinEmailDraft");
    expect(appSource).toContain("chatJoinKeyDraft");
    expect(appSource).toContain("Invite key rejected. Rotated or old keys cannot add new members.");
    expect(appSource).toContain('aria-label="Join organization with enterprise key"');
    expect(cssSource).toContain(".chatting-join-card");
  });

  it("lets owners/admins manage workspace name and member roles without exposing random users", () => {
    expect(appSource).toContain("function updateEnterpriseOrganizationName()");
    expect(appSource).toContain("function toggleEnterpriseMemberAdmin(memberId: string)");
    expect(appSource).toContain("Only the organization owner can change admin roles.");
    expect(appSource).toContain("const owner: EnterpriseChatMember =");
    expect(appSource).toContain("members: [owner]");
    expect(appSource).toContain('aria-label="Organization members"');
    expect(cssSource).toContain(".chatting-org-form");
  });

  it("analyzes channel messages only when AI notes are enabled", () => {
    expect(appSource).toContain("function analyzeEnterpriseChatChannel()");
    expect(appSource).toContain("AI notes are paused for this channel. Enable AI notes before analyzing it.");
    expect(appSource).toContain("activeChatMessages.length === 0 || !activeChatChannel?.aiNotesEnabled");
    expect(appSource).toContain("Action candidate detected in");
    expect(appSource).toContain("Message sent. AI notes are paused, so no suggestion was created.");
  });

  it("shows channel members and reviewable action suggestions in the enterprise chat UI", () => {
    expect(appSource).toContain('className="chatting-channel-members"');
    expect(appSource).toContain("pendingChatActionSuggestions.map");
    expect(appSource).toContain("acceptEnterpriseChatSuggestion(suggestion.id)");
    expect(appSource).toContain("ignoreEnterpriseChatSuggestion(suggestion.id)");
    expect(cssSource).toContain(".chatting-channel-members");
    expect(cssSource).toContain(".enterprise-chat-redesign");
  });

  it("discloses local preview mode until Supabase realtime chat is connected", () => {
    expect(appSource).toContain("Local preview mode");
    expect(appSource).toContain("Supabase realtime chat tables exist");
    expect(cssSource).toContain(".chatting-local-mode-banner");
  });
});

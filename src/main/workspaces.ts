import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

import { sanitizeWorkspaceState, upsertWorkspaceTabSnapshot, type WorkspaceProfile, type WorkspaceState } from "../shared/workspaces.js";
import type { BrowserSnapshot } from "../shared/browserModel.js";

const WORKSPACE_STATE_FILE = "workspace-profiles.json";

export class WorkspaceStore {
  private state: WorkspaceState | null = null;

  constructor(private readonly dataRoot = app.getPath("userData")) {}

  async getState(): Promise<WorkspaceState> {
    if (this.state) {
      return structuredClone(this.state);
    }

    this.state = await this.load();
    return structuredClone(this.state);
  }

  async setActiveWorkspace(workspaceId: string): Promise<WorkspaceState> {
    const state = await this.getState();
    const hasWorkspace = state.profiles.some((profile) => profile.id === workspaceId);
    this.state = {
      ...state,
      activeWorkspaceId: hasWorkspace ? workspaceId : state.activeWorkspaceId
    };
    await this.save();
    return structuredClone(this.state);
  }

  async updateWorkspace(profile: WorkspaceProfile): Promise<WorkspaceState> {
    const state = await this.getState();
    const nextProfiles = state.profiles.some((currentProfile) => currentProfile.id === profile.id)
      ? state.profiles.map((currentProfile) => (currentProfile.id === profile.id ? { ...profile, updatedAt: Date.now() } : currentProfile))
      : [...state.profiles, { ...profile, updatedAt: Date.now() }];

    this.state = sanitizeWorkspaceState({
      ...state,
      profiles: nextProfiles
    });
    await this.save();
    return structuredClone(this.state);
  }

  async persistBrowserSnapshot(workspaceId: string, snapshot: BrowserSnapshot): Promise<WorkspaceState> {
    const state = await this.getState();
    this.state = upsertWorkspaceTabSnapshot(state, workspaceId, snapshot.tabs, snapshot.activeTabId);
    await this.save();
    return structuredClone(this.state);
  }

  private async load(): Promise<WorkspaceState> {
    try {
      const rawState = await fs.readFile(this.getStatePath(), "utf8");
      return sanitizeWorkspaceState(JSON.parse(rawState));
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
      if (code !== "ENOENT") {
        console.warn("Autopilot could not load workspace state.", error);
      }
      return sanitizeWorkspaceState(null);
    }
  }

  private async save(): Promise<void> {
    if (!this.state) {
      return;
    }

    const statePath = this.getStatePath();
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    await fs.writeFile(statePath, JSON.stringify(this.state, null, 2), "utf8");
  }

  private getStatePath(): string {
    return path.join(this.dataRoot, WORKSPACE_STATE_FILE);
  }
}

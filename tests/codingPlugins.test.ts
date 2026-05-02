import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const electronMock = vi.hoisted(() => ({
  paths: {
    appPath: "",
    documents: "",
    home: "",
    userData: ""
  },
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn()
}));

const childProcessMock = vi.hoisted(() => ({
  spawn: vi.fn((shell: string, args: string[]) => {
    const handlers = new Map<string, (...eventArgs: unknown[]) => void>();
    const stream = {
      on: vi.fn(() => stream)
    };
    const child = {
      stdout: stream,
      stderr: stream,
      kill: vi.fn(() => handlers.get("close")?.(null, "SIGTERM")),
      on: vi.fn((eventName: string, handler: (...eventArgs: unknown[]) => void) => {
        handlers.set(eventName, handler);
        return child;
      })
    };
    const command = [shell, ...args].join(" ");
    if (!command.includes("npm install")) {
      setTimeout(() => handlers.get("close")?.(1, null), 0);
    }
    return child;
  })
}));

vi.mock("electron", () => ({
  app: {
    getAppPath: () => electronMock.paths.appPath,
    getPath: (name: "documents" | "home" | "userData") => electronMock.paths[name]
  },
  dialog: {
    showOpenDialog: electronMock.showOpenDialog,
    showSaveDialog: electronMock.showSaveDialog
  }
}));

vi.mock("node:child_process", () => ({
  spawn: childProcessMock.spawn
}));

const { CodingWorkspace } = await import("../src/main/coding");

const tempRoots: string[] = [];

async function makeTempRoot(label: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), `autopilot-${label}-`));
  tempRoots.push(root);
  return root;
}

describe("CodingWorkspace plugins", () => {
  beforeEach(async () => {
    electronMock.paths.userData = await makeTempRoot("plugin-user-data");
    electronMock.paths.home = await makeTempRoot("plugin-home");
    electronMock.paths.documents = await makeTempRoot("plugin-documents");
    electronMock.paths.appPath = await makeTempRoot("plugin-app");
    childProcessMock.spawn.mockClear();
  });

  afterEach(async () => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        await rm(root, { recursive: true, force: true });
      }
    }
  });

  it("can install formatter and lint plugins without an active project", async () => {
    const workspace = new CodingWorkspace();
    const snapshot = await workspace.getSnapshot();
    expect(snapshot.activeProject).toBeNull();

    const eslintResult = await workspace.installPlugin("eslint");
    const prettierResult = await workspace.installPlugin("prettier");

    expect(eslintResult).toEqual(expect.objectContaining({ success: true }));
    expect(prettierResult).toEqual(expect.objectContaining({ success: true }));
    expect(childProcessMock.spawn.mock.calls.map((call) => [call[0], ...(call[1] as string[])].join(" "))).toEqual(
      expect.arrayContaining([expect.stringContaining("npm install -g eslint"), expect.stringContaining("npm install -g prettier")])
    );
  });

  it("uses an elevated silent winget flow for Windows CLI plugins", async () => {
    const workspace = new CodingWorkspace();
    const result = await workspace.installPlugin("git");

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        status: expect.objectContaining({
          status: "installing"
        })
      })
    );
    const installCommand = childProcessMock.spawn.mock.calls.map((call) => [call[0], ...(call[1] as string[])].join(" ")).at(-1) ?? "";
    expect(installCommand).toContain("Start-Process");
    expect(installCommand).toContain("-Verb RunAs");
    expect(installCommand).toContain("Git.Git");
    expect(installCommand).toContain("--exact");
    expect(installCommand).toContain("--silent");
    expect(installCommand).toContain("--disable-interactivity");
  });

  it("keeps the failed installer status instead of hiding the reason", async () => {
    const workspace = new CodingWorkspace();
    await workspace.installPlugin("git");
    await new Promise((resolve) => setTimeout(resolve, 5));

    const statuses = await workspace.getPluginStatuses();
    const gitStatus = statuses.find((status) => status.id === "git");

    expect(gitStatus).toEqual(
      expect.objectContaining({
        status: "failed",
        reason: expect.stringContaining("Git installer exited with code 1")
      })
    );
  });
});

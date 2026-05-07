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

const childProcessMock = vi.hoisted(() => {
  const state: {
    children: Array<{ stdin: { write: ReturnType<typeof vi.fn> } }>;
    spawn: ReturnType<typeof vi.fn>;
  } = {
    children: [],
    spawn: vi.fn()
  };
  state.spawn = vi.fn(() => {
    const handlers = new Map<string, (...eventArgs: unknown[]) => void>();
    const stream = {
      on: vi.fn(() => stream)
    };
    const child = {
      pid: 4242,
      stdout: stream,
      stderr: stream,
      stdin: {
        write: vi.fn()
      },
      kill: vi.fn(),
      unref: vi.fn(),
      on: vi.fn((eventName: string, handler: (...eventArgs: unknown[]) => void) => {
        handlers.set(eventName, handler);
        return child;
      }),
      once: vi.fn((eventName: string, handler: (...eventArgs: unknown[]) => void) => {
        handlers.set(eventName, handler);
        if (eventName === "spawn") {
          setTimeout(() => handler(), 0);
        }
        return child;
      })
    };
    state.children.push(child);
    return child;
  });
  return state;
});

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

describe("CodingWorkspace terminal launcher", () => {
  beforeEach(async () => {
    electronMock.paths.userData = await makeTempRoot("terminal-user-data");
    electronMock.paths.home = await makeTempRoot("terminal-home");
    electronMock.paths.documents = await makeTempRoot("terminal-documents");
    electronMock.paths.appPath = await makeTempRoot("terminal-app");
    electronMock.showOpenDialog.mockReset();
    electronMock.showSaveDialog.mockReset();
    childProcessMock.children.length = 0;
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

  it("opens a real embedded PowerShell process in the active project on Windows", async () => {
    const projectRoot = await makeTempRoot("terminal-project");
    electronMock.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [projectRoot] });

    const workspace = new CodingWorkspace();
    await workspace.openProject({} as never);

    const result = await workspace.openTerminal();

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        cwd: path.resolve(projectRoot),
        pid: 4242
      })
    );
    const [shell, args, options] = childProcessMock.spawn.mock.calls[0];
    if (process.platform === "win32") {
      expect(shell).toBe("powershell.exe");
      expect(args).toEqual(["-NoLogo", "-NoExit"]);
      expect(result).toEqual(expect.objectContaining({ shellName: "Windows PowerShell" }));
    }
    expect(options).toEqual(
      expect.objectContaining({
        cwd: path.resolve(projectRoot),
        windowsHide: true
      })
    );

    const inputResult = await workspace.sendTerminalInput({ input: "Get-Location" });
    expect(inputResult).toEqual(expect.objectContaining({ success: true, running: true }));
    expect(childProcessMock.children[0]?.stdin.write).toHaveBeenCalledWith("Get-Location\r\n");
  });
});

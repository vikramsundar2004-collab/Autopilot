export type CodingNodeKind = "file" | "folder";

export type CodingTreeNode = {
  kind: CodingNodeKind;
  name: string;
  path: string;
  relativePath: string;
  size: number;
  modifiedAt: number;
  children?: CodingTreeNode[];
  truncated?: boolean;
};

export type CodingProject = {
  name: string;
  rootPath: string;
  openedAt: number;
};

export type CodingAccessMode = "ask" | "full";

export type CodingSnapshot = {
  projects: CodingProject[];
  activeProject: CodingProject | null;
  tree: CodingTreeNode | null;
  accessMode: CodingAccessMode;
};

export type CodingDirectoryEntry = Omit<CodingTreeNode, "children">;

export type CodingFileReadResult =
  | {
      success: true;
      kind: "directory";
      name: string;
      path: string;
      relativePath: string;
      entries: CodingDirectoryEntry[];
    }
  | {
      success: true;
      kind: "text";
      name: string;
      path: string;
      relativePath: string;
      content: string;
      language: string;
      size: number;
      modifiedAt: number;
    }
  | {
      success: true;
      kind: "image";
      name: string;
      path: string;
      relativePath: string;
      dataUrl: string;
      mime: string;
      size: number;
      modifiedAt: number;
    }
  | {
      success: true;
      kind: "document";
      name: string;
      path: string;
      relativePath: string;
      dataUrl: string;
      mime: string;
      size: number;
      modifiedAt: number;
    }
  | {
      success: true;
      kind: "binary";
      name: string;
      path: string;
      relativePath: string;
      reason: string;
      size: number;
      modifiedAt: number;
    }
  | {
      success: false;
      reason: string;
    };

export type CodingWriteResult =
  | {
      success: true;
      savedAt: number;
      size: number;
    }
  | {
      success: false;
      reason: string;
    };

export type CodingPlugin = {
  id: string;
  name: string;
  category: string;
  description: string;
  command: string;
};

export type CodingCommandRequest = {
  command: string;
  cwd?: string;
  approved?: boolean;
};

export type CodingCommandResult =
  | {
      success: true;
      command: string;
      cwd: string;
      stdout: string;
      stderr: string;
      exitCode: number;
      durationMs: number;
    }
  | {
      success: false;
      command?: string;
      cwd?: string;
      stdout?: string;
      stderr?: string;
      exitCode?: number | null;
      durationMs?: number;
      reason: string;
      requiresApproval?: boolean;
    };

export type CodingSearchResult = {
  kind: CodingNodeKind;
  name: string;
  path: string;
  relativePath: string;
  size: number;
  modifiedAt: number;
  match: "name" | "path";
};

export type CodingResearchResult =
  | {
      success: true;
      input: string;
      url: string;
      title: string;
      snippet: string;
      status: number;
    }
  | {
      success: false;
      input: string;
      url?: string;
      reason: string;
    };

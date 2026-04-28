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

export type CodingSnapshot = {
  projects: CodingProject[];
  activeProject: CodingProject | null;
  tree: CodingTreeNode | null;
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

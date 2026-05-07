import { FileText, Folder, FolderOpen, Image as ImageIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";

import type { CodingTreeNode } from "../../shared/coding";

type CodingTreeProps = {
  node: CodingTreeNode;
  openFolders: Record<string, boolean>;
  activePath: string | null;
  autoOpenRoot?: boolean;
  level?: number;
  onOpen: (node: CodingTreeNode) => void;
};

export function CodingTree({ node, openFolders, activePath, autoOpenRoot = true, level = 0, onOpen }: CodingTreeProps): JSX.Element {
  const isFolder = node.kind === "folder";
  const isOpen = isFolder && ((autoOpenRoot && level === 0) || Boolean(openFolders[node.path]));
  const Icon = isFolder ? (isOpen ? FolderOpen : Folder) : getCodingFileIcon(node.name);
  const isActive = activePath === node.path;

  return (
    <div className="coding-tree-node">
      <button
        className={`coding-file ${isActive ? "active" : ""}`}
        style={{ "--file-level": level } as CSSProperties}
        type="button"
        onClick={() => onOpen(node)}
        title={node.path}
      >
        <Icon size={15} aria-hidden="true" />
        <span>{node.name}</span>
        {node.truncated && <b>More</b>}
      </button>
      {isFolder && isOpen && node.children && (
        <div className="coding-tree-children">
          {node.children.map((child) => (
            <CodingTree
              activePath={activePath}
              key={child.path}
              node={child}
              openFolders={openFolders}
              level={level + 1}
              autoOpenRoot={autoOpenRoot}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getCodingFileIcon(name: string): LucideIcon {
  const lowerName = name.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|avif|apng)$/u.test(lowerName)) {
    return ImageIcon;
  }

  return FileText;
}

import { Folder, FolderOpen } from "lucide-react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";

import type { BookmarkNodeTarget, BrowserBookmarkNode } from "../../shared/bookmarks";

type BookmarkTreeProps = {
  nodes: BrowserBookmarkNode[];
  openFolders: Record<string, boolean>;
  parentId: string;
  path?: string[];
  level?: number;
  onNavigate: (url: string) => void;
  onToggleFolder: (folderId: string) => void;
  onContextMenu: (event: ReactMouseEvent, target: BookmarkNodeTarget) => void;
};

export function BookmarkTree({
  nodes,
  openFolders,
  parentId,
  path = [],
  level = 0,
  onNavigate,
  onToggleFolder,
  onContextMenu
}: BookmarkTreeProps): JSX.Element {
  return (
    <div className="bookmark-tree" style={{ "--bookmark-level": level } as CSSProperties}>
      {nodes.map((node, index) => {
        const nodeId = `${parentId}/${node.source}/${node.title}/${index}`;
        const target: BookmarkNodeTarget = {
          kind: node.kind,
          source: node.source,
          title: node.title,
          url: node.kind === "bookmark" ? node.url : undefined,
          path
        };

        if (node.kind === "folder") {
          const isOpen = Boolean(openFolders[nodeId]);
          const FolderIcon = isOpen ? FolderOpen : Folder;
          return (
            <div className="bookmark-folder" key={nodeId}>
              <button
                className={`bookmark-folder-row ${isOpen ? "open" : ""}`}
                type="button"
                onClick={() => onToggleFolder(nodeId)}
                onContextMenu={(event) => onContextMenu(event, target)}
                title={node.title}
              >
                <FolderIcon size={17} aria-hidden="true" />
                <span>{node.title}</span>
              </button>
              {isOpen && (
                <BookmarkTree
                  nodes={node.children}
                  openFolders={openFolders}
                  parentId={nodeId}
                  path={[...path, node.title]}
                  level={level + 1}
                  onNavigate={onNavigate}
                  onToggleFolder={onToggleFolder}
                  onContextMenu={onContextMenu}
                />
              )}
            </div>
          );
        }

        return (
          <button
            className="bookmark-item"
            key={nodeId}
            type="button"
            onClick={() => onNavigate(node.url)}
            onContextMenu={(event) => onContextMenu(event, target)}
            title={node.title}
          >
            <span className="bookmark-favicon" aria-hidden="true">
              {getBookmarkInitial(node.title, node.url)}
            </span>
            <span className="bookmark-copy">
              <span>{node.title}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function getBookmarkInitial(title: string, url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname[0]?.toUpperCase() ?? "B";
  } catch {
    return title.trim()[0]?.toUpperCase() ?? "B";
  }
}

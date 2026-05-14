import { FileText, Globe2, Mail, Package, Play, Sparkles, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { ArtifactKind } from "../../shared/artifacts";
import type { ProductivityDraft } from "../../shared/productivity";

export type DesignFileSectionId = "drafts" | "documents" | "slides" | "artifacts" | "other";

export type DesignGeneratedFile = {
  id: string;
  section: DesignFileSectionId;
  origin: "user" | "ai";
  title: string;
  summary: string;
  meta: string;
  sourceLabel: string;
  status: string;
  updatedAt: number;
  artifactId?: string;
  draftId?: string;
  kind?: ArtifactKind;
  sourceUrl?: string;
};

type DesignFileLibrarySection = {
  id: DesignFileSectionId;
  title: string;
  detail: string;
  icon: LucideIcon;
};

export const DESIGN_FILE_LIBRARY_SECTIONS: DesignFileLibrarySection[] = [
  { id: "drafts", title: "Drafts", detail: "Reply drafts and email-sourced writing Autopilot prepared.", icon: Mail },
  { id: "documents", title: "Documents", detail: "Briefs, reports, memos, and working documents.", icon: FileText },
  { id: "slides", title: "Slides", detail: "Generated decks and presentation packets.", icon: Play },
  { id: "artifacts", title: "Artifacts", detail: "Websites, spreadsheets, forms, checklists, assets, handoffs, and exports.", icon: Sparkles },
  { id: "other", title: "Other", detail: "Website designs, exports, and generated resources.", icon: Package }
];

const ARTIFACT_TYPE_LABELS = ["Websites", "Slides", "Docs", "Sheets", "Forms", "Drafts", "Briefs", "Memos", "Checklists", "Assets", "Code handoffs", "Exports"];

type DesignFilesLibraryProps = {
  activeArtifactId?: string;
  generatedFileCount: number;
  filesBySection: Record<DesignFileSectionId, DesignGeneratedFile[]>;
  selectedDraft: ProductivityDraft | null;
  formatDate: (value: number) => string;
  getArtifactKindLabel: (kind: ProductivityDraft["artifactKind"] | ArtifactKind) => string;
  onCreateNew: () => void;
  onOpenFile: (file: DesignGeneratedFile) => void;
  onOpenFileSource: (file: DesignGeneratedFile) => void;
  onCloseDraft: () => void;
  onUseDraftWithAi: () => void;
  onOpenDraftSource: () => void;
};

function getDesignFileIcon(file: DesignGeneratedFile): LucideIcon {
  if (file.kind === "website_design") {
    return Globe2;
  }
  if (file.section === "drafts") {
    return Mail;
  }
  if (file.kind === "slide_deck") {
    return Play;
  }
  return FileText;
}

function renderDesignFileCard(
  file: DesignGeneratedFile,
  activeArtifactId: string | undefined,
  formatDate: (value: number) => string,
  onOpenFile: (file: DesignGeneratedFile) => void,
  onOpenFileSource: (file: DesignGeneratedFile) => void
): JSX.Element {
  const FileIcon = getDesignFileIcon(file);
  return (
    <article className={`design-file-card ${activeArtifactId === file.artifactId ? "active" : ""}`} key={file.id}>
      <button className="design-file-main" type="button" onClick={() => onOpenFile(file)}>
        <span className="design-file-icon" data-section={file.section}>
          <FileIcon size={19} aria-hidden="true" />
        </span>
        <span className="design-file-copy">
          <strong>{file.title}</strong>
          <small>{file.summary}</small>
        </span>
      </button>
      <div className="design-file-meta">
        <span>{file.meta}</span>
        <span>{file.status}</span>
        <time dateTime={new Date(file.updatedAt).toISOString()}>{formatDate(file.updatedAt)}</time>
      </div>
      <div className="design-file-source">
        <span>{file.sourceLabel}</span>
        <button
          type="button"
          disabled={!file.sourceUrl}
          title={file.sourceUrl ? "Open original source" : "No original source link was saved for this file."}
          onClick={() => onOpenFileSource(file)}
        >
          <Globe2 size={13} aria-hidden="true" />
          Source
        </button>
      </div>
    </article>
  );
}

export function DesignFilesLibrary({
  activeArtifactId,
  generatedFileCount,
  filesBySection,
  selectedDraft,
  formatDate,
  getArtifactKindLabel,
  onCreateNew,
  onOpenFile,
  onOpenFileSource,
  onCloseDraft,
  onUseDraftWithAi,
  onOpenDraftSource
}: DesignFilesLibraryProps): JSX.Element {
  const userFiles = Object.values(filesBySection)
    .flat()
    .filter((file) => file.origin === "user");
  const aiFiles = Object.values(filesBySection)
    .flat()
    .filter((file) => file.origin === "ai");
  return (
    <div className="design-files-library" aria-label="Generated files">
      <header className="design-files-hero">
        <div>
          <p className="panel-kicker">Artifacts</p>
          <h1>All artifacts</h1>
          <span>
            {generatedFileCount === 0
              ? "User-started and AI-generated artifacts will appear here after Autopilot reads an email, prompt, source, or project."
              : `${generatedFileCount} artifact${generatedFileCount === 1 ? "" : "s"} split by who started the work.`}
          </span>
        </div>
        <div className="design-artifact-type-strip" aria-label="Artifact types Autopilot can manage">
          {ARTIFACT_TYPE_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <button className="primary-action" type="button" onClick={onCreateNew}>
          <Sparkles size={15} aria-hidden="true" />
          New from AI
        </button>
      </header>

      <div className="design-files-sections">
        {selectedDraft && (
          <section className="design-draft-detail" aria-label="Selected draft">
            <header>
              <div>
                <p className="panel-kicker">Selected draft</p>
                <h2>{selectedDraft.title}</h2>
                <span>
                  {selectedDraft.source.from || selectedDraft.source.label} - {getArtifactKindLabel(selectedDraft.artifactKind)}
                </span>
              </div>
              <button className="icon-button small" type="button" aria-label="Close selected draft" onClick={onCloseDraft}>
                <X size={15} aria-hidden="true" />
              </button>
            </header>
            <p>{selectedDraft.preview}</p>
            <textarea value={selectedDraft.body} readOnly aria-label="Selected generated draft body" />
            <div className="artifact-editor-actions">
              <button className="primary-action" type="button" onClick={onUseDraftWithAi}>
                <Sparkles size={14} aria-hidden="true" />
                Use with AI
              </button>
              <button className="secondary-action" type="button" disabled={!selectedDraft.source.url} onClick={onOpenDraftSource}>
                <Globe2 size={14} aria-hidden="true" />
                Show full email
              </button>
            </div>
          </section>
        )}

        <section className="design-files-origin-section" aria-labelledby="design-files-user-started">
          <header>
            <span className="design-files-section-icon" data-section="documents">
              <FileText size={17} aria-hidden="true" />
            </span>
            <div>
              <h2 id="design-files-user-started">User files</h2>
              <p>Artifacts you started or saved as your own project.</p>
            </div>
            <strong>{userFiles.length}</strong>
          </header>
          {userFiles.length > 0 ? (
            <div className="design-file-grid">
              {userFiles.map((file) => renderDesignFileCard(file, activeArtifactId, formatDate, onOpenFile, onOpenFileSource))}
            </div>
          ) : (
            <div className="design-files-empty">
              <FileText size={17} aria-hidden="true" />
              <span>No user-started artifacts yet.</span>
            </div>
          )}
        </section>

        <section className="design-files-origin-section" aria-labelledby="design-files-ai-generated">
          <header>
            <span className="design-files-section-icon" data-section="drafts">
              <Sparkles size={17} aria-hidden="true" />
            </span>
            <div>
              <h2 id="design-files-ai-generated">AI-generated files</h2>
              <p>Artifacts Autopilot started from emails, prompts, chats, sources, or background work.</p>
            </div>
            <strong>{aiFiles.length}</strong>
          </header>
          {aiFiles.length > 0 ? (
            <div className="design-file-grid">
              {aiFiles.map((file) => renderDesignFileCard(file, activeArtifactId, formatDate, onOpenFile, onOpenFileSource))}
            </div>
          ) : (
            <div className="design-files-empty">
              <Sparkles size={17} aria-hidden="true" />
              <span>No AI-generated artifacts yet.</span>
            </div>
          )}
        </section>

        <section className="design-files-type-overview" aria-label="Artifact groups by type">
          <header>
            <div>
              <h2>Artifact types</h2>
              <p>Autopilot is not limited to websites, slides, and documents. These groups show the kinds of outputs it can hold and route.</p>
            </div>
          </header>
          <div className="design-artifact-type-grid">
            {ARTIFACT_TYPE_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </section>

        <details className="design-files-by-type">
          <summary>Show by output type</summary>
          {DESIGN_FILE_LIBRARY_SECTIONS.map((section) => {
          const files = filesBySection[section.id];
          const SectionIcon = section.icon;
          return (
            <section className="design-files-section" key={section.id} aria-labelledby={`design-files-${section.id}`}>
              <header>
                <span className="design-files-section-icon" data-section={section.id}>
                  <SectionIcon size={17} aria-hidden="true" />
                </span>
                <div>
                  <h2 id={`design-files-${section.id}`}>{section.title}</h2>
                  <p>{section.detail}</p>
                </div>
                <strong>{files.length}</strong>
              </header>
              {files.length > 0 ? (
                <div className="design-file-grid">
                  {files.map((file) => renderDesignFileCard(file, activeArtifactId, formatDate, onOpenFile, onOpenFileSource))}
                </div>
              ) : (
                <div className="design-files-empty">
                  <SectionIcon size={17} aria-hidden="true" />
                  <span>No {section.title.toLowerCase()} generated yet.</span>
                </div>
              )}
            </section>
          );
        })}
        </details>
      </div>
    </div>
  );
}

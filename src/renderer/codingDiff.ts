export type CodingDiffLineKind = "context" | "added" | "removed";

export type CodingDiffLine = {
  id: string;
  kind: CodingDiffLineKind;
  text: string;
  oldLine: number | null;
  newLine: number | null;
};

export type CodingDiffHunk = {
  id: string;
  oldStart: number;
  newStart: number;
  lines: CodingDiffLine[];
};

export type CodingDiffResult = {
  changed: boolean;
  added: number;
  removed: number;
  tooLarge: boolean;
  hunks: CodingDiffHunk[];
};

type DiffOptions = {
  contextLines?: number;
  maxCells?: number;
};

const DEFAULT_CONTEXT_LINES = 3;
const DEFAULT_MAX_CELLS = 350_000;
const MAX_FALLBACK_LINES = 180;

function splitComparableLines(value: string): string[] {
  if (value.length === 0) {
    return [];
  }

  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function makeLineId(kind: CodingDiffLineKind, oldLine: number | null, newLine: number | null, index: number): string {
  return `${kind}-${oldLine ?? "n"}-${newLine ?? "n"}-${index}`;
}

function buildHunks(lines: CodingDiffLine[], contextLines: number): CodingDiffHunk[] {
  const changedIndexes = lines
    .map((line, index) => (line.kind === "context" ? -1 : index))
    .filter((index) => index >= 0);

  if (changedIndexes.length === 0) {
    return [];
  }

  const ranges: Array<{ start: number; end: number }> = [];
  for (const index of changedIndexes) {
    const start = Math.max(0, index - contextLines);
    const end = Math.min(lines.length - 1, index + contextLines);
    const previousRange = ranges.at(-1);
    if (previousRange && start <= previousRange.end + 1) {
      previousRange.end = Math.max(previousRange.end, end);
    } else {
      ranges.push({ start, end });
    }
  }

  return ranges.map((range, index) => {
    const hunkLines = lines.slice(range.start, range.end + 1);
    const oldStart = hunkLines.find((line) => line.oldLine !== null)?.oldLine ?? 0;
    const newStart = hunkLines.find((line) => line.newLine !== null)?.newLine ?? 0;
    return {
      id: `hunk-${index}-${oldStart}-${newStart}`,
      oldStart,
      newStart,
      lines: hunkLines
    };
  });
}

function buildFallbackDiff(previousLines: string[], currentLines: string[], contextLines: number): CodingDiffResult {
  const removed = previousLines.length;
  const added = currentLines.length;
  const lines: CodingDiffLine[] = [
    ...previousLines.slice(0, MAX_FALLBACK_LINES).map((text, index) => ({
      id: makeLineId("removed", index + 1, null, index),
      kind: "removed" as const,
      text,
      oldLine: index + 1,
      newLine: null
    })),
    ...currentLines.slice(0, MAX_FALLBACK_LINES).map((text, index) => ({
      id: makeLineId("added", null, index + 1, index + previousLines.length),
      kind: "added" as const,
      text,
      oldLine: null,
      newLine: index + 1
    }))
  ];

  return {
    changed: removed > 0 || added > 0,
    added,
    removed,
    tooLarge: true,
    hunks: buildHunks(lines, contextLines)
  };
}

export function buildCodingDiff(previous: string, current: string, options: DiffOptions = {}): CodingDiffResult {
  if (previous === current) {
    return {
      changed: false,
      added: 0,
      removed: 0,
      tooLarge: false,
      hunks: []
    };
  }

  const previousLines = splitComparableLines(previous);
  const currentLines = splitComparableLines(current);
  const contextLines = options.contextLines ?? DEFAULT_CONTEXT_LINES;
  const maxCells = options.maxCells ?? DEFAULT_MAX_CELLS;

  if ((previousLines.length + 1) * (currentLines.length + 1) > maxCells) {
    return buildFallbackDiff(previousLines, currentLines, contextLines);
  }

  const table = Array.from({ length: previousLines.length + 1 }, () => new Uint32Array(currentLines.length + 1));
  for (let oldIndex = previousLines.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = currentLines.length - 1; newIndex >= 0; newIndex -= 1) {
      table[oldIndex][newIndex] =
        previousLines[oldIndex] === currentLines[newIndex]
          ? table[oldIndex + 1][newIndex + 1] + 1
          : Math.max(table[oldIndex + 1][newIndex], table[oldIndex][newIndex + 1]);
    }
  }

  const lines: CodingDiffLine[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  let oldLine = 1;
  let newLine = 1;
  let added = 0;
  let removed = 0;

  while (oldIndex < previousLines.length || newIndex < currentLines.length) {
    const lineIndex = lines.length;
    if (oldIndex < previousLines.length && newIndex < currentLines.length && previousLines[oldIndex] === currentLines[newIndex]) {
      lines.push({
        id: makeLineId("context", oldLine, newLine, lineIndex),
        kind: "context",
        text: previousLines[oldIndex],
        oldLine,
        newLine
      });
      oldIndex += 1;
      newIndex += 1;
      oldLine += 1;
      newLine += 1;
      continue;
    }

    if (newIndex < currentLines.length && (oldIndex === previousLines.length || table[oldIndex][newIndex + 1] > table[oldIndex + 1][newIndex])) {
      lines.push({
        id: makeLineId("added", null, newLine, lineIndex),
        kind: "added",
        text: currentLines[newIndex],
        oldLine: null,
        newLine
      });
      added += 1;
      newIndex += 1;
      newLine += 1;
      continue;
    }

    if (oldIndex < previousLines.length) {
      lines.push({
        id: makeLineId("removed", oldLine, null, lineIndex),
        kind: "removed",
        text: previousLines[oldIndex],
        oldLine,
        newLine: null
      });
      removed += 1;
      oldIndex += 1;
      oldLine += 1;
    }
  }

  return {
    changed: added > 0 || removed > 0,
    added,
    removed,
    tooLarge: false,
    hunks: buildHunks(lines, contextLines)
  };
}

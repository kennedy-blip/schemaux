export type DiffKind = "same" | "add" | "remove";

export interface DiffLine {
  num: number;
  text: string;
}

export interface DiffRow {
  kind: DiffKind;
  left?: DiffLine;
  right?: DiffLine;
}

export interface DiffResult {
  rows: DiffRow[];
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
  identical: boolean;
}

const MAX_LINES = 900;

export function diffLines(leftText: string, rightText: string): DiffResult {
  const left = leftText.length ? leftText.split("\n") : [];
  const right = rightText.length ? rightText.split("\n") : [];

  if (left.length > MAX_LINES || right.length > MAX_LINES) {
    return naiveDiff(left, right);
  }

  const n = left.length;
  const m = right.length;
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = left[i] === right[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (left[i] === right[j]) {
      rows.push({ kind: "same", left: { num: i + 1, text: left[i] }, right: { num: j + 1, text: right[j] } });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ kind: "remove", left: { num: i + 1, text: left[i] } });
      i += 1;
    } else {
      rows.push({ kind: "add", right: { num: j + 1, text: right[j] } });
      j += 1;
    }
  }
  while (i < n) {
    rows.push({ kind: "remove", left: { num: i + 1, text: left[i] } });
    i += 1;
  }
  while (j < m) {
    rows.push({ kind: "add", right: { num: j + 1, text: right[j] } });
    j += 1;
  }

  return summarize(rows);
}

function naiveDiff(left: string[], right: string[]): DiffResult {
  const rows: DiffRow[] = [];
  const max = Math.max(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    const l = left[index];
    const r = right[index];
    if (l === r) {
      rows.push({ kind: "same", left: { num: index + 1, text: l }, right: { num: index + 1, text: r } });
    } else {
      if (l !== undefined) rows.push({ kind: "remove", left: { num: index + 1, text: l } });
      if (r !== undefined) rows.push({ kind: "add", right: { num: index + 1, text: r } });
    }
  }
  return summarize(rows);
}

function summarize(rows: DiffRow[]): DiffResult {
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  let changed = 0;
  let blockRemoved = 0;
  let blockAdded = 0;

  const flush = () => {
    changed += Math.min(blockRemoved, blockAdded);
    blockRemoved = 0;
    blockAdded = 0;
  };

  for (const row of rows) {
    if (row.kind === "add") {
      added += 1;
      blockAdded += 1;
    } else if (row.kind === "remove") {
      removed += 1;
      blockRemoved += 1;
    } else {
      flush();
      unchanged += 1;
    }
  }
  flush();

  return {
    rows,
    added,
    removed,
    changed,
    unchanged,
    identical: added === 0 && removed === 0,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

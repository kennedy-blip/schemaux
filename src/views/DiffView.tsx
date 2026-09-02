import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  Braces,
  CheckCircle2,
  ClipboardPaste,
  Equal,
  Eye,
  EyeOff,
  FileJson,
  GitCompare,
  Minus,
  Plus,
  RefreshCw,
  Rows3,
} from "lucide-react";
import { CodeEditor } from "../components/CodeEditor";
import {
  Badge,
  Button,
  Card,
  CopyButton,
  EmptyState,
  PanelHeader,
  useToast,
} from "../components/ui";
import { DIFF_LEFT, DIFF_RIGHT } from "../lib/samples";
import { diffLines } from "../lib/diff";
import { parseJson } from "../lib/validate";
import { highlightLine } from "../lib/highlight";
import { cn } from "../utils/cn";

interface KeyChange {
  key: string;
  status: "added" | "removed" | "changed" | "unchanged";
  left?: string;
  right?: string;
}

function topLevelChanges(leftText: string, rightText: string): KeyChange[] | null {
  const left = parseJson(leftText);
  const right = parseJson(rightText);
  if (!left.ok || !right.ok) return null;
  const l = left.value;
  const r = right.value;
  if (!l || !r || typeof l !== "object" || typeof r !== "object" || Array.isArray(l) || Array.isArray(r)) return null;
  const keys = [...new Set([...Object.keys(l as object), ...Object.keys(r as object)])];
  return keys.map((key) => {
    const leftRecord = l as Record<string, unknown>;
    const rightRecord = r as Record<string, unknown>;
    const inLeft = key in leftRecord;
    const inRight = key in rightRecord;
    const preview = (value: unknown) => {
      const text = typeof value === "string" ? value : JSON.stringify(value);
      return text.length > 42 ? `${text.slice(0, 42)}…` : text;
    };
    return {
      key,
      status: !inLeft ? "added" : !inRight ? "removed" : JSON.stringify(leftRecord[key]) === JSON.stringify(rightRecord[key]) ? "unchanged" : "changed",
      left: inLeft ? preview(leftRecord[key]) : undefined,
      right: inRight ? preview(rightRecord[key]) : undefined,
    };
  });
}

export function DiffView({ payloadText }: { payloadText: string }) {
  const notify = useToast();
  const [leftText, setLeftText] = useState(DIFF_LEFT);
  const [rightText, setRightText] = useState(DIFF_RIGHT);
  const [changesOnly, setChangesOnly] = useState(false);

  const diff = useMemo(() => diffLines(leftText, rightText), [leftText, rightText]);
  const keyChanges = useMemo(() => topLevelChanges(leftText, rightText), [leftText, rightText]);
  const visibleRows = changesOnly ? diff.rows.filter((row) => row.kind !== "same") : diff.rows;
  const diffText = useMemo(
    () =>
      diff.rows
        .map((row) =>
          row.kind === "add" ? `+ ${row.right?.text ?? ""}` : row.kind === "remove" ? `- ${row.left?.text ?? ""}` : `  ${row.left?.text ?? ""}`,
        )
        .join("\n"),
    [diff.rows],
  );

  const leftLines = leftText ? leftText.split("\n").length : 0;
  const rightLines = rightText ? rightText.split("\n").length : 0;

  const swap = () => {
    setLeftText(rightText);
    setRightText(leftText);
    notify("Sides swapped", "info");
  };

  const summary = [
    { label: "Added", value: diff.added, tone: "emerald" as const, icon: Plus },
    { label: "Removed", value: diff.removed, tone: "rose" as const, icon: Minus },
    { label: "Changed", value: diff.changed, tone: "amber" as const, icon: RefreshCw },
    { label: "Unchanged", value: diff.unchanged, tone: "slate" as const, icon: Equal },
  ];

  return (
    <div className="animate-rise-in space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400/90">
            <span className="h-1 w-1 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,1)]" />
            Workspace / 04
          </div>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight text-white sm:text-[26px]">
            Diff <span className="bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">Analyzer</span>
          </h1>
          <p className="mt-0.5 max-w-2xl text-[12.5px] leading-relaxed text-slate-500">
            Compare two JSON payloads line by line and review structural changes before shipping a contract update.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="md" onClick={swap}>
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Swap sides
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              setRightText(payloadText);
              notify("Validator payload loaded as candidate", "info");
            }}
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            Use validator payload
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setLeftText(DIFF_LEFT);
              setRightText(DIFF_RIGHT);
              notify("Sample comparison restored", "info");
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset sample
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {summary.map((item) => {
          const Icon = item.icon;
          const tones = {
            emerald: "border-emerald-400/20 bg-emerald-500/[0.06] text-emerald-300",
            rose: "border-rose-400/20 bg-rose-500/[0.06] text-rose-300",
            amber: "border-amber-400/20 bg-amber-500/[0.06] text-amber-300",
            slate: "border-white/10 bg-white/[0.03] text-slate-300",
          } as const;
          return (
            <div key={item.label} className={cn("rounded-xl border px-3 py-2.5", tones[item.tone])}>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">
                <Icon className="h-3 w-3" />
                {item.label}
              </div>
              <div className="mt-1 font-mono text-[20px] font-bold leading-none tabular-nums">{item.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3.5 lg:grid-cols-2">
        <Card>
          <PanelHeader
            icon={<FileJson className="h-3.5 w-3.5" />}
            tone="rose"
            title="Baseline"
            subtitle="Original payload"
            actions={
              <>
                <Badge tone="rose">{leftLines} lines</Badge>
                <CopyButton text={leftText} size="icon-sm" variant="ghost" label="Copy baseline" />
              </>
            }
          />
          <div className="p-2.5">
            <CodeEditor
              value={leftText}
              onChange={setLeftText}
              language="json"
              ariaLabel="Baseline JSON editor"
              className="h-[240px] sm:h-[280px]"
            />
          </div>
        </Card>
        <Card>
          <PanelHeader
            icon={<FileJson className="h-3.5 w-3.5" />}
            tone="emerald"
            title="Candidate"
            subtitle="Updated payload"
            actions={
              <>
                <Badge tone="emerald">{rightLines} lines</Badge>
                <CopyButton text={rightText} size="icon-sm" variant="ghost" label="Copy candidate" />
              </>
            }
          />
          <div className="p-2.5">
            <CodeEditor
              value={rightText}
              onChange={setRightText}
              language="json"
              ariaLabel="Candidate JSON editor"
              className="h-[240px] sm:h-[280px]"
            />
          </div>
        </Card>
      </div>

      <Card glow={diff.identical ? "emerald" : "violet"}>
        <PanelHeader
          icon={<GitCompare className="h-3.5 w-3.5" />}
          title="Unified Diff"
          subtitle={diff.identical ? "Both documents are identical" : `${diff.added + diff.removed} changed lines across ${leftLines + rightLines} total`}
          actions={
            <>
              <CopyButton text={diffText} size="sm" variant="outline" label="Copy diff" toastMessage="Diff copied" />
              <Button
                variant={changesOnly ? "violet" : "ghost"}
                size="sm"
                onClick={() => setChangesOnly((value) => !value)}
                title="Toggle unchanged lines"
              >
                {changesOnly ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {changesOnly ? "Changes only" : "All lines"}
              </Button>
            </>
          }
        />
        {diff.identical ? (
          <EmptyState
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
            title="No differences detected"
            description="The baseline and candidate documents are identical. Edit either side to see a line-by-line comparison."
          />
        ) : (
          <div className="max-h-[440px] overflow-auto font-mono text-[11.5px] leading-[22px]">
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/[0.07] bg-[#0d1420]/95 px-3 py-1.5 text-[9.5px] uppercase tracking-wider text-slate-500 backdrop-blur">
              <span className="w-8 text-right">base</span>
              <span className="w-8 text-right">cand</span>
              <span className="w-4" />
              <span>payload</span>
              <span className="ml-auto flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-emerald-400/80">
                  <Plus className="h-2.5 w-2.5" /> added
                </span>
                <span className="inline-flex items-center gap-1 text-rose-400/80">
                  <Minus className="h-2.5 w-2.5" /> removed
                </span>
              </span>
            </div>
            {visibleRows.map((row, index) => (
              <div
                key={`${row.kind}-${index}`}
                className={cn(
                  "flex items-start gap-2 px-3 transition-colors",
                  row.kind === "add" && "bg-emerald-500/[0.08] hover:bg-emerald-500/[0.12]",
                  row.kind === "remove" && "bg-rose-500/[0.08] hover:bg-rose-500/[0.12]",
                  row.kind === "same" && "hover:bg-white/[0.03]",
                )}
              >
                <span className="w-8 shrink-0 select-none text-right text-[10px] tabular-nums text-slate-600">
                  {row.left?.num ?? ""}
                </span>
                <span className="w-8 shrink-0 select-none text-right text-[10px] tabular-nums text-slate-600">
                  {row.right?.num ?? ""}
                </span>
                <span
                  className={cn(
                    "w-4 shrink-0 select-none text-center font-semibold",
                    row.kind === "add" && "text-emerald-400",
                    row.kind === "remove" && "text-rose-400",
                    row.kind === "same" && "text-slate-700",
                  )}
                >
                  {row.kind === "add" ? "+" : row.kind === "remove" ? "−" : " "}
                </span>
                <span className="min-w-0 flex-1 whitespace-pre">
                  {highlightLine((row.kind === "add" ? row.right?.text : row.left?.text) ?? "", "json")}
                </span>
              </div>
            ))}
            {visibleRows.length === 0 ? (
              <div className="px-4 py-8 text-center text-[11.5px] text-slate-500">
                No changed lines. Disable “Changes only” to see the full documents.
              </div>
            ) : null}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] bg-black/20 px-3 py-2">
          <Rows3 className="h-3 w-3 text-slate-500" />
          <span className="font-mono text-[10px] text-slate-500">
            LCS line diff · {diff.rows.length} aligned rows
          </span>
          <Badge tone={diff.identical ? "emerald" : "violet"} dot className="ml-auto">
            {diff.identical ? "identical" : `${diff.changed} changed`}
          </Badge>
        </div>
      </Card>

      {keyChanges ? (
        <Card>
          <PanelHeader
            icon={<Braces className="h-3.5 w-3.5" />}
            tone="indigo"
            title="Top-Level Key Changes"
            subtitle="Structural comparison of both JSON documents"
            actions={
              <Badge tone={keyChanges.some((change) => change.status !== "unchanged") ? "amber" : "emerald"}>
                {keyChanges.filter((change) => change.status !== "unchanged").length} modified
              </Badge>
            }
          />
          <div className="grid gap-1.5 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {keyChanges.map((change) => (
              <div
                key={change.key}
                className={cn(
                  "rounded-lg border px-2.5 py-2",
                  change.status === "added" && "border-emerald-400/20 bg-emerald-500/[0.05]",
                  change.status === "removed" && "border-rose-400/20 bg-rose-500/[0.05]",
                  change.status === "changed" && "border-amber-400/20 bg-amber-500/[0.05]",
                  change.status === "unchanged" && "border-white/[0.06] bg-white/[0.02]",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[11px] font-medium text-slate-200">{change.key}</span>
                  <span
                    className={cn(
                      "ml-auto rounded px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                      change.status === "added" && "bg-emerald-500/15 text-emerald-300",
                      change.status === "removed" && "bg-rose-500/15 text-rose-300",
                      change.status === "changed" && "bg-amber-500/15 text-amber-300",
                      change.status === "unchanged" && "bg-white/[0.05] text-slate-500",
                    )}
                  >
                    {change.status}
                  </span>
                </div>
                <div className="mt-1 space-y-0.5 font-mono text-[10px]">
                  {change.left !== undefined ? (
                    <div className="flex gap-1 text-rose-300/70">
                      <span className="text-slate-600">-</span>
                      <span className="truncate">{change.left}</span>
                    </div>
                  ) : null}
                  {change.right !== undefined ? (
                    <div className="flex gap-1 text-emerald-300/70">
                      <span className="text-slate-600">+</span>
                      <span className="truncate">{change.right}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-white/[0.06] px-3 py-2">
            <ArrowRight className="h-3 w-3 text-slate-500" />
            <span className="text-[10.5px] text-slate-500">
              Values are truncated for readability. Use the unified diff for exact line changes.
            </span>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

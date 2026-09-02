import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Braces,
  Bug,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eraser,
  FileJson,
  Gauge,
  Layers,
  ListChecks,
  MinusCircle,
  RotateCcw,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wand2,
  XCircle,
} from "lucide-react";
import { CodeEditor } from "../components/CodeEditor";
import {
  Badge,
  Button,
  Card,
  CopyButton,
  EmptyState,
  PanelHeader,
  Segmented,
  Stat,
  useToast,
} from "../components/ui";
import { SAMPLE_KEYS, SAMPLES, type SampleKey, sampleStrings } from "../lib/samples";
import { zodFromSchema } from "../lib/generate";
import { parseJson, summarizeSchema, validatePayload } from "../lib/validate";
import { cn } from "../utils/cn";

interface ValidatorViewProps {
  schemaText: string;
  setSchemaText: (value: string) => void;
  payloadText: string;
  setPayloadText: (value: string) => void;
  sampleKey: SampleKey;
  onSelectSample: (key: SampleKey) => void;
}

function formatJson(text: string): string {
  return JSON.stringify(JSON.parse(text), null, 2);
}

export function ValidatorView({
  schemaText,
  setSchemaText,
  payloadText,
  setPayloadText,
  sampleKey,
  onSelectSample,
}: ValidatorViewProps) {
  const notify = useToast();
  const [schemaMode, setSchemaMode] = useState<"json" | "zod">("json");
  const [activeLine, setActiveLine] = useState<number | null>(null);

  const result = useMemo(() => validatePayload(schemaText, payloadText), [schemaText, payloadText]);
  const summary = useMemo(() => summarizeSchema(schemaText), [schemaText]);
  const zodPreview = useMemo(() => (schemaMode === "zod" ? zodFromSchema(schemaText) : ""), [schemaMode, schemaText]);
  const sample = SAMPLES[sampleKey];

  const schemaErrorLines = useMemo(() => {
    if (result.status !== "schema-error") return [];
    const parsed = parseJson(schemaText);
    return parsed.ok ? [] : [parsed.line];
  }, [result.status, schemaText]);

  const errorLines = useMemo(() => result.issues.map((issue) => issue.line), [result.issues]);
  const warningLines = useMemo(() => result.warnings.map((warning) => warning.line), [result.warnings]);

  const handleFormat = (which: "schema" | "payload") => {
    const text = which === "schema" ? schemaText : payloadText;
    try {
      const formatted = formatJson(text);
      if (which === "schema") setSchemaText(formatted);
      else setPayloadText(formatted);
      notify(`${which === "schema" ? "Schema" : "Payload"} formatted`);
    } catch {
      notify(`Fix the JSON syntax error before formatting`, "error");
    }
  };

  const handleClear = (which: "schema" | "payload") => {
    if (which === "schema") setSchemaText("");
    else setPayloadText("");
    setActiveLine(null);
    notify(`${which === "schema" ? "Schema" : "Payload"} cleared`, "info");
  };

  const handleReset = (which: "schema" | "payload") => {
    const strings = sampleStrings(sampleKey);
    if (which === "schema") setSchemaText(strings.schema);
    else setPayloadText(strings.payload);
    setActiveLine(null);
    notify(`Restored sample ${which}`, "info");
  };

  const loadInvalid = () => {
    setPayloadText(sampleStrings(sampleKey).invalid);
    setActiveLine(null);
    notify("Loaded an invalid payload to explore error reporting", "info");
  };

  const statusTone =
    result.status === "valid"
      ? "emerald"
      : result.status === "empty"
        ? "slate"
        : result.status === "schema-error"
          ? "amber"
          : "rose";

  const StatusIcon =
    result.status === "valid"
      ? CheckCircle2
      : result.status === "empty"
        ? ScanLine
        : result.status === "schema-error"
          ? AlertTriangle
          : XCircle;

  const issueTitle = (keyword: string | undefined) => {
    switch (keyword) {
      case "required":
        return "Missing Required Property";
      case "type":
        return "Type Mismatch";
      case "format":
        return "Format Constraint Failed";
      case "pattern":
        return "Pattern Mismatch";
      case "enum":
        return "Value Not Allowed";
      case "additionalProperties":
        return "Unexpected Property";
      case "minimum":
      case "maximum":
      case "multipleOf":
        return "Numeric Constraint Failed";
      case "minLength":
      case "maxLength":
        return "Length Constraint Failed";
      case "minItems":
      case "maxItems":
        return "Array Constraint Failed";
      default:
        return "Validation Failed";
    }
  };

  const bannerTitle =
    result.status === "invalid" ? issueTitle(result.issues[0]?.keyword) : result.title;

  const bannerStyles: Record<string, string> = {
    emerald: "border-emerald-400/25 bg-gradient-to-r from-emerald-500/[0.12] via-emerald-500/[0.05] to-transparent",
    rose: "border-rose-400/25 bg-gradient-to-r from-rose-500/[0.12] via-rose-500/[0.05] to-transparent",
    amber: "border-amber-400/25 bg-gradient-to-r from-amber-500/[0.12] via-amber-500/[0.05] to-transparent",
    slate: "border-white/10 bg-gradient-to-r from-white/[0.05] via-white/[0.02] to-transparent",
  };
  const iconStyles: Record<string, string> = {
    emerald: "border-emerald-400/30 bg-emerald-500/15 text-emerald-300 shadow-[0_0_24px_-6px_rgba(16,185,129,0.8)]",
    rose: "border-rose-400/30 bg-rose-500/15 text-rose-300 shadow-[0_0_24px_-6px_rgba(244,63,94,0.8)]",
    amber: "border-amber-400/30 bg-amber-500/15 text-amber-300 shadow-[0_0_24px_-6px_rgba(245,158,11,0.7)]",
    slate: "border-white/10 bg-white/[0.04] text-slate-400",
  };
  const titleStyles: Record<string, string> = {
    emerald: "text-emerald-200",
    rose: "text-rose-200",
    amber: "text-amber-200",
    slate: "text-slate-300",
  };

  return (
    <div className="animate-rise-in space-y-4">
      {/* Page heading */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400/90">
            <span className="h-1 w-1 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,1)]" />
            Workspace / 01
          </div>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight text-white sm:text-[26px]">
            JSON Schema <span className="bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">Validator</span>
          </h1>
          <p className="mt-0.5 max-w-2xl text-[12.5px] leading-relaxed text-slate-500">
            Real-time payload validation against Draft 2020-12 schemas with precise line-level diagnostics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={sampleKey}
              onChange={(event) => onSelectSample(event.target.value as SampleKey)}
              aria-label="Sample schema template"
              className="h-9 appearance-none rounded-lg border border-white/10 bg-white/[0.03] pl-8 pr-8 text-[12px] font-medium text-slate-200 outline-none transition hover:border-white/20 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/15"
            >
              {SAMPLE_KEYS.map((key) => (
                <option key={key} value={key} className="bg-[#0d1420] text-slate-200">
                  {SAMPLES[key].label}
                </option>
              ))}
            </select>
            <Layers className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-violet-300" />
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          </div>
          <Button variant="outline" size="md" onClick={() => handleReset("schema")}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>

      {/* Status banner */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border p-3.5 sm:p-4",
          bannerStyles[statusTone],
        )}
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-3.5">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
              iconStyles[statusTone],
            )}
          >
            <StatusIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={cn("text-[15px] font-semibold tracking-tight sm:text-base", titleStyles[statusTone])}>
                {bannerTitle}
              </h2>
              {result.status === "valid" ? (
                <Badge tone="emerald" dot>
                  schema valid
                </Badge>
              ) : result.status === "empty" ? (
                <Badge tone="slate">idle</Badge>
              ) : (
                <Badge tone="rose" dot>
                  {result.issues.length || 1} {result.issues.length === 1 ? "issue" : "issues"}
                </Badge>
              )}
              {result.status === "syntax-error" || result.status === "schema-error" ? (
                <Badge tone="amber">
                  line {result.stats.line}, col {result.stats.column}
                </Badge>
              ) : result.status === "invalid" ? (
                <Badge tone="rose">line {result.stats.line}</Badge>
              ) : null}
            </div>
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-slate-400">{result.detail}</p>
          </div>
          <div className="grid w-full grid-cols-4 gap-3 border-t border-white/[0.06] pt-3 sm:w-auto sm:border-0 sm:pt-0">
            <Stat label="Errors" value={result.stats.errors} tone={result.stats.errors > 0 ? "rose" : "emerald"} />
            <Stat label="Warnings" value={result.stats.warnings} tone={result.stats.warnings > 0 ? "amber" : "slate"} />
            <Stat label="Depth" value={result.stats.depth} tone="violet" />
            <Stat label="Time" value={`${result.stats.elapsedMs.toFixed(1)}ms`} tone="indigo" />
          </div>
        </div>
      </div>

      {/* Editors */}
      <div className="grid gap-3.5 lg:grid-cols-2">
        <Card glow="violet">
          <PanelHeader
            icon={<Braces className="h-3.5 w-3.5" />}
            title="JSON Schema"
            subtitle={schemaMode === "zod" ? "generated Zod preview · read-only" : sample.filename}
            actions={
              <>
                <Segmented
                  value={schemaMode}
                  onChange={setSchemaMode}
                  options={[
                    { value: "json", label: "JSON" },
                    { value: "zod", label: "Zod" },
                  ]}
                  className="mr-1 hidden sm:inline-flex"
                />
                <CopyButton
                  text={schemaMode === "zod" ? zodPreview : schemaText}
                  size="icon-sm"
                  variant="ghost"
                  label="Copy schema"
                  toastMessage="Schema copied"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Format schema"
                  aria-label="Format schema"
                  onClick={() => handleFormat("schema")}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Clear schema"
                  aria-label="Clear schema"
                  onClick={() => handleClear("schema")}
                >
                  <Eraser className="h-3.5 w-3.5" />
                </Button>
              </>
            }
          />
          <div className="p-2.5">
            <CodeEditor
              value={schemaMode === "zod" ? zodPreview : schemaText}
              onChange={schemaMode === "json" ? setSchemaText : undefined}
              readOnly={schemaMode === "zod"}
              language={schemaMode === "zod" ? "ts" : "json"}
              errorLines={schemaErrorLines}
              ariaLabel="JSON schema editor"
              className="h-[340px] sm:h-[400px] xl:h-[440px]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] px-3 py-2">
            <Badge tone="violet" dot>
              draft 2020-12
            </Badge>
            <span className="truncate font-mono text-[10px] text-slate-600">{summary?.id || "no $id declared"}</span>
            <span className="ml-auto font-mono text-[10px] text-slate-500">
              {summary?.properties.length ?? 0} fields · {summary?.required.length ?? 0} required
            </span>
          </div>
          {schemaMode === "zod" ? (
            <div className="flex items-start gap-2 border-t border-violet-400/15 bg-violet-500/[0.06] px-3 py-2 text-[11px] text-violet-200/80">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
              Preview generated from your JSON Schema. Switch to JSON to edit the source of truth.
            </div>
          ) : null}
        </Card>

        <Card glow={result.status === "invalid" || result.status === "syntax-error" ? "rose" : "none"}>
          <PanelHeader
            icon={<FileJson className="h-3.5 w-3.5" />}
            tone="indigo"
            title="Test Payload"
            subtitle="payload.json"
            actions={
              <>
                <CopyButton text={payloadText} size="icon-sm" variant="ghost" label="Copy payload" toastMessage="Payload copied" />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Format payload"
                  aria-label="Format payload"
                  onClick={() => handleFormat("payload")}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Load invalid payload"
                  aria-label="Load invalid payload"
                  onClick={loadInvalid}
                  className="text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-200"
                >
                  <Bug className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Reset payload"
                  aria-label="Reset payload"
                  onClick={() => handleReset("payload")}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </>
            }
          />
          <div className="p-2.5">
            <CodeEditor
              value={payloadText}
              onChange={setPayloadText}
              language="json"
              errorLines={errorLines}
              warningLines={warningLines}
              focusLine={activeLine}
              ariaLabel="JSON payload editor"
              className="h-[340px] sm:h-[400px] xl:h-[440px]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] px-3 py-2">
            <Badge tone={result.status === "valid" ? "emerald" : result.status === "empty" ? "slate" : "rose"} dot>
              {result.status === "valid" ? "conforms" : result.status === "empty" ? "waiting" : "violations"}
            </Badge>
            <span className="font-mono text-[10px] text-slate-600">
              {result.stats.properties} properties · depth {result.stats.depth}
            </span>
            <button
              type="button"
              onClick={loadInvalid}
              className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] text-rose-300/80 transition hover:text-rose-200"
            >
              <Bug className="h-3 w-3" />
              try invalid payload
            </button>
          </div>
        </Card>
      </div>

      {/* Diagnostics + checks */}
      <div className="grid gap-3.5 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <PanelHeader
            icon={<ShieldAlert className="h-3.5 w-3.5" />}
            tone={result.issues.length > 0 ? "rose" : "emerald"}
            title="Validation Log"
            subtitle="Click a diagnostic to jump to the offending line"
            actions={
              <Badge tone={result.issues.length > 0 ? "rose" : "emerald"}>
                {result.issues.length} {result.issues.length === 1 ? "error" : "errors"}
              </Badge>
            }
          />
          <div className="max-h-[280px] overflow-y-auto">
            {result.issues.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-9 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/10 text-emerald-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <p className="text-[13px] font-semibold text-slate-200">
                  {result.status === "empty" ? "Waiting for a payload" : "No diagnostics to report"}
                </p>
                <p className="max-w-sm text-[11.5px] leading-relaxed text-slate-500">
                  {result.status === "empty"
                    ? "Paste a JSON payload on the right to validate it against the schema."
                    : "Every constraint in the schema is satisfied. Load an invalid payload to see how diagnostics are reported."}
                </p>
                <Button variant="outline" size="sm" className="mt-1" onClick={loadInvalid}>
                  <Bug className="h-3.5 w-3.5" />
                  Load invalid payload
                </Button>
              </div>
            ) : (
              result.issues.map((issue, index) => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => setActiveLine(issue.line)}
                  className={cn(
                    "group flex w-full items-start gap-2.5 border-b border-white/[0.04] px-3 py-2.5 text-left transition last:border-b-0 hover:bg-white/[0.03]",
                    activeLine === issue.line && "bg-rose-500/[0.05]",
                  )}
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-rose-400/25 bg-rose-500/10 font-mono text-[10px] font-semibold text-rose-300">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] leading-snug text-slate-200">{issue.message}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <code className="rounded border border-violet-400/20 bg-violet-500/10 px-1.5 py-0.5 font-mono text-[10px] text-violet-300">
                        {issue.path}
                      </code>
                      <span className="inline-flex items-center gap-1 rounded border border-white/[0.07] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                        line {issue.line}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wide text-slate-600">{issue.keyword}</span>
                    </span>
                  </span>
                  <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:text-violet-300" />
                </button>
              ))
            )}
          </div>
          {result.warnings.length > 0 ? (
            <div className="border-t border-amber-400/15 bg-amber-500/[0.05] px-3 py-2">
              <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-amber-300/90">
                <AlertTriangle className="h-3 w-3" />
                {result.warnings.length} schema warning{result.warnings.length === 1 ? "" : "s"}
              </div>
              {result.warnings.map((warning) => (
                <div key={warning.id} className="flex items-center gap-1.5 text-[11px] text-amber-200/70">
                  <span className="h-1 w-1 rounded-full bg-amber-400/70" />
                  {warning.message}
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <Card>
          <PanelHeader
            icon={<ListChecks className="h-3.5 w-3.5" />}
            tone="emerald"
            title="Validation Checks"
            subtitle="Constraint coverage report"
            actions={
              <Badge tone={result.status === "valid" ? "emerald" : "slate"}>
                {result.checks.filter((check) => check.state === "pass").length}/{result.checks.length || 6} passed
              </Badge>
            }
          />
          <div className="divide-y divide-white/[0.04]">
            {result.checks.length === 0 ? (
              <EmptyState
                icon={<Gauge className="h-5 w-5" />}
                title="No checks executed yet"
                description="Add a schema and payload to run the validation engine."
              />
            ) : (
              result.checks.map((check) => (
                <div key={check.label} className="flex items-center gap-2.5 px-3 py-2">
                  {check.state === "pass" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : check.state === "fail" ? (
                    <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  ) : (
                    <MinusCircle className="h-4 w-4 shrink-0 text-slate-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-slate-200">{check.label}</div>
                    <div className="truncate text-[10.5px] text-slate-500">{check.hint}</div>
                  </div>
                  <span
                    className={cn(
                      "font-mono text-[9.5px] uppercase tracking-wider",
                      check.state === "pass" ? "text-emerald-400/80" : "text-rose-400/80",
                    )}
                  >
                    {check.state}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-white/[0.06] bg-black/20 px-3 py-2">
            <Clock className="h-3 w-3 text-slate-500" />
            <span className="font-mono text-[10px] text-slate-500">
              engine {result.stats.elapsedMs.toFixed(2)}ms · {result.stats.properties} nodes traversed
            </span>
          </div>
        </Card>
      </div>

      {/* Schema overview */}
      <Card>
        <PanelHeader
          icon={<Braces className="h-3.5 w-3.5" />}
          title="Schema Overview"
          subtitle={summary ? `${summary.title} — ${summary.description || "No description provided"}` : "No valid schema loaded"}
          actions={
            summary ? (
              <div className="flex items-center gap-1.5">
                <Badge tone="violet">{summary.properties.length} fields</Badge>
                <Badge tone="emerald">{summary.required.length} required</Badge>
                {summary.formats.length > 0 ? <Badge tone="indigo">{summary.formats.length} formats</Badge> : null}
              </div>
            ) : null
          }
        />
        {summary && summary.properties.length > 0 ? (
          <div className="grid gap-1.5 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {summary.properties.map((property, index) => (
              <div
                key={`${property.name}-${property.depth}-${index}`}
                className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-1.5 transition hover:border-violet-400/20 hover:bg-violet-500/[0.05]"
              >
                <span className="font-mono text-[11px] text-slate-300">{property.name}</span>
                <span className="rounded border border-white/[0.07] bg-black/30 px-1.5 py-0.5 font-mono text-[9.5px] text-sky-300/90">
                  {property.type}
                  {property.format ? ` · ${property.format}` : ""}
                </span>
                {property.required ? (
                  <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-emerald-400/80">req</span>
                ) : (
                  <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-slate-600">opt</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Braces className="h-5 w-5" />}
            title="Nothing to introspect"
            description="Load a sample schema or paste your own JSON Schema to see its property map."
          />
        )}
      </Card>
    </div>
  );
}

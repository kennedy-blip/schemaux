import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Braces,
  CheckCircle2,
  Clock,
  Database,
  Dices,
  Download,
  FileJson,
  Gauge,
  Hash,
  Layers,
  RefreshCw,
  Rows3,
  SlidersHorizontal,
  Sparkles,
  Table2,
  Wand2,
} from "lucide-react";
import { CodeEditor } from "../components/CodeEditor";
import {
  Badge,
  Button,
  Card,
  CopyButton,
  EmptyState,
  FieldLabel,
  PanelHeader,
  Segmented,
  Switch,
  TextInput,
  downloadFile,
  useToast,
} from "../components/ui";
import { SAMPLE_KEYS, SAMPLES, type SampleKey } from "../lib/samples";
import { generateMockData } from "../lib/mock";
import { summarizeSchema } from "../lib/validate";
import { formatBytes } from "../lib/diff";
import { cn } from "../utils/cn";

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

function cellValue(value: unknown) {
  if (value === null) return <span className="text-slate-600">null</span>;
  if (typeof value === "string") return <span className="text-emerald-300/90">{value}</span>;
  if (typeof value === "number") return <span className="text-amber-300/90">{value}</span>;
  if (typeof value === "boolean") return <span className="text-violet-300/90">{String(value)}</span>;
  if (Array.isArray(value)) return <span className="text-sky-300/80">[{value.length} items]</span>;
  if (typeof value === "object") return <span className="text-sky-300/80">{`{${Object.keys(value as object).length} fields}`}</span>;
  return <span>{String(value)}</span>;
}

export function MockView({
  schemaText,
  sampleKey,
  onSelectSample,
}: {
  schemaText: string;
  sampleKey: SampleKey;
  onSelectSample: (key: SampleKey) => void;
}) {
  const notify = useToast();
  const [count, setCount] = useState(5);
  const [seed, setSeed] = useState("schemapulse");
  const [nonce, setNonce] = useState(0);
  const [pretty, setPretty] = useState(true);
  const [includeOptional, setIncludeOptional] = useState(true);
  const [uniqueEmails, setUniqueEmails] = useState(true);
  const [wrapArray, setWrapArray] = useState(true);
  const [view, setView] = useState<"json" | "table">("json");

  const summary = useMemo(() => summarizeSchema(schemaText), [schemaText]);
  const result = useMemo(
    () =>
      generateMockData(schemaText, {
        count,
        seed: `${seed}:${nonce}`,
        pretty,
        includeOptional,
        uniqueEmails,
        wrapArray,
      }),
    [schemaText, count, seed, nonce, pretty, includeOptional, uniqueEmails, wrapArray],
  );

  const rows = useMemo(() => {
    if (!result.ok) return [];
    try {
      const parsed = JSON.parse(result.text) as unknown;
      if (Array.isArray(parsed)) return parsed;
      return [parsed];
    } catch {
      return [];
    }
  }, [result]);

  const size = useMemo(() => new TextEncoder().encode(result.text).length, [result.text]);
  const filename = `mock-${sampleKey}-${count}.json`;

  const regenerate = () => {
    setNonce((value) => value + 1);
    notify(`Generated ${count} record${count === 1 ? "" : "s"}`);
  };

  return (
    <div className="animate-rise-in space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400/90">
            <span className="h-1 w-1 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,1)]" />
            Workspace / 03
          </div>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight text-white sm:text-[26px]">
            Mock Data <span className="bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">Studio</span>
          </h1>
          <p className="mt-0.5 max-w-2xl text-[12.5px] leading-relaxed text-slate-500">
            Generate deterministic, schema-aware datasets for local testing, seeding and CI fixtures.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={sampleKey}
              onChange={(event) => onSelectSample(event.target.value as SampleKey)}
              aria-label="Schema template"
              className="h-9 appearance-none rounded-lg border border-white/10 bg-white/[0.03] pl-8 pr-8 text-[12px] font-medium text-slate-200 outline-none transition hover:border-white/20 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/15"
            >
              {SAMPLE_KEYS.map((key) => (
                <option key={key} value={key} className="bg-[#0d1420] text-slate-200">
                  {SAMPLES[key].label}
                </option>
              ))}
            </select>
            <Layers className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-violet-300" />
          </div>
          <Button variant="primary" size="md" onClick={regenerate}>
            <Sparkles className="h-3.5 w-3.5" />
            Generate {count} record{count === 1 ? "" : "s"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[330px_1fr] xl:grid-cols-[360px_1fr]">
        <Card className="h-fit">
          <PanelHeader
            icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
            title="Generator Configuration"
            subtitle="Schema-aware output settings"
            actions={<Badge tone="violet" dot>live</Badge>}
          />
          <div className="space-y-3.5 p-3">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md border border-violet-400/25 bg-violet-500/10 text-violet-300">
                  <Braces className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-semibold text-slate-200">
                    {summary?.title ?? "Unrecognized schema"}
                  </div>
                  <div className="truncate font-mono text-[10px] text-slate-500">
                    {summary?.id || "from validator workspace"}
                  </div>
                </div>
                <Badge tone={result.ok ? "emerald" : "rose"} dot>
                  {result.ok ? "ready" : "error"}
                </Badge>
              </div>
            </div>

            <div>
              <FieldLabel hint={`${count} / 50`}>Record count</FieldLabel>
              <div className="flex items-center gap-2.5">
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={count}
                  aria-label="Record count"
                  onChange={(event) => setCount(Number(event.target.value))}
                  className="h-1.5 flex-1 cursor-pointer"
                />
                <div className="flex h-8 w-11 items-center justify-center rounded-md border border-white/10 bg-black/30 font-mono text-[13px] font-semibold text-violet-200">
                  {count}
                </div>
              </div>
              <div className="mt-2 flex gap-1">
                {[1, 5, 10, 25, 50].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCount(value)}
                    className={cn(
                      "flex-1 rounded border px-1 py-1 font-mono text-[10px] transition",
                      count === value
                        ? "border-violet-400/30 bg-violet-500/15 text-violet-200"
                        : "border-white/[0.07] bg-white/[0.02] text-slate-500 hover:text-slate-300",
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel hint="deterministic">Seed</FieldLabel>
              <div className="flex gap-1.5">
                <TextInput value={seed} onChange={setSeed} placeholder="schemapulse" ariaLabel="Random seed" />
                <Button
                  variant="outline"
                  size="icon"
                  title="Randomize seed"
                  aria-label="Randomize seed"
                  onClick={() => {
                    setSeed(randomSeed());
                    setNonce((value) => value + 1);
                    notify("New seed generated", "info");
                  }}
                >
                  <Dices className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 font-mono text-[10px] text-slate-600">seed: {seed}:{nonce}</p>
            </div>

            <div className="space-y-1.5">
              <Switch checked={pretty} onChange={setPretty} label="Pretty print" description="2-space indentation" />
              <Switch
                checked={includeOptional}
                onChange={setIncludeOptional}
                label="Include optional fields"
                description="Fill non-required properties"
              />
              <Switch
                checked={uniqueEmails}
                onChange={setUniqueEmails}
                label="Unique emails"
                description="Avoid duplicate addresses"
              />
              <Switch checked={wrapArray} onChange={setWrapArray} label="Wrap in array" description="Return a collection" />
            </div>

            <div className="flex gap-1.5">
              <Button variant="primary" size="md" className="flex-1" onClick={regenerate}>
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </Button>
              <Button
                variant="outline"
                size="md"
                title="Reset configuration"
                aria-label="Reset configuration"
                onClick={() => {
                  setCount(5);
                  setSeed("schemapulse");
                  setNonce(0);
                  setPretty(true);
                  setIncludeOptional(true);
                  setUniqueEmails(true);
                  setWrapArray(true);
                  notify("Configuration reset", "info");
                }}
              >
                <Wand2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex items-start gap-1.5 rounded-lg border border-indigo-400/15 bg-indigo-500/[0.06] px-2.5 py-2">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-indigo-300" />
              <p className="text-[10.5px] leading-relaxed text-indigo-200/70">
                Values are derived from schema formats, patterns, bounds and property names. The same seed always yields the
                same dataset.
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-3.5">
          <Card glow={result.ok ? "emerald" : "rose"}>
            <PanelHeader
              icon={<Database className="h-3.5 w-3.5" />}
              tone="emerald"
              title="Generated Dataset"
              subtitle={result.ok ? `${result.records} records · ${formatBytes(size)}` : "Generation failed"}
              actions={
                <>
                  <CopyButton text={result.text} size="icon-sm" variant="ghost" label="Copy dataset" toastMessage="Dataset copied" />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Download JSON"
                    aria-label="Download JSON"
                    onClick={() => {
                      downloadFile(filename, result.text, "application/json");
                      notify(`Downloaded ${filename}`);
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </>
              }
            />
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.05] px-3 py-2">
              <Segmented
                value={view}
                onChange={setView}
                options={[
                  { value: "json", label: "JSON", icon: <FileJson className="h-3 w-3" /> },
                  { value: "table", label: "Table", icon: <Table2 className="h-3 w-3" /> },
                ]}
              />
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                <Badge tone="emerald">
                  <Rows3 className="h-2.5 w-2.5" />
                  {result.records} rows
                </Badge>
                <Badge tone="indigo">
                  <Hash className="h-2.5 w-2.5" />
                  {result.fields} fields
                </Badge>
                <Badge tone="slate">
                  <Clock className="h-2.5 w-2.5" />
                  {result.elapsedMs.toFixed(1)}ms
                </Badge>
              </div>
            </div>

            {!result.ok ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-400/25 bg-rose-500/10 text-rose-300">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <p className="text-[13px] font-semibold text-rose-200">Cannot generate mock data</p>
                <p className="max-w-sm text-[11.5px] leading-relaxed text-slate-500">{result.error}</p>
                <Button variant="outline" size="sm" className="mt-1" onClick={() => onSelectSample("user")}>
                  <Braces className="h-3.5 w-3.5" />
                  Load User schema
                </Button>
              </div>
            ) : view === "json" ? (
              <div className="p-2.5">
                <CodeEditor
                  value={result.text}
                  readOnly
                  language="json"
                  ariaLabel="Generated mock data"
                  className="h-[360px] sm:h-[430px] xl:h-[470px]"
                />
              </div>
            ) : (
              <div className="max-h-[360px] overflow-auto sm:max-h-[430px] xl:max-h-[470px]">
                {result.columns.length === 0 ? (
                  <EmptyState
                    icon={<Table2 className="h-5 w-5" />}
                    title="Tabular preview unavailable"
                    description="The generated dataset is not an array of flat objects. Switch to JSON view."
                  />
                ) : (
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-[#0d1420]/95 backdrop-blur">
                      <tr className="border-b border-white/[0.07]">
                        <th className="w-10 px-2 py-2 text-right font-mono text-[10px] font-medium text-slate-600">#</th>
                        {result.columns.map((column) => (
                          <th
                            key={column}
                            className="whitespace-nowrap px-2.5 py-2 font-mono text-[10.5px] font-semibold text-violet-300"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 50).map((row, index) => (
                        <tr key={index} className="border-b border-white/[0.03] transition hover:bg-white/[0.025]">
                          <td className="px-2 py-1.5 text-right font-mono text-[10px] text-slate-600">{index + 1}</td>
                          {result.columns.map((column) => {
                            const value = (row as Record<string, unknown>)[column];
                            return (
                              <td
                                key={column}
                                className="max-w-[220px] truncate whitespace-nowrap px-2.5 py-1.5 font-mono text-[11px] text-slate-300"
                              >
                                {cellValue(value)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] bg-black/20 px-3 py-2">
              <CheckCircle2 className="h-3 w-3 text-emerald-400/80" />
              <span className="font-mono text-[10px] text-slate-500">
                {filename} · seed {seed}:{nonce}
              </span>
              <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] text-slate-600">
                <Gauge className="h-3 w-3" />
                {result.ok ? `${formatBytes(size)} generated` : "no output"}
              </span>
            </div>
          </Card>

          <Card>
            <PanelHeader
              icon={<Layers className="h-3.5 w-3.5" />}
              tone="indigo"
              title="Schema Coverage"
              subtitle="Fields the generator will populate"
              actions={<Badge tone="violet">{summary?.properties.length ?? 0} detected</Badge>}
            />
            <div className="flex flex-wrap gap-1.5 p-3">
              {summary && summary.properties.length > 0 ? (
                summary.properties.map((property, index) => (
                  <span
                    key={`${property.name}-${property.depth}-${index}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.07] bg-white/[0.02] px-2 py-1 font-mono text-[10.5px] text-slate-300"
                  >
                    <span className={cn("h-1 w-1 rounded-full", property.required ? "bg-emerald-400" : "bg-slate-600")} />
                    {property.name}
                    <span className="text-[9.5px] text-sky-300/70">{property.type}</span>
                  </span>
                ))
              ) : (
                <p className="text-[11.5px] text-slate-500">Load a schema in the validator to populate fields.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

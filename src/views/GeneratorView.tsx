import { useMemo, useState } from "react";
import {
  ArrowRight,
  Braces,
  Check,
  Code2,
  Download,
  Eraser,
  FileCode2,
  FileJson,
  Layers,
  ListTree,
  RotateCcw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { CodeEditor } from "../components/CodeEditor";
import {
  Badge,
  Button,
  Card,
  CopyButton,
  FieldLabel,
  PanelHeader,
  Segmented,
  Switch,
  TextInput,
  downloadFile,
  useToast,
} from "../components/ui";
import { SAMPLE_KEYS, SAMPLES, type SampleKey, sampleStrings } from "../lib/samples";
import { generateTypes, toPascalCase } from "../lib/generate";
import { parseJson } from "../lib/validate";
import { cn } from "../utils/cn";

type OutputTab = "typescript" | "zod" | "pydantic";

const SAMPLE_ROOT: Record<SampleKey, string> = {
  user: "User",
  transaction: "Transaction",
  iot: "IoTSensorLog",
  product: "Product",
};

const OUTPUT_META: Record<OutputTab, { label: string; filename: string; language: "ts" | "python"; mime: string }> = {
  typescript: { label: "TypeScript", filename: "types.ts", language: "ts", mime: "text/typescript" },
  zod: { label: "Zod", filename: "schemas.ts", language: "ts", mime: "text/typescript" },
  pydantic: { label: "Pydantic", filename: "models.py", language: "python", mime: "text/x-python" },
};

export function GeneratorView({
  payloadText,
  sampleKey,
  onSelectSample,
}: {
  payloadText: string;
  sampleKey: SampleKey;
  onSelectSample: (key: SampleKey) => void;
}) {
  const notify = useToast();
  const [sourceText, setSourceText] = useState(payloadText);
  const [rootName, setRootName] = useState(SAMPLE_ROOT[sampleKey]);
  const [declaration, setDeclaration] = useState<"interface" | "type">("interface");
  const [readonly, setReadonly] = useState(false);
  const [strictOptional, setStrictOptional] = useState(true);
  const [outputTab, setOutputTab] = useState<OutputTab>("typescript");
  const [activeSample, setActiveSample] = useState<SampleKey>(sampleKey);

  const parsed = useMemo(() => parseJson(sourceText), [sourceText]);
  const generated = useMemo(
    () => generateTypes(sourceText, { rootName, declaration, readonly, strictOptional }),
    [sourceText, rootName, declaration, readonly, strictOptional],
  );

  const output = generated[outputTab];
  const meta = OUTPUT_META[outputTab];

  const loadSample = (key: SampleKey) => {
    setSourceText(sampleStrings(key).payload);
    setRootName(SAMPLE_ROOT[key]);
    setActiveSample(key);
    onSelectSample(key);
    notify(`${SAMPLES[key].label} sample loaded`);
  };

  const formatSource = () => {
    try {
      setSourceText(JSON.stringify(JSON.parse(sourceText), null, 2));
      notify("Source JSON formatted");
    } catch {
      notify("Source JSON has a syntax error", "error");
    }
  };

  const handleExport = () => {
    downloadFile(meta.filename, output, `${meta.mime};charset=utf-8`);
    notify(`Downloaded ${meta.filename}`);
  };

  return (
    <div className="animate-rise-in space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400/90">
            <span className="h-1 w-1 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,1)]" />
            Workspace / 02
          </div>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight text-white sm:text-[26px]">
            Instant <span className="bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">Type Generator</span>
          </h1>
          <p className="mt-0.5 max-w-2xl text-[12.5px] leading-relaxed text-slate-500">
            Convert raw JSON samples into production-ready TypeScript interfaces, Zod schemas and Pydantic models.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              setSourceText(payloadText);
              notify("Pulled payload from the validator", "info");
            }}
          >
            <ArrowRight className="h-3.5 w-3.5" />
            Pull from validator
          </Button>
          <Button variant="primary" size="md" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            Export {meta.label}
          </Button>
        </div>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-2">
        <Card glow="violet">
          <PanelHeader
            icon={<FileJson className="h-3.5 w-3.5" />}
            title="Source JSON"
            subtitle="Paste a representative API response"
            actions={
              <>
                <CopyButton text={sourceText} size="icon-sm" variant="ghost" label="Copy source" />
                <Button variant="ghost" size="icon-sm" title="Format JSON" aria-label="Format JSON" onClick={formatSource}>
                  <Wand2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Clear source"
                  aria-label="Clear source"
                  onClick={() => setSourceText("")}
                >
                  <Eraser className="h-3.5 w-3.5" />
                </Button>
              </>
            }
          />
          <div className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.05] px-3 py-2">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Samples</span>
            {SAMPLE_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => loadSample(key)}
                className={cn(
                  "rounded-md border px-2 py-0.5 font-mono text-[10.5px] transition",
                  activeSample === key
                    ? "border-violet-400/30 bg-violet-500/15 text-violet-200"
                    : "border-white/[0.07] bg-white/[0.02] text-slate-500 hover:border-white/15 hover:text-slate-300",
                )}
              >
                {SAMPLES[key].short}
              </button>
            ))}
            <Badge tone={parsed.ok ? "emerald" : "rose"} dot className="ml-auto">
              {parsed.ok ? "parsed" : "syntax error"}
            </Badge>
          </div>
          <div className="p-2.5">
            <CodeEditor
              value={sourceText}
              onChange={setSourceText}
              language="json"
              ariaLabel="Source JSON editor"
              className="h-[320px] sm:h-[380px]"
            />
          </div>
          {!parsed.ok ? (
            <div className="border-t border-rose-400/20 bg-rose-500/[0.07] px-3 py-2 text-[11px] text-rose-200">
              {parsed.message} · line {parsed.line}, column {parsed.column}
            </div>
          ) : null}
          <div className="grid gap-2.5 border-t border-white/[0.06] p-3 sm:grid-cols-2">
            <div>
              <FieldLabel hint="identifier">Root name</FieldLabel>
              <TextInput value={rootName} onChange={setRootName} placeholder="User" ariaLabel="Root type name" />
            </div>
            <div>
              <FieldLabel hint="declaration">Output style</FieldLabel>
              <Segmented
                value={declaration}
                onChange={setDeclaration}
                size="md"
                className="w-full justify-between"
                options={[
                  { value: "interface", label: "interface" },
                  { value: "type", label: "type" },
                ]}
              />
            </div>
            <Switch
              checked={readonly}
              onChange={setReadonly}
              label="Readonly properties"
              description="Emit readonly modifiers"
            />
            <Switch
              checked={strictOptional}
              onChange={setStrictOptional}
              label="Strict optional"
              description="Use ? instead of | undefined"
            />
          </div>
        </Card>

        <Card glow="emerald">
          <PanelHeader
            icon={<Code2 className="h-3.5 w-3.5" />}
            tone="emerald"
            title="Generated Output"
            subtitle={`${meta.filename} · ${generated.stats.lines} lines`}
            actions={
              <>
                <CopyButton text={output} size="icon-sm" variant="ghost" label={`Copy ${meta.label}`} toastMessage={`${meta.label} copied`} />
                <Button variant="ghost" size="icon-sm" title="Download file" aria-label="Download file" onClick={handleExport}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </>
            }
          />
          <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.05] px-3 py-2">
            <Segmented
              value={outputTab}
              onChange={setOutputTab}
              options={[
                { value: "typescript", label: "TypeScript" },
                { value: "zod", label: "Zod" },
                { value: "pydantic", label: "Pydantic" },
              ]}
            />
            <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400/80">
              <Check className="h-3 w-3" />
              generated
            </span>
          </div>
          <div className="p-2.5">
            <CodeEditor
              value={output}
              readOnly
              language={meta.language}
              ariaLabel={`${meta.label} output`}
              className="h-[320px] sm:h-[380px]"
            />
          </div>
          <div className="grid grid-cols-4 gap-2 border-t border-white/[0.06] px-3 py-2.5">
            <div>
              <div className="text-[9.5px] uppercase tracking-wider text-slate-600">Declarations</div>
              <div className="font-mono text-[12px] font-semibold text-violet-300">{generated.stats.interfaces}</div>
            </div>
            <div>
              <div className="text-[9.5px] uppercase tracking-wider text-slate-600">Properties</div>
              <div className="font-mono text-[12px] font-semibold text-sky-300">{generated.stats.properties}</div>
            </div>
            <div>
              <div className="text-[9.5px] uppercase tracking-wider text-slate-600">Depth</div>
              <div className="font-mono text-[12px] font-semibold text-indigo-300">{generated.stats.depth}</div>
            </div>
            <div>
              <div className="text-[9.5px] uppercase tracking-wider text-slate-600">Lines</div>
              <div className="font-mono text-[12px] font-semibold text-emerald-300">{generated.stats.lines}</div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <PanelHeader
          icon={<ListTree className="h-3.5 w-3.5" />}
          tone="indigo"
          title="Inferred Type Map"
          subtitle="Every detected property and its inferred TypeScript type"
          actions={
            <>
              <Badge tone="violet">{generated.typeMap.length} nodes</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRootName(toPascalCase(rootName || "Root"));
                  setDeclaration("interface");
                  setReadonly(false);
                  setStrictOptional(true);
                  notify("Generation options reset", "info");
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </>
          }
        />
        {generated.typeMap.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <Braces className="h-6 w-6 text-slate-600" />
            <p className="text-[12.5px] font-medium text-slate-300">No types inferred yet</p>
            <p className="max-w-sm text-[11.5px] text-slate-500">Add a valid JSON object on the left to generate a type map.</p>
          </div>
        ) : (
          <div className="max-h-[300px] overflow-auto">
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-[#0d1420]/95 backdrop-blur">
                <tr className="border-b border-white/[0.07]">
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Property path</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Inferred type</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Presence</th>
                </tr>
              </thead>
              <tbody>
                {generated.typeMap.map((row) => (
                  <tr key={row.path} className="border-b border-white/[0.03] transition hover:bg-white/[0.025]">
                    <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px] text-slate-300">
                      <span className="text-slate-600">$.</span>
                      {row.path}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="rounded border border-sky-400/20 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[10.5px] text-sky-300">
                        {row.type}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <span
                        className={cn(
                          "font-mono text-[10px] uppercase tracking-wider",
                          row.optional ? "text-amber-400/80" : "text-emerald-400/80",
                        )}
                      >
                        {row.optional ? "optional" : "required"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] bg-black/20 px-3 py-2">
          <Sparkles className="h-3 w-3 text-violet-300" />
          <span className="text-[10.5px] text-slate-500">
            Nested objects are extracted into named declarations. Arrays merge element shapes automatically.
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <FileCode2 className="h-3 w-3 text-slate-600" />
            <span className="font-mono text-[10px] text-slate-600">{meta.filename}</span>
            <Layers className="ml-1 h-3 w-3 text-slate-600" />
            <span className="font-mono text-[10px] text-slate-600">{toPascalCase(rootName || "Root")}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

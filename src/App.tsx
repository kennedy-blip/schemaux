import { useCallback, useMemo, useState } from "react";
import { Braces, Database, GitCompare, ShieldCheck, Sparkles } from "lucide-react";
import { Header, type TabKey } from "./components/Header";
import { ToastProvider, downloadFile, useToast } from "./components/ui";
import { ValidatorView } from "./views/ValidatorView";
import { GeneratorView } from "./views/GeneratorView";
import { MockView } from "./views/MockView";
import { DiffView } from "./views/DiffView";
import { SAMPLE_KEYS, SAMPLES, type SampleKey, sampleStrings } from "./lib/samples";
import { generateTypes, toPascalCase } from "./lib/generate";
import { parseJson, validatePayload } from "./lib/validate";

const SAMPLE_ROOT: Record<SampleKey, string> = {
  user: "User",
  transaction: "Transaction",
  iot: "IoTSensorLog",
  product: "Product",
};

function Workspace() {
  const notify = useToast();
  const [tab, setTab] = useState<TabKey>("validator");
  const [sampleKey, setSampleKey] = useState<SampleKey>("user");
  const [schemaText, setSchemaText] = useState(() => sampleStrings("user").schema);
  const [payloadText, setPayloadText] = useState(() => sampleStrings("user").payload);

  const validation = useMemo(() => validatePayload(schemaText, payloadText), [schemaText, payloadText]);
  const payloadValid = validation.status === "empty" ? null : validation.status === "valid";

  const selectSample = useCallback(
    (key: SampleKey) => {
      const strings = sampleStrings(key);
      setSampleKey(key);
      setSchemaText(strings.schema);
      setPayloadText(strings.payload);
      notify(`${SAMPLES[key].label} schema loaded`);
    },
    [notify],
  );

  const loadNextSample = useCallback(() => {
    const index = SAMPLE_KEYS.indexOf(sampleKey);
    const next = SAMPLE_KEYS[(index + 1) % SAMPLE_KEYS.length];
    const strings = sampleStrings(next);
    setSampleKey(next);
    setSchemaText(strings.schema);
    setPayloadText(strings.payload);
    setTab("validator");
    notify(`Loaded ${SAMPLES[next].label} sample`);
  }, [sampleKey, notify]);

  const exportTypes = useCallback(() => {
    const parsed = parseJson(payloadText);
    if (!parsed.ok) {
      notify("Fix the payload syntax error before exporting types", "error");
      return;
    }
    const generated = generateTypes(payloadText, {
      rootName: SAMPLE_ROOT[sampleKey],
      declaration: "interface",
      readonly: false,
      strictOptional: true,
    });
    const filename = `${toPascalCase(SAMPLE_ROOT[sampleKey]).replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()}.types.ts`;
    downloadFile(filename, generated.typescript, "text/typescript;charset=utf-8");
    notify(`Exported ${filename}`);
  }, [payloadText, sampleKey, notify]);

  return (
    <div className="relative min-h-screen bg-[#080c14] text-slate-200">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="grid-backdrop absolute inset-0 opacity-70" />
        <div className="animate-float-slow absolute -top-48 left-[12%] h-[440px] w-[440px] rounded-full bg-violet-600/[0.13] blur-[130px]" />
        <div className="absolute -top-24 right-[4%] h-[380px] w-[380px] rounded-full bg-indigo-600/[0.12] blur-[130px]" />
        <div className="absolute bottom-0 left-[30%] h-[320px] w-[320px] rounded-full bg-emerald-600/[0.05] blur-[130px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header
          active={tab}
          onTabChange={setTab}
          onLoadSample={loadNextSample}
          onExportTypes={exportTypes}
          payloadValid={payloadValid}
        />

        <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
          <div key={tab}>
            {tab === "validator" ? (
              <ValidatorView
                schemaText={schemaText}
                setSchemaText={setSchemaText}
                payloadText={payloadText}
                setPayloadText={setPayloadText}
                sampleKey={sampleKey}
                onSelectSample={selectSample}
              />
            ) : null}
            {tab === "generator" ? (
              <GeneratorView payloadText={payloadText} sampleKey={sampleKey} onSelectSample={selectSample} />
            ) : null}
            {tab === "mock" ? (
              <MockView schemaText={schemaText} sampleKey={sampleKey} onSelectSample={selectSample} />
            ) : null}
            {tab === "diff" ? <DiffView payloadText={payloadText} /> : null}
          </div>
        </main>

        <footer className="mt-2 border-t border-white/[0.06] bg-[#080c14]/60">
          <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-3 px-3 py-4 sm:px-5 lg:px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-violet-400/25 bg-gradient-to-br from-violet-500 to-indigo-600">
                <Braces className="h-3 w-3 text-white" />
              </div>
              <span className="text-[11.5px] font-semibold text-slate-300">SchemaPulse</span>
              <span className="font-mono text-[10px] text-slate-600">v2.4.0</span>
            </div>
            <p className="hidden text-[10.5px] text-slate-600 sm:block">
              Local-first developer utility — schemas and payloads never leave your browser.
            </p>
            <div className="ml-auto flex flex-wrap items-center gap-3 font-mono text-[10px] text-slate-600">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-500/70" />
                AJV 8 · draft 2020-12
              </span>
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-violet-400/70" />
                TypeScript · Zod · Pydantic
              </span>
              <span className="hidden items-center gap-1 md:inline-flex">
                <Database className="h-3 w-3 text-indigo-400/70" />
                Deterministic mocks
              </span>
              <span className="hidden items-center gap-1 lg:inline-flex">
                <GitCompare className="h-3 w-3 text-slate-500" />
                LCS diff
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Workspace />
    </ToastProvider>
  );
}

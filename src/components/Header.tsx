import { Braces, Database, Download, GitCompare, Layers, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { Badge, Button } from "./ui";
import { cn } from "../utils/cn";

export type TabKey = "validator" | "generator" | "mock" | "diff";

const TABS: Array<{ key: TabKey; label: string; short: string; icon: typeof ShieldCheck }> = [
  { key: "validator", label: "Schema Validator", short: "Validator", icon: ShieldCheck },
  { key: "generator", label: "TS/Zod Generator", short: "Generator", icon: Braces },
  { key: "mock", label: "Mock Data Studio", short: "Mock Studio", icon: Database },
  { key: "diff", label: "Diff Analyzer", short: "Diff", icon: GitCompare },
];

function LogoMark() {
  return (
    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-300/25 bg-gradient-to-br from-violet-500 via-indigo-500 to-indigo-600 shadow-[0_0_28px_-6px_rgba(139,92,246,0.85)]">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/25 to-transparent opacity-60" />
      <svg viewBox="0 0 24 24" fill="none" className="relative h-[22px] w-[22px] text-white">
        <rect x="9" y="2.5" width="6" height="5" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2.5" y="16.5" width="6" height="5" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
        <rect x="15.5" y="16.5" width="6" height="5" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 7.5v4.2M5.5 16.5v-2.3a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      </svg>
      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-[#080c14] bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
    </div>
  );
}

export function Header({
  active,
  onTabChange,
  onLoadSample,
  onExportTypes,
  payloadValid,
}: {
  active: TabKey;
  onTabChange: (tab: TabKey) => void;
  onLoadSample: () => void;
  onExportTypes: () => void;
  payloadValid: boolean | null;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#080c14]/85 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />
      <div className="mx-auto max-w-[1600px] px-3 sm:px-5 lg:px-6">
        <div className="flex h-16 items-center gap-3">
          <button
            type="button"
            onClick={() => onTabChange("validator")}
            className="flex min-w-0 items-center gap-2.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
            aria-label="SchemaPulse home"
          >
            <LogoMark />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[17px] font-bold tracking-tight text-white">
                  Schema<span className="text-glow-violet bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">Pulse</span>
                </span>
                <span className="hidden rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[9px] font-medium text-slate-500 sm:inline">
                  v2.4
                </span>
              </div>
              <p className="hidden truncate text-[10.5px] font-medium tracking-wide text-slate-500 sm:block">
                Schema engineering workspace
              </p>
            </div>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/[0.07] px-2.5 py-1.5 lg:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
              </span>
              <span className="text-[11.5px] font-medium text-emerald-200">Validation Engine: Active</span>
            </div>

            {payloadValid !== null ? (
              <Badge tone={payloadValid ? "emerald" : "rose"} dot className="hidden xl:inline-flex">
                {payloadValid ? "Payload valid" : "Payload invalid"}
              </Badge>
            ) : null}

            <Button variant="outline" size="md" onClick={onLoadSample} className="hidden sm:inline-flex">
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Load Sample Schema</span>
              <span className="md:hidden">Sample</span>
            </Button>
            <Button variant="primary" size="md" onClick={onExportTypes}>
              <Download className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Export TypeScript</span>
              <span className="md:hidden">Export TS</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={onLoadSample} className="sm:hidden" aria-label="Load sample schema">
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 pb-2">
          <nav
            aria-label="Workspace sections"
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = active === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onTabChange(tab.key)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group relative flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-all duration-150",
                    isActive
                      ? "border-violet-400/25 bg-violet-500/[0.12] text-violet-100 shadow-[0_0_20px_-8px_rgba(139,92,246,0.9)]"
                      : "border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", isActive ? "text-violet-300" : "text-slate-500 group-hover:text-slate-300")} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.short}</span>
                  {isActive ? (
                    <span className="absolute inset-x-2 -bottom-[9px] h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent" />
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <div className="flex items-center gap-1.5 rounded-md border border-white/[0.07] bg-white/[0.02] px-2 py-1">
              <Layers className="h-3 w-3 text-slate-500" />
              <span className="font-mono text-[10px] text-slate-500">workspace / default</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-violet-400/20 bg-violet-500/[0.08] px-2 py-1">
              <Sparkles className="h-3 w-3 text-violet-300" />
              <span className="font-mono text-[10px] text-violet-200">draft 2020-12</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { AlertTriangle, Check, CheckCircle2, Copy, Info, X } from "lucide-react";
import { cn } from "../utils/cn";

/* ------------------------------------------------------------------ */
/* Clipboard + download helpers                                        */
/* ------------------------------------------------------------------ */

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function downloadFile(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => undefined);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const notify = useCallback((message: string, tone: ToastTone = "success") => {
    counter.current += 1;
    const id = counter.current;
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2600);
  }, []);

  const icons: Record<ToastTone, ReactNode> = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    error: <AlertTriangle className="h-4 w-4 text-rose-400" />,
    info: <Info className="h-4 w-4 text-indigo-300" />,
  };

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-toast-in pointer-events-auto flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#0d1420]/95 px-3.5 py-2.5 text-[13px] font-medium text-slate-200 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          >
            {icons[toast.tone]}
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              className="ml-1 rounded p-0.5 text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "violet" | "outline" | "ghost" | "success" | "danger";
type ButtonSize = "sm" | "md" | "icon" | "icon-sm";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_10px_26px_-12px_rgba(99,102,241,0.95)] hover:from-indigo-400 hover:to-violet-400 active:translate-y-px",
  violet:
    "border border-violet-400/25 bg-violet-500/15 text-violet-100 hover:border-violet-400/40 hover:bg-violet-500/25",
  outline: "border border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/20 hover:bg-white/[0.07]",
  ghost: "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100",
  success: "border border-emerald-400/25 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25",
  danger: "border border-rose-400/25 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-2.5 text-[12px]",
  md: "h-9 gap-2 rounded-lg px-3.5 text-[13px]",
  icon: "h-9 w-9 rounded-lg",
  "icon-sm": "h-7 w-7 rounded-md",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = "outline", size = "md", className, children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex select-none items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080c14] disabled:pointer-events-none disabled:opacity-40",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className,
  glow,
}: {
  children: ReactNode;
  className?: string;
  glow?: "violet" | "emerald" | "rose" | "none";
}) {
  const glowClass =
    glow === "violet"
      ? "shadow-[0_0_60px_-24px_rgba(139,92,246,0.55)]"
      : glow === "emerald"
        ? "shadow-[0_0_60px_-24px_rgba(16,185,129,0.5)]"
        : glow === "rose"
          ? "shadow-[0_0_60px_-24px_rgba(244,63,94,0.5)]"
          : "";
  return (
    <section
      className={cn(
        "panel-sheen relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111827]/85 shadow-[0_20px_60px_-40px_rgba(0,0,0,1)] backdrop-blur-sm",
        glowClass,
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  icon,
  title,
  subtitle,
  actions,
  tone = "violet",
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  tone?: "violet" | "emerald" | "rose" | "indigo" | "slate";
  className?: string;
}) {
  const tones: Record<string, string> = {
    violet: "border-violet-400/25 bg-violet-500/10 text-violet-300",
    emerald: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
    rose: "border-rose-400/25 bg-rose-500/10 text-rose-300",
    indigo: "border-indigo-400/25 bg-indigo-500/10 text-indigo-300",
    slate: "border-white/10 bg-white/[0.04] text-slate-300",
  };
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2.5 border-b border-white/[0.06] px-3 py-2.5 sm:px-4",
        className,
      )}
    >
      {icon ? (
        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md border", tones[tone])}>
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-[13px] font-semibold tracking-tight text-slate-100">{title}</h2>
        </div>
        {subtitle ? <p className="truncate text-[11px] text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "slate",
  className,
  dot,
}: {
  children: ReactNode;
  tone?: "slate" | "violet" | "emerald" | "rose" | "indigo" | "amber";
  className?: string;
  dot?: boolean;
}) {
  const tones: Record<string, string> = {
    slate: "border-white/10 bg-white/[0.04] text-slate-400",
    violet: "border-violet-400/25 bg-violet-500/10 text-violet-300",
    emerald: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
    rose: "border-rose-400/25 bg-rose-500/10 text-rose-300",
    indigo: "border-indigo-400/25 bg-indigo-500/10 text-indigo-300",
    amber: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  };
  const dots: Record<string, string> = {
    slate: "bg-slate-400",
    violet: "bg-violet-400",
    emerald: "bg-emerald-400",
    rose: "bg-rose-400",
    indigo: "bg-indigo-400",
    amber: "bg-amber-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", dots[tone])} /> : null}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Copy button                                                         */
/* ------------------------------------------------------------------ */

export function CopyButton({
  text,
  label = "Copy",
  className,
  size = "sm",
  variant = "outline",
  toastMessage = "Copied to clipboard",
}: {
  text: string;
  label?: string;
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
  toastMessage?: string;
}) {
  const [copied, setCopied] = useState(false);
  const notify = useToast();
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleCopy = async () => {
    const ok = await copyText(text);
    if (!ok) {
      notify("Clipboard unavailable in this browser", "error");
      return;
    }
    setCopied(true);
    notify(toastMessage);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn(copied && "!border-emerald-400/30 !bg-emerald-500/15 !text-emerald-200", className)}
      title={label}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {size === "icon" || size === "icon-sm" ? null : <span>{copied ? "Copied" : label}</span>}
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control                                                   */
/* ------------------------------------------------------------------ */

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  count?: number;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "sm",
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-white/[0.08] bg-black/30 p-0.5",
        className,
      )}
      role="tablist"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md font-medium transition-all duration-150",
              size === "sm" ? "h-7 px-2.5 text-[11.5px]" : "h-8 px-3 text-[12.5px]",
              active
                ? "bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-300",
            )}
          >
            {option.icon}
            {option.label}
            {typeof option.count === "number" ? (
              <span
                className={cn(
                  "rounded px-1 font-mono text-[10px]",
                  active ? "bg-violet-500/25 text-violet-200" : "bg-white/[0.06] text-slate-500",
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Switch                                                              */
/* ------------------------------------------------------------------ */

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left transition hover:border-white/[0.12] hover:bg-white/[0.04]"
    >
      <span className="min-w-0">
        <span className="block text-[12px] font-medium text-slate-200">{label}</span>
        {description ? <span className="block truncate text-[10.5px] text-slate-500">{description}</span> : null}
      </span>
      <span
        className={cn(
          "relative h-[18px] w-[32px] shrink-0 rounded-full border transition-all duration-200",
          checked
            ? "border-violet-400/40 bg-gradient-to-r from-indigo-500 to-violet-500 shadow-[0_0_14px_-2px_rgba(139,92,246,0.8)]"
            : "border-white/10 bg-white/[0.08]",
        )}
      >
        <span
          className={cn(
            "absolute top-[2px] h-[12px] w-[12px] rounded-full bg-white shadow transition-all duration-200",
            checked ? "left-[16px]" : "left-[2px] bg-slate-400",
          )}
        />
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export function Stat({
  label,
  value,
  tone = "slate",
  className,
}: {
  label: string;
  value: ReactNode;
  tone?: "slate" | "emerald" | "rose" | "violet" | "indigo" | "amber";
  className?: string;
}) {
  const tones: Record<string, string> = {
    slate: "text-slate-200",
    emerald: "text-emerald-300",
    rose: "text-rose-300",
    violet: "text-violet-300",
    indigo: "text-indigo-300",
    amber: "text-amber-300",
  };
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className={cn("mt-0.5 truncate font-mono text-[13px] font-semibold tabular-nums", tones[tone])}>{value}</div>
    </div>
  );
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <label className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">{children}</label>
      {hint ? <span className="font-mono text-[10px] text-slate-600">{hint}</span> : null}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  className,
  mono = true,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  mono?: boolean;
  ariaLabel?: string;
}) {
  return (
    <input
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      className={cn(
        "h-9 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 text-[12.5px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-violet-400/50 focus:bg-black/40 focus:ring-2 focus:ring-violet-500/15",
        mono && "font-mono",
        className,
      )}
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-500">
        {icon}
      </div>
      <p className="text-[13px] font-semibold text-slate-300">{title}</p>
      <p className="max-w-sm text-[12px] leading-relaxed text-slate-500">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
      {children}
    </kbd>
  );
}

export function useCopyState() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const trigger = useCallback(() => {
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  }, []);
  return useMemo(() => ({ copied, trigger }), [copied, trigger]);
}

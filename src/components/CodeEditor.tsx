import { useEffect, useMemo, useRef, type KeyboardEvent, type UIEvent } from "react";
import { highlightLine, type CodeLanguage } from "../lib/highlight";
import { cn } from "../utils/cn";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: CodeLanguage;
  readOnly?: boolean;
  className?: string;
  errorLines?: number[];
  warningLines?: number[];
  focusLine?: number | null;
  ariaLabel?: string;
}

const LINE_HEIGHT = 24;

export function CodeEditor({
  value,
  onChange,
  language = "json",
  readOnly = false,
  className,
  errorLines = [],
  warningLines = [],
  focusLine = null,
  ariaLabel = "Code editor",
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => value.split("\n"), [value]);
  const errorSet = useMemo(() => new Set(errorLines), [errorLines]);
  const warningSet = useMemo(() => new Set(warningLines), [warningLines]);

  const syncScroll = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (preRef.current) {
      preRef.current.scrollTop = textarea.scrollTop;
      preRef.current.scrollLeft = textarea.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = textarea.scrollTop;
    }
  };

  const handleScroll = (_event: UIEvent<HTMLTextAreaElement>) => syncScroll();

  useEffect(() => {
    syncScroll();
  }, [value]);

  useEffect(() => {
    if (!focusLine || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const target = Math.max(0, (focusLine - 1) * LINE_HEIGHT - textarea.clientHeight / 2 + LINE_HEIGHT);
    textarea.scrollTo({ top: target, behavior: "smooth" });
    syncScroll();
  }, [focusLine]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly || !onChange) return;
    const textarea = event.currentTarget;
    if (event.key === "Tab") {
      event.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const next = `${value.slice(0, start)}  ${value.slice(end)}`;
      onChange(next);
      requestAnimationFrame(() => {
        textarea.selectionStart = start + 2;
        textarea.selectionEnd = start + 2;
      });
      return;
    }
    if (event.key === "Enter") {
      const start = textarea.selectionStart;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const currentLine = value.slice(lineStart, start);
      const indentMatch = /^[ \t]*/.exec(currentLine);
      const indent = indentMatch ? indentMatch[0] : "";
      const opensBlock = /[{[(:]\s*$/.test(currentLine);
      const extra = opensBlock ? "  " : "";
      if (indent.length > 0 || opensBlock) {
        event.preventDefault();
        const insertion = `\n${indent}${extra}`;
        const next = `${value.slice(0, start)}${insertion}${value.slice(textarea.selectionEnd)}`;
        onChange(next);
        const caret = start + insertion.length;
        requestAnimationFrame(() => {
          textarea.selectionStart = caret;
          textarea.selectionEnd = caret;
        });
      }
    }
  };

  return (
    <div
      className={cn(
        "group relative flex min-h-0 overflow-hidden rounded-xl border border-white/[0.07] bg-[#070b12] transition-colors focus-within:border-violet-400/30",
        className,
      )}
    >
      <div
        ref={gutterRef}
        aria-hidden
        className="w-10 shrink-0 select-none overflow-hidden border-r border-white/[0.05] bg-black/25 py-3 text-right font-mono text-[10.5px] leading-6 text-slate-600"
      >
        {lines.map((_, index) => {
          const lineNumber = index + 1;
          const isError = errorSet.has(lineNumber);
          const isWarning = warningSet.has(lineNumber);
          return (
            <div
              key={lineNumber}
              className={cn(
                "h-6 pr-2 tabular-nums transition-colors",
                isError && "bg-rose-500/10 font-semibold text-rose-400",
                !isError && isWarning && "text-amber-400",
              )}
            >
              {lineNumber}
            </div>
          );
        })}
      </div>

      <div className="relative min-w-0 flex-1">
        <pre
          ref={preRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre px-3 py-3 font-mono text-[12.5px] leading-6"
        >
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            const isError = errorSet.has(lineNumber);
            const isWarning = warningSet.has(lineNumber);
            return (
              <div
                key={lineNumber}
                className={cn(
                  "-mx-3 min-h-6 px-3",
                  isError && "bg-rose-500/[0.09] shadow-[inset_2px_0_0_0_#f43f5e]",
                  !isError && isWarning && "bg-amber-400/[0.06]",
                )}
              >
                {highlightLine(line, language)}
              </div>
            );
          })}
        </pre>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap="off"
          aria-label={ariaLabel}
          style={{ WebkitTextFillColor: "transparent" }}
          className={cn(
            "absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre bg-transparent px-3 py-3 font-mono text-[12.5px] leading-6 text-transparent caret-violet-400 outline-none selection:bg-violet-500/30",
            readOnly ? "cursor-default" : "cursor-text",
          )}
        />
      </div>
    </div>
  );
}

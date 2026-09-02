import type { ReactNode } from "react";

export type CodeLanguage = "json" | "ts" | "python" | "text";

const COLORS = {
  key: "text-[#c4b5fd]",
  string: "text-[#6ee7b7]",
  number: "text-[#fcd34d]",
  keyword: "text-[#c084fc]",
  type: "text-[#7dd3fc]",
  literal: "text-[#fb7185]",
  punct: "text-slate-500",
  comment: "text-slate-500 italic",
  plain: "text-slate-300",
  decorator: "text-[#f0abfc]",
};

const JSON_RE =
  /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/g;

const TS_RE =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(import|export|from|const|let|var|function|return|interface|type|extends|implements|new|await|async|if|else|for|of|in|as|default|class|readonly|public|private|protected|typeof|keyof|infer|satisfies|declare|namespace|enum|switch|case|break|throw|try|catch)\b|\b(true|false|null|undefined|void|never|unknown|any|string|number|boolean|object|bigint|symbol)\b|\b([A-Z][A-Za-z0-9_]*)\b|(\b\d+(?:\.\d+)?\b)|([{}()[\];:,.<>=|&!?*/+-])/g;

const PY_RE =
  /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\b(from|import|class|def|return|if|else|elif|for|in|while|with|as|pass|None|True|False|and|or|not|is|lambda|yield|async|await|try|except|raise)\b|\b(str|int|float|bool|Any|List|Optional|Union|BaseModel|EmailStr|AnyUrl|Field|datetime|date|time)\b|(@[A-Za-z_][A-Za-z0-9_]*)|\b(\d+(?:\.\d+)?)\b|([{}()[\];:,.<>=|&!?*/+-])/g;

function push(tokens: ReactNode[], text: string, className: string, key: number) {
  if (!text) return;
  tokens.push(
    <span key={key} className={className}>
      {text}
    </span>,
  );
}

export function highlightLine(line: string, language: CodeLanguage): ReactNode {
  if (language === "text" || line.length === 0) return line || " ";
  const regex = language === "json" ? JSON_RE : language === "python" ? PY_RE : TS_RE;
  regex.lastIndex = 0;
  const tokens: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      push(tokens, line.slice(lastIndex, match.index), COLORS.plain, key++);
    }
    const [full, g1, g2, g3, g4, g5, g6, g7] = match;
    if (language === "json") {
      if (g1 !== undefined) {
        if (g2 !== undefined) {
          push(tokens, g1, COLORS.key, key++);
          push(tokens, g2, COLORS.punct, key++);
        } else {
          push(tokens, g1, COLORS.string, key++);
        }
      } else if (g3 !== undefined) {
        push(tokens, g3, COLORS.number, key++);
      } else if (g4 !== undefined) {
        push(tokens, g4, COLORS.literal, key++);
      } else if (g5 !== undefined) {
        push(tokens, g5, COLORS.punct, key++);
      }
    } else if (language === "python") {
      if (g1 !== undefined) push(tokens, g1, COLORS.comment, key++);
      else if (g2 !== undefined) push(tokens, g2, COLORS.string, key++);
      else if (g3 !== undefined) push(tokens, g3, COLORS.keyword, key++);
      else if (g4 !== undefined) push(tokens, g4, COLORS.type, key++);
      else if (g5 !== undefined) push(tokens, g5, COLORS.decorator, key++);
      else if (g6 !== undefined) push(tokens, g6, COLORS.number, key++);
      else if (g7 !== undefined) push(tokens, g7, COLORS.punct, key++);
    } else {
      if (g1 !== undefined) push(tokens, g1, COLORS.comment, key++);
      else if (g2 !== undefined) push(tokens, g2, COLORS.string, key++);
      else if (g3 !== undefined) push(tokens, g3, COLORS.keyword, key++);
      else if (g4 !== undefined) push(tokens, g4, COLORS.literal, key++);
      else if (g5 !== undefined) push(tokens, g5, COLORS.type, key++);
      else if (g6 !== undefined) push(tokens, g6, COLORS.number, key++);
      else if (g7 !== undefined) push(tokens, g7, COLORS.punct, key++);
    }
    lastIndex = match.index + full.length;
    if (full.length === 0) regex.lastIndex += 1;
  }
  if (lastIndex < line.length) {
    push(tokens, line.slice(lastIndex), COLORS.plain, key++);
  }
  return tokens.length > 0 ? tokens : " ";
}

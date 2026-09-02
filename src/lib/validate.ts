import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import type { ErrorObject, ValidateFunction } from "ajv";

export type Severity = "error" | "warning";

export interface ValidationIssue {
  id: string;
  path: string;
  label: string;
  message: string;
  keyword: string;
  line: number;
  column: number;
  severity: Severity;
}

export type ValidationStatus = "valid" | "invalid" | "schema-error" | "syntax-error" | "empty";

export interface ValidationCheck {
  label: string;
  state: "pass" | "fail" | "skip";
  hint: string;
}

export interface ValidationResult {
  status: ValidationStatus;
  title: string;
  detail: string;
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
  checks: ValidationCheck[];
  stats: {
    errors: number;
    warnings: number;
    depth: number;
    properties: number;
    elapsedMs: number;
    line: number;
    column: number;
  };
  schemaTitle: string;
  schemaId: string;
}

export interface SchemaProperty {
  name: string;
  type: string;
  required: boolean;
  format?: string;
  description?: string;
  depth: number;
}

export interface SchemaSummary {
  title: string;
  description: string;
  id: string;
  required: string[];
  properties: SchemaProperty[];
  formats: string[];
  depth: number;
  rootType: string;
}

export interface JsonParseSuccess {
  ok: true;
  value: unknown;
}
export interface JsonParseFailure {
  ok: false;
  message: string;
  line: number;
  column: number;
}
export type JsonParseResult = JsonParseSuccess | JsonParseFailure;

export function lineColFromIndex(text: string, index: number): { line: number; column: number } {
  const safe = Math.max(0, Math.min(index, text.length));
  const before = text.slice(0, safe);
  const lines = before.split("\n");
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

export function parseJson(text: string): JsonParseResult {
  if (!text.trim()) {
    return { ok: false, message: "Document is empty.", line: 1, column: 1 };
  }
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Invalid JSON";
    const lineCol = /line (\d+) column (\d+)/i.exec(raw);
    const pos = /position (\d+)/i.exec(raw);
    let line = 1;
    let column = 1;
    if (lineCol) {
      line = Number(lineCol[1]);
      column = Number(lineCol[2]);
    } else if (pos) {
      const mapped = lineColFromIndex(text, Number(pos[1]));
      line = mapped.line;
      column = mapped.column;
    }
    const cleaned = raw
      .replace(/\s*in JSON at position \d+.*$/i, "")
      .replace(/\s*\(line \d+ column \d+\)$/i, "")
      .trim();
    return { ok: false, message: cleaned || "Invalid JSON", line, column };
  }
}

function decodeToken(token: string): string {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

/** Best-effort mapping from a JSON pointer / instance path to a 1-based source line. */
export function lineForPath(text: string, instancePath: string): number {
  const tokens = instancePath
    .split("/")
    .slice(1)
    .map(decodeToken)
    .filter((token) => token.length > 0 && !/^\d+$/.test(token));
  if (tokens.length === 0) return 1;
  let cursor = 0;
  let line = 1;
  for (const token of tokens) {
    const needle = `"${token}"`;
    const found = text.indexOf(needle, cursor);
    if (found === -1) continue;
    line = lineColFromIndex(text, found).line;
    cursor = found + needle.length;
  }
  return line;
}

export function displayPath(instancePath: string): string {
  if (!instancePath) return "(root)";
  return instancePath
    .split("/")
    .slice(1)
    .map(decodeToken)
    .join(".");
}

function friendlyMessage(error: ErrorObject): string {
  const params = (error.params ?? {}) as Record<string, unknown>;
  const where = displayPath(error.instancePath);
  const target = where === "(root)" ? "Payload" : where;
  switch (error.keyword) {
    case "required":
      return `Missing required property "${String(params.missingProperty)}" at ${target}.`;
    case "additionalProperties":
      return `Unexpected property "${String(params.additionalProperty)}" is not allowed at ${target}.`;
    case "type":
      return `Expected ${String(params.type)} at ${target}.`;
    case "format":
      return `Value at ${target} must match the "${String(params.format)}" format.`;
    case "pattern":
      return `Value at ${target} does not match the required pattern.`;
    case "enum":
      return `Value at ${target} must be one of: ${(params.allowedValues as unknown[] | undefined)
        ?.map((value) => JSON.stringify(value))
        .join(", ")}.`;
    case "const":
      return `Value at ${target} must equal ${JSON.stringify(params.allowedValue)}.`;
    case "minimum":
      return `Value at ${target} must be >= ${String(params.limit)}.`;
    case "maximum":
      return `Value at ${target} must be <= ${String(params.limit)}.`;
    case "exclusiveMinimum":
      return `Value at ${target} must be > ${String(params.limit)}.`;
    case "exclusiveMaximum":
      return `Value at ${target} must be < ${String(params.limit)}.`;
    case "multipleOf":
      return `Value at ${target} must be a multiple of ${String(params.multipleOf)}.`;
    case "minLength":
      return `Value at ${target} must be at least ${String(params.limit)} characters.`;
    case "maxLength":
      return `Value at ${target} must be at most ${String(params.limit)} characters.`;
    case "minItems":
      return `Array at ${target} must contain at least ${String(params.limit)} item(s).`;
    case "maxItems":
      return `Array at ${target} must contain at most ${String(params.limit)} item(s).`;
    case "minProperties":
      return `Object at ${target} must contain at least ${String(params.limit)} propert${Number(params.limit) === 1 ? "y" : "ies"}.`;
    case "maxProperties":
      return `Object at ${target} must contain at most ${String(params.limit)} properties.`;
    case "uniqueItems":
      return `Array at ${target} must contain unique items.`;
    default:
      return `${error.message ?? "Validation failed"} at ${target}.`;
  }
}

export function computeDepth(value: unknown, current = 1): number {
  if (value === null || typeof value !== "object") return current;
  const entries = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
  if (entries.length === 0) return current;
  return Math.max(...entries.map((entry) => computeDepth(entry, current + 1)));
}

export function countProperties(value: unknown): number {
  if (value === null || typeof value !== "object") return 0;
  if (Array.isArray(value)) return value.reduce<number>((sum, entry) => sum + countProperties(entry), 0);
  return Object.entries(value as Record<string, unknown>).reduce<number>(
    (sum, [, entry]) => sum + 1 + countProperties(entry),
    0,
  );
}

export function summarizeSchema(schemaText: string): SchemaSummary | null {
  const parsed = parseJson(schemaText);
  if (!parsed.ok) return null;
  const schema = parsed.value as Record<string, unknown>;
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return null;
  const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
  const required = Array.isArray(schema.required) ? (schema.required as string[]) : [];
  const formats = new Set<string>();
  const rows: SchemaProperty[] = [];

  const walk = (props: Record<string, Record<string, unknown>>, depth: number, requiredList: string[]) => {
    for (const [name, raw] of Object.entries(props)) {
      if (!raw || typeof raw !== "object") continue;
      const type = Array.isArray(raw.type) ? (raw.type as string[]).join(" | ") : String(raw.type ?? "any");
      const format = typeof raw.format === "string" ? raw.format : undefined;
      if (format) formats.add(format);
      rows.push({
        name,
        type: raw.enum ? "enum" : type,
        required: requiredList.includes(name),
        format,
        description: typeof raw.description === "string" ? raw.description : undefined,
        depth,
      });
      const nestedRequired = Array.isArray(raw.required) ? (raw.required as string[]) : [];
      if (raw.properties && typeof raw.properties === "object") {
        walk(raw.properties as Record<string, Record<string, unknown>>, depth + 1, nestedRequired);
      }
      if (raw.items && typeof raw.items === "object") {
        const items = raw.items as Record<string, unknown>;
        const itemRequired = Array.isArray(items.required) ? (items.required as string[]) : [];
        if (items.properties && typeof items.properties === "object") {
          walk(items.properties as Record<string, Record<string, unknown>>, depth + 1, itemRequired);
        }
      }
    }
  };
  walk(properties, 1, required);

  return {
    title: typeof schema.title === "string" ? schema.title : "Untitled schema",
    description: typeof schema.description === "string" ? schema.description : "",
    id: typeof schema.$id === "string" ? schema.$id : "",
    required,
    properties: rows,
    formats: [...formats],
    depth: rows.reduce((max, row) => Math.max(max, row.depth), 0),
    rootType: String(schema.type ?? "object"),
  };
}

export function validatePayload(schemaText: string, payloadText: string): ValidationResult {
  const started = performance.now();
  const summary = summarizeSchema(schemaText);
  const base: ValidationResult = {
    status: "empty",
    title: "Awaiting input",
    detail: "Add a JSON Schema on the left and a payload on the right to begin validation.",
    issues: [],
    warnings: [],
    checks: [],
    stats: { errors: 0, warnings: 0, depth: 0, properties: 0, elapsedMs: 0, line: 1, column: 1 },
    schemaTitle: summary?.title ?? "Untitled schema",
    schemaId: summary?.id ?? "",
  };

  if (!schemaText.trim() || !payloadText.trim()) return base;

  const schema = parseJson(schemaText);
  if (!schema.ok) {
    return {
      ...base,
      status: "schema-error",
      title: "Invalid JSON Schema",
      detail: `Schema could not be parsed — ${schema.message}`,
      stats: { ...base.stats, elapsedMs: performance.now() - started, line: schema.line, column: schema.column },
    };
  }

  const payload = parseJson(payloadText);
  if (!payload.ok) {
    return {
      ...base,
      status: "syntax-error",
      title: "JSON Syntax Error",
      detail: `${payload.message} · line ${payload.line}, column ${payload.column}`,
      stats: {
        ...base.stats,
        elapsedMs: performance.now() - started,
        line: payload.line,
        column: payload.column,
      },
    };
  }

  let validate: ValidateFunction | undefined;
  try {
    const ajv = new Ajv2020({ allErrors: true, strict: false, allowUnionTypes: true });
    addFormats(ajv);
    validate = ajv.compile(schema.value as Record<string, unknown>) as ValidateFunction;
  } catch (error) {
    return {
      ...base,
      status: "schema-error",
      title: "Invalid JSON Schema",
      detail: error instanceof Error ? error.message : "The schema could not be compiled.",
      stats: { ...base.stats, elapsedMs: performance.now() - started },
    };
  }

  const valid = validate(payload.value);
  const errors = (validate.errors ?? []) as ErrorObject[];
  const issues: ValidationIssue[] = errors.map((error, index) => {
    const line = lineForPath(payloadText, error.instancePath);
    return {
      id: `${error.instancePath}-${error.keyword}-${index}`,
      path: displayPath(error.instancePath),
      label: error.instancePath || "(root)",
      message: friendlyMessage(error),
      keyword: error.keyword,
      line,
      column: lineColFromIndex(payloadText, payloadText.split("\n")[line - 1]?.indexOf(":") ?? 0).column,
      severity: "error",
    };
  });

  const warnings: ValidationIssue[] = [];
  const schemaObj = schema.value as Record<string, unknown>;
  const schemaProps = (schemaObj.properties ?? {}) as Record<string, unknown>;
  if (
    payload.value &&
    typeof payload.value === "object" &&
    !Array.isArray(payload.value) &&
    Object.keys(schemaProps).length > 0
  ) {
    for (const key of Object.keys(payload.value as Record<string, unknown>)) {
      if (!(key in schemaProps)) {
        warnings.push({
          id: `warn-${key}`,
          path: key,
          label: key,
          message: `Property "${key}" is not described in the schema.`,
          keyword: "additionalProperties",
          line: lineForPath(payloadText, `/${key}`),
          column: 1,
          severity: "warning",
        });
      }
    }
  }

  const hasKeyword = (keyword: string) => errors.some((error) => error.keyword === keyword);
  const checks: ValidationCheck[] = [
    { label: "JSON syntax", state: "pass", hint: "Payload parsed successfully" },
    { label: "Schema compiles", state: "pass", hint: "Draft 2020-12 compatible" },
    {
      label: "Required properties",
      state: hasKeyword("required") ? "fail" : "pass",
      hint: hasKeyword("required") ? "One or more required fields are missing" : "All required fields present",
    },
    {
      label: "Type matching",
      state: hasKeyword("type") ? "fail" : "pass",
      hint: hasKeyword("type") ? "A value does not match its declared type" : "Every value matches its declared type",
    },
    {
      label: "Format constraints",
      state: hasKeyword("format") || hasKeyword("pattern") ? "fail" : "pass",
      hint:
        hasKeyword("format") || hasKeyword("pattern")
          ? "A format or pattern rule was violated"
          : "Formats and patterns satisfied",
    },
    {
      label: "Additional properties",
      state: hasKeyword("additionalProperties") ? "fail" : "pass",
      hint: hasKeyword("additionalProperties") ? "Unexpected properties were found" : "No unexpected properties",
    },
  ];

  const elapsedMs = performance.now() - started;
  const status: ValidationStatus = valid ? "valid" : "invalid";

  return {
    status,
    title: valid ? "Valid JSON Payload" : "Validation Failed",
    detail: valid
      ? `Payload conforms to ${summary?.title ?? "the schema"} · ${Object.keys(schemaProps).length} root properties checked.`
      : issues[0]?.message ?? "Payload does not conform to the schema.",
    issues,
    warnings,
    checks,
    stats: {
      errors: issues.length,
      warnings: warnings.length,
      depth: computeDepth(payload.value),
      properties: countProperties(payload.value),
      elapsedMs,
      line: issues[0]?.line ?? 1,
      column: issues[0]?.column ?? 1,
    },
    schemaTitle: summary?.title ?? "Untitled schema",
    schemaId: summary?.id ?? "",
  };
}

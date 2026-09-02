import { parseJson } from "./validate";

/* ------------------------------------------------------------------ */
/* Naming helpers                                                      */
/* ------------------------------------------------------------------ */

export function toPascalCase(input: string): string {
  const cleaned = input
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  if (!cleaned) return "Root";
  return cleaned
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

export function toCamelCase(input: string): string {
  const pascal = toPascalCase(input);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function toSnakeCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

export function singularize(word: string): string {
  if (/ies$/i.test(word)) return word.replace(/ies$/i, "y");
  if (/(ses|xes|zes|ches|shes)$/i.test(word)) return word.replace(/es$/i, "");
  if (/ss$/i.test(word)) return word;
  if (/s$/i.test(word)) return word.replace(/s$/i, "");
  return word;
}

/* ------------------------------------------------------------------ */
/* Type inference                                                      */
/* ------------------------------------------------------------------ */

type NodeKind = "string" | "number" | "boolean" | "null" | "unknown" | "array" | "object" | "union" | "literal";

interface FieldNode {
  key: string;
  optional: boolean;
  node: TypeNode;
}

interface TypeNode {
  id: number;
  kind: NodeKind;
  format?: string;
  integer?: boolean;
  item?: TypeNode;
  fields?: FieldNode[];
  options?: TypeNode[];
  literal?: string | number | boolean;
  name?: string;
}

export interface TypeMapRow {
  path: string;
  type: string;
  optional: boolean;
}

export interface GenerateOptions {
  rootName: string;
  declaration: "interface" | "type";
  readonly: boolean;
  strictOptional: boolean;
}

export interface GeneratedTypes {
  typescript: string;
  zod: string;
  pydantic: string;
  stats: { interfaces: number; properties: number; depth: number; lines: number };
  typeMap: TypeMapRow[];
}

let nodeId = 0;
const nextId = () => ++nodeId;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const URL_RE = /^https?:\/\/\S+$/i;

function detectStringFormat(value: string, keyHint: string): string | undefined {
  const key = keyHint.toLowerCase();
  if (/e[-_]?mail/.test(key)) return "email";
  if (UUID_RE.test(value)) return "uuid";
  if (ISO_DATETIME_RE.test(value)) return "date-time";
  if (ISO_DATE_RE.test(value)) return "date";
  if (URL_RE.test(value)) return "uri";
  if (/(^|_)(url|uri|website|link|avatar|image|photo|href)($|_)/.test(key)) return "uri";
  if (/(^|_)(phone|tel)($|_)/.test(key)) return "phone";
  return undefined;
}

function nodeKey(node: TypeNode): string {
  switch (node.kind) {
    case "object":
      return `object:${(node.fields ?? [])
        .map((field) => `${field.key}:${field.optional ? "?" : ""}${nodeKey(field.node)}`)
        .join(",")}`;
    case "array":
      return `array:${node.item ? nodeKey(node.item) : "unknown"}`;
    case "union":
      return `union:${(node.options ?? []).map(nodeKey).join("|")}`;
    case "literal":
      return `literal:${typeof node.literal}:${String(node.literal)}`;
    case "string":
      return `string:${node.format ?? ""}`;
    default:
      return node.kind;
  }
}

function makeUnion(options: TypeNode[]): TypeNode {
  const unique: TypeNode[] = [];
  for (const option of options) {
    if (option.kind === "null") {
      if (!unique.some((entry) => entry.kind === "null")) unique.push(option);
      continue;
    }
    if (!unique.some((entry) => nodeKey(entry) === nodeKey(option))) unique.push(option);
  }
  if (unique.length === 1) return unique[0];
  return { id: nextId(), kind: "union", options: unique };
}

function mergeNodes(a: TypeNode, b: TypeNode): TypeNode {
  if (a.kind === "null") return b;
  if (b.kind === "null") return a;
  if (nodeKey(a) === nodeKey(b)) return a;
  if (a.kind === "object" && b.kind === "object") {
    const fields = [...(a.fields ?? [])];
    for (const field of b.fields ?? []) {
      const existing = fields.find((entry) => entry.key === field.key);
      if (existing) {
        existing.node = mergeNodes(existing.node, field.node);
        existing.optional = existing.optional && field.optional;
      } else {
        fields.push({ ...field, optional: true });
      }
    }
    return { id: a.id, kind: "object", fields, name: a.name };
  }
  if (a.kind === "array" && b.kind === "array") {
    return { id: a.id, kind: "array", item: mergeNodes(a.item ?? unknownNode(), b.item ?? unknownNode()) };
  }
  return makeUnion([a, b]);
}

function unknownNode(): TypeNode {
  return { id: nextId(), kind: "unknown" };
}

function inferValue(value: unknown, keyHint: string, depth: number): TypeNode {
  if (value === null) return { id: nextId(), kind: "null" };
  if (Array.isArray(value)) {
    if (value.length === 0) return { id: nextId(), kind: "array", item: unknownNode() };
    const items = value.map((entry) => inferValue(entry, singularize(keyHint), depth + 1));
    return { id: nextId(), kind: "array", item: items.reduce((acc, item) => mergeNodes(acc, item)) };
  }
  switch (typeof value) {
    case "string":
      return { id: nextId(), kind: "string", format: detectStringFormat(value, keyHint) };
    case "number":
      return { id: nextId(), kind: "number", integer: Number.isInteger(value) };
    case "boolean":
      return { id: nextId(), kind: "boolean" };
    case "object": {
      const fields: FieldNode[] = Object.entries(value as Record<string, unknown>).map(([key, entry]) => ({
        key,
        optional: false,
        node: inferValue(entry, key, depth + 1),
      }));
      return { id: nextId(), kind: "object", fields };
    }
    default:
      return unknownNode();
  }
}

function assignNames(node: TypeNode, name: string, used: Set<string>, registry: TypeNode[], depth = 0): void {
  if (depth > 8) return;
  if (node.kind === "object") {
    node.name = name;
    used.add(name);
    registry.push(node);
    for (const field of node.fields ?? []) {
      if (field.node.kind === "object") {
        assignNames(field.node, uniqueName(toPascalCase(singularize(field.key)), name, used), used, registry, depth + 1);
      } else if (field.node.kind === "array" && field.node.item?.kind === "object") {
        assignNames(field.node.item, uniqueName(toPascalCase(singularize(field.key)), name, used), used, registry, depth + 1);
      } else if (field.node.kind === "union") {
        for (const option of field.node.options ?? []) {
          if (option.kind === "object") {
            assignNames(option, uniqueName(toPascalCase(singularize(field.key)), name, used), used, registry, depth + 1);
          }
        }
      }
    }
  } else if (node.kind === "array" && node.item) {
    assignNames(node.item, name, used, registry, depth + 1);
  } else if (node.kind === "union") {
    for (const option of node.options ?? []) assignNames(option, name, used, registry, depth + 1);
  }
}

function uniqueName(base: string, parent: string, used: Set<string>): string {
  let candidate = base || "Item";
  if (used.has(candidate)) candidate = `${parent}${candidate}`;
  let counter = 2;
  while (used.has(candidate)) {
    candidate = `${parent}${base}${counter}`;
    counter += 1;
  }
  return candidate;
}

/* ------------------------------------------------------------------ */
/* TypeScript                                                          */
/* ------------------------------------------------------------------ */

function tsType(node: TypeNode, seen = new Set<number>()): string {
  switch (node.kind) {
    case "string":
    case "number":
    case "boolean":
      return node.kind;
    case "null":
      return "null";
    case "unknown":
      return "unknown";
    case "literal":
      return JSON.stringify(node.literal);
    case "array":
      return `${wrapTs(node.item, seen)}[]`;
    case "object":
      return node.name ?? "Record<string, unknown>";
    case "union":
      return (node.options ?? []).map((option) => wrapTs(option, seen)).join(" | ");
    default:
      return "unknown";
  }
}

function wrapTs(node: TypeNode | undefined, seen = new Set<number>()): string {
  if (!node) return "unknown";
  const rendered = tsType(node, seen);
  return node.kind === "union" ? `(${rendered})` : rendered;
}

function tsKey(key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

function renderTsField(field: FieldNode, options: GenerateOptions): string {
  const readonly = options.readonly ? "readonly " : "";
  const optional = field.optional ? (options.strictOptional ? "?: " : ": ") : ": ";
  const type = options.strictOptional || !field.optional ? tsType(field.node) : `${tsType(field.node)} | undefined`;
  return `  ${readonly}${tsKey(field.key)}${optional}${type};`;
}

function renderTsRoot(node: TypeNode, options: GenerateOptions, registry: TypeNode[]): string {
  const lines: string[] = [];
  for (const object of registry) {
    const fields = object.fields ?? [];
    if (object === node) {
      if (options.declaration === "type") {
        lines.push(`export type ${object.name} = {`);
      } else {
        lines.push(`export interface ${object.name} {`);
      }
    } else {
      lines.push(`export interface ${object.name} {`);
    }
    for (const field of fields) lines.push(renderTsField(field, options));
    lines.push(object === node && options.declaration === "type" ? "};" : "}");
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

/* ------------------------------------------------------------------ */
/* Zod                                                                 */
/* ------------------------------------------------------------------ */

function zodType(node: TypeNode): string {
  switch (node.kind) {
    case "string": {
      let base = "z.string()";
      if (node.format === "email") base = "z.string().email()";
      else if (node.format === "uuid") base = "z.string().uuid()";
      else if (node.format === "date-time") base = "z.string().datetime()";
      else if (node.format === "date") base = "z.string().date()";
      else if (node.format === "uri") base = "z.string().url()";
      return base;
    }
    case "number":
      return node.integer ? "z.number().int()" : "z.number()";
    case "boolean":
      return "z.boolean()";
    case "null":
      return "z.null()";
    case "unknown":
      return "z.unknown()";
    case "literal":
      return `z.literal(${JSON.stringify(node.literal)})`;
    case "array":
      return `z.array(${zodType(node.item ?? unknownNode())})`;
    case "object":
      return `z.object({${(node.fields ?? [])
        .map((field) => `\n    ${tsKey(field.key)}: ${zodType(field.node)}${field.optional ? ".optional()" : ""},`)
        .join("")}\n  })`;
    case "union": {
      const options = node.options ?? [];
      if (options.length === 2 && options.some((option) => option.kind === "null")) {
        const inner = options.find((option) => option.kind !== "null");
        return inner ? `${zodType(inner)}.nullable()` : "z.null()";
      }
      return `z.union([${options.map((option) => zodType(option)).join(", ")}])`;
    }
    default:
      return "z.unknown()";
  }
}

function renderZod(root: TypeNode, rootName: string): string {
  const schemaName = `${toCamelCase(rootName)}Schema`;
  const typeName = toPascalCase(rootName);
  const body = zodType(root);
  return `import { z } from "zod";

export const ${schemaName} = ${body};

export type ${typeName} = z.infer<typeof ${schemaName}>;
`;
}

/* ------------------------------------------------------------------ */
/* Python / Pydantic                                                   */
/* ------------------------------------------------------------------ */

function pyType(node: TypeNode): string {
  switch (node.kind) {
    case "string":
      if (node.format === "email") return "EmailStr";
      if (node.format === "date-time") return "datetime";
      if (node.format === "date") return "date";
      if (node.format === "uri") return "AnyUrl";
      return "str";
    case "number":
      return node.integer ? "int" : "float";
    case "boolean":
      return "bool";
    case "null":
      return "None";
    case "unknown":
      return "Any";
    case "literal":
      return "Any";
    case "array":
      return `List[${pyType(node.item ?? unknownNode())}]`;
    case "object":
      return node.name ?? "BaseModel";
    case "union": {
      const options = node.options ?? [];
      if (options.some((option) => option.kind === "null")) {
        const inner = options.find((option) => option.kind !== "null");
        return `Optional[${inner ? pyType(inner) : "Any"}]`;
      }
      return `Union[${options.map(pyType).join(", ")}]`;
    }
    default:
      return "Any";
  }
}

function renderPydantic(registry: TypeNode[]): string {
  const lines: string[] = [
    "from datetime import date, datetime",
    "from typing import Any, List, Optional, Union",
    "",
    "from pydantic import AnyUrl, BaseModel, EmailStr, Field",
    "",
    "",
  ];
  for (const object of registry) {
    lines.push(`class ${object.name}(BaseModel):`);
    const fields = object.fields ?? [];
    if (fields.length === 0) {
      lines.push("    pass");
    } else {
      for (const field of fields) {
        const snake = toSnakeCase(field.key);
        const alias = snake !== field.key ? `, alias="${field.key}"` : "";
        const type = pyType(field.node);
        if (field.optional) {
          lines.push(`    ${snake}: Optional[${type}] = Field(default=None${alias})`);
        } else if (alias) {
          lines.push(`    ${snake}: ${type} = Field(${alias.trim()})`);
        } else {
          lines.push(`    ${snake}: ${type}`);
        }
      }
    }
    lines.push("");
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function generateTypes(source: string, options: GenerateOptions): GeneratedTypes {
  const parsed = parseJson(source);
  if (!parsed.ok) {
    return {
      typescript: `// ${parsed.message}`,
      zod: `// ${parsed.message}`,
      pydantic: `# ${parsed.message}`,
      stats: { interfaces: 0, properties: 0, depth: 0, lines: 0 },
      typeMap: [],
    };
  }
  nodeId = 0;
  const rootName = toPascalCase(options.rootName || "Root");
  const root = inferValue(parsed.value, rootName, 0);
  if (root.kind !== "object") {
    const wrapped: TypeNode = {
      id: nextId(),
      kind: "object",
      name: rootName,
      fields: [{ key: "data", optional: false, node: root }],
    };
    return finishGeneration(wrapped, rootName, options);
  }
  root.name = rootName;
  return finishGeneration(root, rootName, options);
}

function finishGeneration(root: TypeNode, rootName: string, options: GenerateOptions): GeneratedTypes {
  const used = new Set<string>();
  const registry: TypeNode[] = [];
  assignNames(root, rootName, used, registry);
  const typescript = renderTsRoot(root, options, registry);
  const zod = renderZod(root, rootName);
  const pydantic = renderPydantic(registry);
  const typeMap: TypeMapRow[] = [];
  const walk = (node: TypeNode, path: string, optional: boolean) => {
    for (const field of node.fields ?? []) {
      const fieldPath = path ? `${path}.${field.key}` : field.key;
      typeMap.push({ path: fieldPath, type: tsType(field.node), optional: field.optional || optional });
      if (field.node.kind === "object") walk(field.node, fieldPath, field.optional);
      if (field.node.kind === "array" && field.node.item?.kind === "object") {
        walk(field.node.item, `${fieldPath}[]`, field.optional);
      }
    }
  };
  walk(root, "", false);
  const properties = typeMap.length;
  return {
    typescript,
    zod,
    pydantic,
    stats: {
      interfaces: registry.length,
      properties,
      depth: typeMap.reduce((max, row) => Math.max(max, row.path.split(".").length), 0),
      lines: typescript.split("\n").length,
    },
    typeMap,
  };
}

/* ------------------------------------------------------------------ */
/* JSON Schema -> Zod (used by the validator preview)                  */
/* ------------------------------------------------------------------ */

type JsonObject = Record<string, unknown>;

function resolveRef(root: JsonObject, ref: string, seen: Set<string>): JsonObject | null {
  if (!ref.startsWith("#/")) return null;
  if (seen.has(ref)) return null;
  seen.add(ref);
  let cursor: unknown = root;
  for (const token of ref.slice(2).split("/")) {
    const decoded = decodeURIComponent(token.replace(/~1/g, "/").replace(/~0/g, "~"));
    if (!cursor || typeof cursor !== "object") return null;
    cursor = (cursor as JsonObject)[decoded];
  }
  return cursor && typeof cursor === "object" ? (cursor as JsonObject) : null;
}

export function zodFromSchema(schemaText: string): string {
  const parsed = parseJson(schemaText);
  if (!parsed.ok) return `// Fix the JSON syntax error to preview Zod:\n// ${parsed.message}`;
  const root = parsed.value as JsonObject;
  if (!root || typeof root !== "object" || Array.isArray(root)) return "// Schema must be a JSON object.";
  const rootName = typeof root.title === "string" ? toPascalCase(root.title) : "Schema";
  const body = schemaToZod(root, root, new Set(), 0);
  return `import { z } from "zod";

export const ${toCamelCase(rootName)}Schema = ${body};

export type ${rootName} = z.infer<typeof ${toCamelCase(rootName)}Schema>;
`;
}

function schemaToZod(schema: JsonObject, root: JsonObject, seen: Set<string>, depth: number): string {
  if (depth > 10) return "z.unknown()";
  if (typeof schema.$ref === "string") {
    const resolved = resolveRef(root, schema.$ref, new Set(seen));
    if (resolved) return schemaToZod(resolved, root, seen, depth + 1);
    return "z.unknown()";
  }
  if (Array.isArray(schema.allOf)) {
    const parts = (schema.allOf as JsonObject[]).map((part) => schemaToZod(part, root, seen, depth + 1));
    return parts.length > 1 ? `z.intersection(${parts.join(", ")})` : parts[0] ?? "z.unknown()";
  }
  if (Array.isArray(schema.anyOf) || Array.isArray(schema.oneOf)) {
    const options = ((schema.anyOf ?? schema.oneOf) as JsonObject[]).map((part) =>
      schemaToZod(part, root, seen, depth + 1),
    );
    return `z.union([${options.join(", ")}])`;
  }
  if (schema.const !== undefined) return `z.literal(${JSON.stringify(schema.const)})`;
  if (Array.isArray(schema.enum)) {
    const values = schema.enum as unknown[];
    if (values.every((value) => typeof value === "string")) {
      return `z.enum([${values.map((value) => JSON.stringify(value)).join(", ")}])`;
    }
    return `z.union([${values.map((value) => `z.literal(${JSON.stringify(value)})`).join(", ")}])`;
  }

  const types = Array.isArray(schema.type) ? (schema.type as string[]) : typeof schema.type === "string" ? [schema.type] : [];
  const nullable = types.includes("null");
  const active = types.filter((type) => type !== "null");
  const type = active[0] ?? (schema.properties ? "object" : schema.items ? "array" : "string");

  let chain = "";
  const add = (method: string) => {
    chain += method;
  };

  if (type === "object") {
    const properties = (schema.properties ?? {}) as Record<string, JsonObject>;
    const required = Array.isArray(schema.required) ? (schema.required as string[]) : [];
    const fields = Object.entries(properties)
      .map(([key, value]) => {
        const optional = required.includes(key) ? "" : ".optional()";
        return `    ${key}: ${schemaToZod(value, root, seen, depth + 1)}${optional},`;
      })
      .join("\n");
    chain = `z.object({${fields ? `\n${fields}\n  ` : ""}})`;
    if (schema.additionalProperties === false) add(".strict()");
  } else if (type === "array") {
    const items = schema.items as JsonObject | undefined;
    chain = `z.array(${items ? schemaToZod(items, root, seen, depth + 1) : "z.unknown()"})`;
    if (typeof schema.minItems === "number") add(`.min(${schema.minItems})`);
    if (typeof schema.maxItems === "number") add(`.max(${schema.maxItems})`);
  } else if (type === "number" || type === "integer") {
    chain = type === "integer" ? "z.number().int()" : "z.number()";
    if (typeof schema.minimum === "number") add(`.min(${schema.minimum})`);
    if (typeof schema.maximum === "number") add(`.max(${schema.maximum})`);
    if (typeof schema.multipleOf === "number") add(`.multipleOf(${schema.multipleOf})`);
  } else if (type === "boolean") {
    chain = "z.boolean()";
  } else if (type === "null") {
    chain = "z.null()";
  } else {
    chain = "z.string()";
    if (schema.format === "email") add(".email()");
    else if (schema.format === "uuid") add(".uuid()");
    else if (schema.format === "date-time") add(".datetime()");
    else if (schema.format === "date") add(".date()");
    else if (schema.format === "uri" || schema.format === "url") add(".url()");
    if (typeof schema.minLength === "number") add(`.min(${schema.minLength})`);
    if (typeof schema.maxLength === "number") add(`.max(${schema.maxLength})`);
    if (typeof schema.pattern === "string") add(`.regex(/${schema.pattern.replace(/\//g, "\\/")}/)`);
  }
  if (nullable) chain += ".nullable()";
  return chain;
}

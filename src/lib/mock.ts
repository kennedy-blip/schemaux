import { parseJson } from "./validate";

type JsonObject = Record<string, unknown>;

export interface MockOptions {
  count: number;
  seed: string;
  pretty: boolean;
  includeOptional: boolean;
  uniqueEmails: boolean;
  wrapArray: boolean;
}

export interface MockResult {
  ok: boolean;
  text: string;
  records: number;
  columns: string[];
  fields: number;
  elapsedMs: number;
  error?: string;
}

/* ------------------------------------------------------------------ */
/* Deterministic randomness                                            */
/* ------------------------------------------------------------------ */

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

class Rand {
  private state: number;

  constructor(seed: string) {
    this.state = hashSeed(seed) || 1;
  }

  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    if (max <= min) return min;
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  float(min: number, max: number, precision = 2): number {
    const value = this.next() * (max - min) + min;
    return Number(value.toFixed(precision));
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  bool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  digits(length: number): string {
    let out = "";
    for (let i = 0; i < length; i += 1) out += this.int(0, 9).toString();
    return out;
  }

  token(length: number): string {
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    let out = "";
    for (let i = 0; i < length; i += 1) out += alphabet[this.int(0, alphabet.length - 1)];
    return out;
  }

  hex(length: number): string {
    const alphabet = "0123456789abcdef";
    let out = "";
    for (let i = 0; i < length; i += 1) out += alphabet[this.int(0, alphabet.length - 1)];
    return out;
  }

  uuid(): string {
    const variant = "89ab"[this.int(0, 3)];
    return `${this.hex(8)}-${this.hex(4)}-4${this.hex(3)}-${variant}${this.hex(3)}-${this.hex(12)}`;
  }

  date(offsetDays = 0): Date {
    // Fixed reference keeps seeded datasets fully reproducible across sessions.
    const reference = Date.UTC(2026, 1, 1, 12, 0, 0);
    const delta = this.int(0, Math.abs(offsetDays)) * 86400000 + this.int(0, 86399) * 1000;
    return new Date(reference - delta);
  }
}

/* ------------------------------------------------------------------ */
/* Realistic value pools                                               */
/* ------------------------------------------------------------------ */

const FIRST_NAMES = [
  "Amara", "Jules", "Sofia", "Kenji", "Priya", "Mateo", "Nadia", "Elias", "Zara", "Theo",
  "Leila", "Omar", "Ingrid", "Rafael", "Mei", "Tobias", "Anika", "Diego", "Fatima", "Noah",
];
const LAST_NAMES = [
  "Okafor", "Verne", "Lindqvist", "Tanaka", "Raman", "Alvarez", "Haddad", "Novak", "Khan", "Meyer",
  "Costa", "Berg", "Silva", "Chen", "Weber", "Moreau", "Petrov", "Rossi", "Nakamura", "Andersen",
];
const COMPANIES = [
  "Northwind Labs", "Vertex Systems", "Helios Cloud", "Monolith Studio", "Quanta Works", "Orbital Freight",
  "Lumen Health", "Basalt Finance", "Cobalt Robotics", "Meridian AI",
];
const CITIES = [
  "Lagos", "Berlin", "Lisbon", "Toronto", "Singapore", "Nairobi", "Austin", "Amsterdam", "Tokyo", "São Paulo",
];
const COUNTRIES = ["Nigeria", "Germany", "Portugal", "Canada", "Singapore", "Kenya", "United States", "Netherlands", "Japan", "Brazil"];
const STREETS = ["Market Street", "Rua do Alecrim", "Torstraße", "Yonge Street", "Orchard Road", "Ngong Road", "Congress Ave", "Prinsengracht"];
const PRODUCTS = [
  "Pulse Pro Keyboard", "Nimbus Wireless Mouse", "Vertex 27\" Monitor", "Basalt USB-C Hub", "Lumen Desk Mat",
  "Cobalt Trackpad", "Orbital Laptop Stand", "Quanta Webcam 4K",
];
const DEPARTMENTS = ["core-infra", "payments", "growth", "design-systems", "data-platform", "security"];
const ROLES = ["admin", "editor", "viewer", "owner", "analyst"];
const STATUSES = ["active", "pending", "suspended", "trial", "archived"];
const CURRENCIES = ["USD", "EUR", "GBP", "NGN"];
const TAGS = ["priority", "enterprise", "beta", "internal", "customer-facing", "needs-review", "compliance"];
const WORDS = [
  "latency", "throughput", "schema", "payload", "contract", "webhook", "idempotency", "shard",
  "rollout", "canary", "observability", "backfill", "migration", "rate-limit", "signature",
];
const DOMAINS = ["northwind.io", "vertexlabs.dev", "helioscloud.com", "monolith.studio", "quantaworks.io"];

const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const person = (rand: Rand) => `${rand.pick(FIRST_NAMES)} ${rand.pick(LAST_NAMES)}`;
const sentence = (rand: Rand) => {
  const a = rand.pick(WORDS);
  const b = rand.pick(WORDS);
  return `${cap(a)} ${rand.pick(["for", "across", "within", "under"])} ${b} ${rand.pick(["pipelines", "services", "contracts", "workflows"])} — ${rand.pick(["validated", "queued", "replayed", "audited"])} ${rand.pick(["nightly", "hourly", "on deploy", "by default"])}.`;
};

/* ------------------------------------------------------------------ */
/* Pattern sampling                                                    */
/* ------------------------------------------------------------------ */

function charFromClass(cls: string, rand: Rand): string {
  const negated = cls.startsWith("^");
  const body = negated ? cls.slice(1) : cls;
  const ranges: Array<[string, string]> = [];
  let i = 0;
  while (i < body.length) {
    if (body[i + 1] === "-" && body[i + 2] !== undefined) {
      ranges.push([body[i], body[i + 2]]);
      i += 3;
    } else {
      ranges.push([body[i], body[i]]);
      i += 1;
    }
  }
  const pool: string[] = [];
  for (const [start, end] of ranges) {
    for (let code = start.charCodeAt(0); code <= end.charCodeAt(0) && pool.length < 200; code += 1) {
      pool.push(String.fromCharCode(code));
    }
  }
  if (pool.length === 0) return "x";
  const picked = rand.pick(pool);
  if (negated) return /[A-Za-z0-9]/.test(picked) ? "!" : picked;
  return picked;
}

function samplePattern(pattern: string, rand: Rand): string {
  const source = pattern.replace(/^\^/, "").replace(/\$$/, "");
  let out = "";
  let lastAtom: (() => string) | null = null;
  let i = 0;
  const flush = () => {
    if (lastAtom) out += lastAtom();
    lastAtom = null;
  };
  while (i < source.length && out.length < 40) {
    const ch = source[i];
    if (ch === "\\") {
      const next = source[i + 1];
      i += 2;
      flush();
      if (next === "d") lastAtom = () => String(rand.int(0, 9));
      else if (next === "w") lastAtom = () => rand.token(1);
      else if (next === "s") lastAtom = () => " ";
      else if (next === ".") lastAtom = () => ".";
      else if (next === "-") lastAtom = () => "-";
      else if (next === "_") lastAtom = () => "_";
      else lastAtom = () => next ?? "";
      continue;
    }
    if (ch === "[") {
      const end = source.indexOf("]", i);
      if (end === -1) break;
      const cls = source.slice(i + 1, end);
      flush();
      lastAtom = () => charFromClass(cls, rand);
      i = end + 1;
      continue;
    }
    if (ch === "(") {
      let depth = 1;
      let end = i + 1;
      while (end < source.length && depth > 0) {
        if (source[end] === "(") depth += 1;
        if (source[end] === ")") depth -= 1;
        end += 1;
      }
      const inner = source.slice(i + 1, end - 1);
      const alternatives = inner.split("|");
      flush();
      out += samplePattern(alternatives[rand.int(0, alternatives.length - 1)], rand);
      i = end;
      continue;
    }
    if (ch === "?" || ch === "*" || ch === "+" || ch === "{") {
      let min = 0;
      let max = 1;
      if (ch === "?") {
        min = 0;
        max = 1;
        i += 1;
      } else if (ch === "*") {
        min = 0;
        max = 3;
        i += 1;
      } else if (ch === "+") {
        min = 1;
        max = 3;
        i += 1;
      } else {
        const end = source.indexOf("}", i);
        if (end === -1) break;
        const spec = source.slice(i + 1, end);
        const [minPart, maxPart] = spec.split(",");
        min = Number(minPart);
        max = maxPart === undefined ? min : Number(maxPart);
        i = end + 1;
      }
      const times = Math.max(0, Math.min(min + rand.int(0, Math.max(0, max - min)), 8));
      if (lastAtom) {
        for (let index = 0; index < times; index += 1) out += lastAtom();
        lastAtom = null;
      }
      continue;
    }
    if (ch === "^" || ch === "$") {
      lastAtom = null;
      i += 1;
      continue;
    }
    if (ch === ".") {
      flush();
      lastAtom = () => rand.token(1);
      i += 1;
      continue;
    }
    if (ch === "|") {
      flush();
      i += 1;
      continue;
    }
    const literal = ch;
    lastAtom = () => literal;
    flush();
    i += 1;
  }
  flush();
  return out.slice(0, 40);
}

/* ------------------------------------------------------------------ */
/* Value generation                                                    */
/* ------------------------------------------------------------------ */

interface GenContext {
  rand: Rand;
  includeOptional: boolean;
  uniqueEmails: boolean;
  usedEmails: Set<string>;
  refStack: Set<string>;
}

function resolveRef(root: JsonObject, ref: string, ctx: GenContext, depth: number): JsonObject | null {
  if (!ref.startsWith("#/")) return null;
  if (ctx.refStack.has(ref) || depth > 12) return null;
  let cursor: unknown = root;
  for (const token of ref.slice(2).split("/")) {
    const decoded = decodeURIComponent(token.replace(/~1/g, "/").replace(/~0/g, "~"));
    if (!cursor || typeof cursor !== "object") return null;
    cursor = (cursor as JsonObject)[decoded];
  }
  if (!cursor || typeof cursor !== "object" || Array.isArray(cursor)) return null;
  return cursor as JsonObject;
}

function mergeAllOf(schema: JsonObject, root: JsonObject, ctx: GenContext, depth: number): JsonObject {
  const parts = schema.allOf as JsonObject[];
  const merged: JsonObject = { ...schema, properties: { ...((schema.properties ?? {}) as JsonObject) }, required: [...((schema.required as string[]) ?? [])] };
  delete merged.allOf;
  for (const part of parts) {
    const resolved = typeof part.$ref === "string" ? resolveRef(root, part.$ref, ctx, depth) ?? {} : part;
    Object.assign(merged, resolved);
    merged.properties = { ...((merged.properties ?? {}) as JsonObject), ...((resolved.properties ?? {}) as JsonObject) };
    merged.required = [...new Set([...((merged.required as string[]) ?? []), ...((resolved.required as string[]) ?? [])])];
  }
  return merged;
}

function stringValue(key: string, format: string | undefined, schema: JsonObject, ctx: GenContext): string {
  const { rand } = ctx;
  const lower = key.toLowerCase();
  const minLength = typeof schema.minLength === "number" ? schema.minLength : 0;
  const maxLength = typeof schema.maxLength === "number" ? schema.maxLength : undefined;

  let value: string;
  if (format === "email") {
    const local = `${rand.pick(FIRST_NAMES)}.${rand.pick(LAST_NAMES)}`.toLowerCase();
    value = `${local}@${rand.pick(DOMAINS)}`;
    if (ctx.uniqueEmails) {
      let attempt = 0;
      while (ctx.usedEmails.has(value) && attempt < 8) {
        attempt += 1;
        value = `${local}${attempt}@${rand.pick(DOMAINS)}`;
      }
      ctx.usedEmails.add(value);
    }
  } else if (format === "uuid") {
    value = rand.uuid();
  } else if (format === "date-time") {
    value = rand.date(45).toISOString();
  } else if (format === "date") {
    value = rand.date(120).toISOString().slice(0, 10);
  } else if (format === "time") {
    value = `${String(rand.int(0, 23)).padStart(2, "0")}:${String(rand.int(0, 59)).padStart(2, "0")}:${String(rand.int(0, 59)).padStart(2, "0")}`;
  } else if (format === "uri" || format === "url") {
    value = `https://cdn.schemapipe.dev/${rand.pick(["avatars", "assets", "media"])}/${rand.token(8)}.${rand.pick(["png", "jpg", "webp"])}`;
  } else if (format === "hostname") {
    value = `${rand.pick(["api", "cdn", "edge", "auth"])}.${rand.pick(DOMAINS)}`;
  } else if (format === "ipv4") {
    value = `${rand.int(1, 223)}.${rand.int(0, 255)}.${rand.int(0, 255)}.${rand.int(1, 254)}`;
  } else if (typeof schema.pattern === "string") {
    value = samplePattern(schema.pattern, rand);
  } else if (/e[-_]?mail/.test(lower)) {
    value = `${rand.pick(FIRST_NAMES).toLowerCase()}@${rand.pick(DOMAINS)}`;
  } else if (/(^|_)(id|uuid|guid)$/.test(lower) || lower === "id") {
    if (/user|member|account|customer/.test(lower)) value = `usr_${rand.token(10)}`;
    else if (/txn|transaction|payment/.test(lower)) value = `txn_${rand.token(8)}`;
    else if (/dev|device|sensor/.test(lower)) value = `dev_${rand.token(6).toUpperCase()}`;
    else value = rand.uuid();
  } else if (/(first|given).*name/.test(lower)) {
    value = rand.pick(FIRST_NAMES);
  } else if (/(last|family|sur).*name/.test(lower)) {
    value = rand.pick(LAST_NAMES);
  } else if (/(full|display|user|customer|contact|author).*name/.test(lower) || lower === "name") {
    value = person(rand);
  } else if (/company|organization|org|employer|vendor/.test(lower)) {
    value = rand.pick(COMPANIES);
  } else if (/city|town|location/.test(lower)) {
    value = `${rand.pick(CITIES)}, ${rand.pick(COUNTRIES)}`;
  } else if (/country|nation/.test(lower)) {
    value = rand.pick(COUNTRIES);
  } else if (/street|address|line1|line2/.test(lower)) {
    value = `${rand.int(1, 240)} ${rand.pick(STREETS)}`;
  } else if (/postal|zip/.test(lower)) {
    value = String(rand.int(10000, 99999));
  } else if (/phone|mobile|tel/.test(lower)) {
    value = `+1 ${rand.int(200, 989)} ${rand.int(200, 989)} ${rand.int(1000, 9999)}`;
  } else if (/currency/.test(lower)) {
    value = rand.pick(CURRENCIES);
  } else if (/role/.test(lower)) {
    value = rand.pick(ROLES);
  } else if (/status|state/.test(lower)) {
    value = rand.pick(STATUSES);
  } else if (/department|team|group/.test(lower)) {
    value = rand.pick(DEPARTMENTS);
  } else if (/tag|label/.test(lower)) {
    value = rand.pick(TAGS);
  } else if (/title|headline/.test(lower)) {
    value = rand.pick(PRODUCTS);
  } else if (/description|bio|summary|notes|comment|message/.test(lower)) {
    value = sentence(rand);
  } else if (/sku/.test(lower)) {
    value = `SKU-${rand.token(4).toUpperCase()}-${rand.token(4).toUpperCase()}`;
  } else if (/version|firmware/.test(lower)) {
    value = `v${rand.int(1, 4)}.${rand.int(0, 9)}.${rand.int(0, 9)}`;
  } else if (/url|website|link|href|avatar|image|photo|logo/.test(lower)) {
    value = `https://${rand.pick(DOMAINS)}/${rand.token(6)}`;
  } else if (/token|secret|key|hash/.test(lower)) {
    value = `${rand.pick(["pk", "sk", "tok"])}_${rand.token(18)}`;
  } else if (/color|colour/.test(lower)) {
    value = `#${rand.hex(6)}`;
  } else if (/ip|host/.test(lower)) {
    value = `${rand.int(10, 199)}.${rand.int(0, 255)}.${rand.int(0, 255)}.${rand.int(1, 254)}`;
  } else if (/question|prompt|title/.test(lower)) {
    value = sentence(rand);
  } else {
    value = rand.pick(WORDS);
  }

  if (maxLength !== undefined && value.length > maxLength) value = value.slice(0, maxLength);
  if (value.length < minLength) value = value.padEnd(minLength, rand.pick(["a", "x", "1"]));
  return value;
}

function numberValue(key: string, schema: JsonObject, ctx: GenContext): number {
  const { rand } = ctx;
  const lower = key.toLowerCase();
  const minimum = typeof schema.minimum === "number" ? schema.minimum : undefined;
  const maximum = typeof schema.maximum === "number" ? schema.maximum : undefined;
  const integer = schema.type === "integer";
  const precision = integer ? 0 : 2;

  let value: number;
  if (/age/.test(lower)) value = rand.int(18, 67);
  else if (/price|amount|cost|total|subtotal|balance/.test(lower)) value = rand.float(9, 950, 2);
  else if (/quantity|qty|count|stock|inventory/.test(lower)) value = rand.int(1, 24);
  else if (/temperature|temp/.test(lower)) value = rand.float(18, 29, 1);
  else if (/humidity/.test(lower)) value = rand.float(32, 68, 1);
  else if (/pressure/.test(lower)) value = rand.float(992, 1028, 1);
  else if (/co2|carbon/.test(lower)) value = rand.int(420, 940);
  else if (/battery|charge|level/.test(lower)) value = rand.float(18, 100, 1);
  else if (/^lat$|latitude/.test(lower)) value = rand.float(-90, 90, 4);
  else if (/^lng$|^lon$|longitude/.test(lower)) value = rand.float(-180, 180, 4);
  else if (/rating|score|stars/.test(lower)) value = rand.float(1, 5, 1);
  else if (/percent|rate|ratio/.test(lower)) value = rand.float(0, 100, 1);
  else if (/year/.test(lower)) value = rand.int(2021, 2026);
  else if (/port/.test(lower)) value = rand.int(3000, 9999);
  else if (minimum !== undefined || maximum !== undefined) {
    const min = minimum ?? 0;
    const max = maximum ?? min + 100;
    value = integer ? rand.int(Math.ceil(min), Math.floor(max)) : rand.float(min, max, precision);
  } else {
    value = integer ? rand.int(1, 500) : rand.float(1, 500, 2);
  }

  if (minimum !== undefined && value < minimum) value = minimum;
  if (maximum !== undefined && value > maximum) value = maximum;
  if (typeof schema.multipleOf === "number" && schema.multipleOf > 0) {
    value = Math.round(value / schema.multipleOf) * schema.multipleOf;
    value = Number(value.toFixed(precision));
  }
  return integer ? Math.round(value) : value;
}

function generateValue(schema: JsonObject, root: JsonObject, key: string, ctx: GenContext, depth: number): unknown {
  if (depth > 10) return null;
  if (schema.allOf) schema = mergeAllOf(schema, root, ctx, depth);
  if (typeof schema.$ref === "string") {
    const ref = schema.$ref;
    if (ctx.refStack.has(ref)) return null;
    const resolved = resolveRef(root, ref, ctx, depth);
    if (resolved) {
      ctx.refStack.add(ref);
      const value = generateValue(resolved, root, key, ctx, depth + 1);
      ctx.refStack.delete(ref);
      return value;
    }
    return null;
  }
  if (schema.const !== undefined) return schema.const;
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return ctx.rand.pick(schema.enum as unknown[]);
  if (Array.isArray(schema.examples) && schema.examples.length > 0) return schema.examples[0];
  if (Array.isArray(schema.anyOf) || Array.isArray(schema.oneOf)) {
    const options = ((schema.anyOf ?? schema.oneOf) as JsonObject[]);
    return generateValue(ctx.rand.pick(options), root, key, ctx, depth + 1);
  }

  const types = Array.isArray(schema.type) ? (schema.type as string[]) : typeof schema.type === "string" ? [schema.type] : [];
  if (types.includes("null") && types.length > 1 && ctx.rand.bool(0.12)) return null;
  const type = types.find((entry) => entry !== "null") ?? (schema.properties ? "object" : schema.items ? "array" : undefined);

  if (!type) {
    if (schema.properties) return generateObject(schema, root, ctx, depth);
    if (schema.items) return generateArray(schema, root, ctx, depth);
    return stringValue(key, undefined, schema, ctx);
  }

  switch (type) {
    case "object":
      return generateObject(schema, root, ctx, depth);
    case "array":
      return generateArray(schema, root, ctx, depth);
    case "string":
      return stringValue(key, typeof schema.format === "string" ? schema.format : undefined, schema, ctx);
    case "number":
    case "integer":
      return numberValue(key, schema, ctx);
    case "boolean":
      return ctx.rand.bool();
    case "null":
      return null;
    default:
      return stringValue(key, undefined, schema, ctx);
  }
}

function generateObject(schema: JsonObject, root: JsonObject, ctx: GenContext, depth: number): JsonObject {
  const properties = (schema.properties ?? {}) as Record<string, JsonObject>;
  const required = new Set(Array.isArray(schema.required) ? (schema.required as string[]) : []);
  const output: JsonObject = {};
  for (const [key, propertySchema] of Object.entries(properties)) {
    const isRequired = required.has(key);
    if (!isRequired && !ctx.includeOptional) continue;
    if (!isRequired && ctx.includeOptional && !ctx.rand.bool(0.72)) continue;
    output[key] = generateValue(propertySchema, root, key, ctx, depth + 1);
  }
  if (Object.keys(properties).length === 0) {
    const additional = schema.additionalProperties;
    const additionalSchema =
      additional && typeof additional === "object" && !Array.isArray(additional) ? (additional as JsonObject) : null;
    const extra = ctx.rand.int(2, 3);
    const usedKeys = new Set<string>();
    for (let i = 0; i < extra; i += 1) {
      const key = additionalSchema
        ? ctx.rand.pick(["team", "region", "tier", "source", "owner", "campaign"])
        : ctx.rand.pick(WORDS);
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      output[key] = additionalSchema
        ? generateValue(additionalSchema, root, key, ctx, depth + 1)
        : ctx.rand.pick([ctx.rand.token(6), ctx.rand.int(1, 100), ctx.rand.bool()]);
    }
  }
  return output;
}

function generateArray(schema: JsonObject, root: JsonObject, ctx: GenContext, depth: number): unknown[] {
  const min = typeof schema.minItems === "number" ? schema.minItems : 1;
  const max = typeof schema.maxItems === "number" ? schema.maxItems : Math.max(min, 3);
  const count = Math.max(0, Math.min(ctx.rand.int(min, Math.min(max, min + 3)), 8));
  const items = schema.items as JsonObject | undefined;
  const output: unknown[] = [];
  for (let i = 0; i < count; i += 1) {
    output.push(items ? generateValue(items, root, "item", ctx, depth + 1) : ctx.rand.token(6));
  }
  return output;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function generateMockData(schemaText: string, options: MockOptions): MockResult {
  const started = performance.now();
  const parsed = parseJson(schemaText);
  if (!parsed.ok) {
    return {
      ok: false,
      text: "",
      records: 0,
      columns: [],
      fields: 0,
      elapsedMs: performance.now() - started,
      error: `Schema error — ${parsed.message}`,
    };
  }
  const schema = parsed.value as JsonObject;
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return {
      ok: false,
      text: "",
      records: 0,
      columns: [],
      fields: 0,
      elapsedMs: performance.now() - started,
      error: "The schema root must be a JSON object.",
    };
  }

  const ctx: GenContext = {
    rand: new Rand(`${options.seed}:${options.count}`),
    includeOptional: options.includeOptional,
    uniqueEmails: options.uniqueEmails,
    usedEmails: new Set<string>(),
    refStack: new Set<string>(),
  };

  const rootType = Array.isArray(schema.type) ? (schema.type as string[])[0] : (schema.type as string | undefined);
  const count = Math.max(1, Math.min(options.count, 100));
  let records: unknown[];

  if (rootType === "array") {
    const items = schema.items as JsonObject | undefined;
    records = Array.from({ length: count }, () =>
      items ? generateValue(items, schema, "item", ctx, 0) : ctx.rand.token(8),
    );
  } else {
    records = Array.from({ length: count }, () => generateValue(schema, schema, "", ctx, 0));
  }

  const output = options.wrapArray || count > 1 || rootType === "array" ? records : records[0];
  const text = JSON.stringify(output, null, options.pretty ? 2 : 0);
  const first = records[0];
  const columns =
    first && typeof first === "object" && !Array.isArray(first) ? Object.keys(first as JsonObject) : [];
  const fields = records.reduce<number>((total, record) => {
    if (record && typeof record === "object" && !Array.isArray(record)) {
      return total + Object.keys(record as JsonObject).length;
    }
    return total + 1;
  }, 0);

  return {
    ok: true,
    text,
    records: records.length,
    columns,
    fields,
    elapsedMs: performance.now() - started,
  };
}

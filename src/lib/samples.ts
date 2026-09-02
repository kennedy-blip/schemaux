export type SampleKey = "user" | "transaction" | "iot" | "product";

export interface SampleTemplate {
  key: SampleKey;
  label: string;
  short: string;
  filename: string;
  description: string;
  schema: Record<string, unknown>;
  payload: Record<string, unknown>;
  invalid: Record<string, unknown>;
  accent: string;
}

const userSchema: Record<string, unknown> = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://schemapulse.dev/schemas/user.json",
  title: "User",
  description: "A registered platform user with profile and access metadata.",
  type: "object",
  required: ["id", "name", "email", "role", "isActive", "createdAt"],
  properties: {
    id: { type: "string", format: "uuid", description: "Stable primary identifier." },
    name: { type: "string", minLength: 2, maxLength: 80 },
    email: { type: "string", format: "email" },
    role: { type: "string", enum: ["admin", "editor", "viewer"] },
    isActive: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
    profile: {
      type: "object",
      required: ["avatarUrl", "bio"],
      properties: {
        avatarUrl: { type: "string", format: "uri" },
        bio: { type: "string", maxLength: 160 },
        location: { type: "string" },
      },
    },
    tags: { type: "array", items: { type: "string" }, maxItems: 5 },
    metadata: { type: "object", additionalProperties: { type: "string" } },
  },
  additionalProperties: false,
};

const userPayload = {
  id: "8f14e45f-ceea-467f-a1b2-3f7c1d9a5b21",
  name: "Amara Okafor",
  email: "amara.okafor@northwind.io",
  role: "admin",
  isActive: true,
  createdAt: "2026-02-14T09:24:11.000Z",
  profile: {
    avatarUrl: "https://cdn.northwind.io/avatars/amara.png",
    bio: "Platform engineer focused on event-driven APIs.",
    location: "Lagos, Nigeria",
  },
  tags: ["platform", "typescript", "on-call"],
  metadata: { team: "core-infra", region: "eu-west-1" },
};

const userInvalid = {
  id: "not-a-uuid",
  name: "A",
  role: "superuser",
  isActive: "yes",
  createdAt: "14/02/2026",
  profile: { bio: "Missing avatar" },
  tags: ["platform", "typescript", "on-call", "extra", "overflow", "too-many"],
  metadata: { team: "core-infra", region: "eu-west-1" },
  legacyToken: "abc123",
};

const transactionSchema: Record<string, unknown> = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://schemapulse.dev/schemas/transaction.json",
  title: "Transaction",
  description: "A payment intent captured by the billing service.",
  type: "object",
  required: ["id", "amount", "currency", "status", "customer", "items", "createdAt"],
  properties: {
    id: { type: "string", pattern: "^txn_[a-z0-9]{8}$" },
    amount: { type: "number", minimum: 0, multipleOf: 0.01 },
    currency: { type: "string", enum: ["USD", "EUR", "GBP", "NGN"] },
    status: { type: "string", enum: ["pending", "captured", "failed", "refunded"] },
    customer: {
      type: "object",
      required: ["id", "email"],
      properties: {
        id: { type: "string", format: "uuid" },
        email: { type: "string", format: "email" },
        name: { type: "string" },
      },
    },
    items: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["sku", "quantity", "unitPrice"],
        properties: {
          sku: { type: "string" },
          quantity: { type: "integer", minimum: 1 },
          unitPrice: { type: "number", minimum: 0 },
        },
      },
    },
    createdAt: { type: "string", format: "date-time" },
    refundedAt: { type: ["string", "null"], format: "date-time" },
  },
  additionalProperties: false,
};

const transactionPayload = {
  id: "txn_9f3a1c72",
  amount: 249.5,
  currency: "USD",
  status: "captured",
  customer: {
    id: "2c1d9f4a-77b3-4d1e-9a2f-5e6b8c0d1e3f",
    email: "jules@vertexlabs.dev",
    name: "Jules Verne",
  },
  items: [
    { sku: "SKU-PULSE-PRO", quantity: 2, unitPrice: 99.75 },
    { sku: "SKU-ADDON-SEAT", quantity: 1, unitPrice: 50 },
  ],
  createdAt: "2026-03-02T16:41:09.000Z",
  refundedAt: null,
};

const transactionInvalid = {
  id: "TXN-88213",
  amount: -12.5,
  currency: "BTC",
  status: "settled",
  customer: { id: "missing-email" },
  items: [],
  createdAt: "2026-03-02 16:41",
};

const iotSchema: Record<string, unknown> = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://schemapulse.dev/schemas/iot-log.json",
  title: "IoTSensorLog",
  description: "Telemetry frame emitted by an edge sensor every 30 seconds.",
  type: "object",
  required: ["deviceId", "recordedAt", "temperature", "humidity", "metrics", "location"],
  properties: {
    deviceId: { type: "string", pattern: "^dev_[A-Z0-9]{6}$" },
    recordedAt: { type: "string", format: "date-time" },
    temperature: { type: "number", minimum: -40, maximum: 85 },
    humidity: { type: "number", minimum: 0, maximum: 100 },
    firmware: { type: "string", pattern: "^v\\d+\\.\\d+\\.\\d+$" },
    metrics: {
      type: "object",
      required: ["pressure", "co2"],
      properties: {
        pressure: { type: "number" },
        co2: { type: "integer", minimum: 300, maximum: 5000 },
        battery: { type: "number", minimum: 0, maximum: 100 },
      },
    },
    location: {
      type: "object",
      required: ["lat", "lng"],
      properties: {
        lat: { type: "number", minimum: -90, maximum: 90 },
        lng: { type: "number", minimum: -180, maximum: 180 },
      },
    },
    alerts: { type: "array", items: { type: "string", enum: ["overheat", "low-battery", "offline", "tamper"] } },
  },
  additionalProperties: false,
};

const iotPayload = {
  deviceId: "dev_A7X2K9",
  recordedAt: "2026-04-18T11:02:44.000Z",
  temperature: 23.6,
  humidity: 48.2,
  firmware: "v2.4.1",
  metrics: { pressure: 1012.4, co2: 612, battery: 87.5 },
  location: { lat: 6.5244, lng: 3.3792 },
  alerts: [],
};

const iotInvalid = {
  deviceId: "sensor-42",
  recordedAt: "yesterday",
  temperature: 140,
  humidity: -4,
  metrics: { pressure: "1012", co2: 120 },
  location: { lat: 6.5244 },
};

const productSchema: Record<string, unknown> = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://schemapulse.dev/schemas/product.json",
  title: "Product",
  description: "A sellable catalog item with variants and dimensions.",
  type: "object",
  required: ["sku", "title", "price", "currency", "inStock"],
  properties: {
    sku: { type: "string", pattern: "^SKU-[A-Z0-9-]{4,}$" },
    title: { type: "string", minLength: 3 },
    description: { type: "string" },
    price: { type: "number", minimum: 0 },
    currency: { type: "string", enum: ["USD", "EUR", "GBP"] },
    inStock: { type: "boolean" },
    tags: { type: "array", items: { type: "string" } },
    dimensions: {
      type: "object",
      required: ["width", "height", "depth"],
      properties: {
        width: { type: "number" },
        height: { type: "number" },
        depth: { type: "number" },
        unit: { type: "string", enum: ["cm", "in"] },
      },
    },
    variants: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "priceDelta"],
        properties: {
          name: { type: "string" },
          priceDelta: { type: "number" },
          available: { type: "boolean" },
        },
      },
    },
  },
  additionalProperties: false,
};

const productPayload = {
  sku: "SKU-PULSE-PRO",
  title: "Pulse Pro Mechanical Keyboard",
  description: "Hot-swappable 75% keyboard with per-key telemetry.",
  price: 189,
  currency: "USD",
  inStock: true,
  tags: ["keyboard", "mechanical", "wireless"],
  dimensions: { width: 32.5, height: 4.2, depth: 14.1, unit: "cm" },
  variants: [
    { name: "ANSI / White", priceDelta: 0, available: true },
    { name: "ISO / Graphite", priceDelta: 15, available: false },
  ],
};

const productInvalid = {
  sku: "pulse-pro",
  title: "Pulse",
  price: -20,
  currency: "JPY",
  inStock: "true",
  dimensions: { width: 32.5, height: 4.2 },
  variants: "none",
};

export const SAMPLES: Record<SampleKey, SampleTemplate> = {
  user: {
    key: "user",
    label: "User Profile",
    short: "User",
    filename: "user.schema.json",
    description: "Identity, role and profile constraints with formats and enums.",
    schema: userSchema,
    payload: userPayload,
    invalid: userInvalid,
    accent: "violet",
  },
  transaction: {
    key: "transaction",
    label: "Payment Transaction",
    short: "Transaction",
    filename: "transaction.schema.json",
    description: "Nested customer, line items and currency constraints.",
    schema: transactionSchema,
    payload: transactionPayload,
    invalid: transactionInvalid,
    accent: "emerald",
  },
  iot: {
    key: "iot",
    label: "IoT Sensor Log",
    short: "IoT Log",
    filename: "iot-log.schema.json",
    description: "Telemetry frame with numeric bounds and pattern rules.",
    schema: iotSchema,
    payload: iotPayload,
    invalid: iotInvalid,
    accent: "indigo",
  },
  product: {
    key: "product",
    label: "Product Catalog",
    short: "Product",
    filename: "product.schema.json",
    description: "Catalog item with variants, dimensions and stock flags.",
    schema: productSchema,
    payload: productPayload,
    invalid: productInvalid,
    accent: "rose",
  },
};

export const SAMPLE_KEYS = Object.keys(SAMPLES) as SampleKey[];

export const pretty = (value: unknown): string => JSON.stringify(value, null, 2);

export function sampleStrings(key: SampleKey) {
  const sample = SAMPLES[key];
  return {
    schema: pretty(sample.schema),
    payload: pretty(sample.payload),
    invalid: pretty(sample.invalid),
  };
}

export const DIFF_LEFT = pretty({
  service: "billing-api",
  version: "2.4.0",
  region: "eu-west-1",
  replicas: 3,
  features: { invoices: true, dunning: false, taxEngine: true },
  limits: { rps: 1200, burst: 2400 },
  owners: ["payments", "core-infra"],
});

export const DIFF_RIGHT = pretty({
  service: "billing-api",
  version: "2.5.0",
  region: "eu-west-1",
  replicas: 5,
  features: { invoices: true, dunning: true, taxEngine: true, usageBased: true },
  limits: { rps: 2400, burst: 4800 },
  owners: ["payments", "core-infra", "growth"],
});

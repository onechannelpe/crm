import type { Json } from "./json";

// Field keys are stored verbatim; presentation labels resolve at read time,
// so renaming a label does not rewrite history.
export type FieldChangeValue = string | number | boolean | null;

export type FieldChange = {
  field: string;
  from: FieldChangeValue;
  to: FieldChangeValue;
};

const FIELD_LABELS: Record<string, string> = {
  paybackPricing: "Payback",
  proposedDebitRate: "T. débito",
  proposedCreditRate: "T. crédito",
  proposedForeignRate: "T. foráneo",
  fee: "Fee",
  currency: "Moneda",
  currentProvider: "Proveedor actual",
  currentDebitRate: "Tasa débito actual",
  currentCreditRate: "Tasa crédito actual",
  gpv: "GPV",
  ticket: "Ticket",
  settlementBank: "Banco de abono",
  posCount: "POS total",
  lineOfBusiness: "Giro de negocio",
  status: "Estado",
  priority: "Prioridad",
  stage: "Etapa",
};

function toChangeValue(value: unknown): FieldChangeValue {
  if (value === null || value === undefined) return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return null;
}

export function diffFields<T>(
  prev: Partial<T> | undefined,
  next: T,
  keys: ReadonlyArray<keyof T & string>,
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const key of keys) {
    const from = toChangeValue(prev?.[key]);
    const to = toChangeValue(next[key]);
    if (from !== to) {
      changes.push({ field: key, from, to });
    }
  }
  return changes;
}

function formatChangeValue(value: FieldChangeValue): string {
  if (value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

export function summarizeFieldChanges(changes: FieldChange[]): string {
  return changes
    .map(
      (change) =>
        `${FIELD_LABELS[change.field] ?? change.field}: ${formatChangeValue(change.from)} → ${formatChangeValue(change.to)}`,
    )
    .join(", ");
}

function isFieldChange(value: unknown): value is FieldChange {
  return (
    typeof value === "object" &&
    value !== null &&
    "field" in value &&
    "from" in value &&
    "to" in value
  );
}

export function serializeFieldChanges(
  changes: FieldChange[],
): FieldChange[] | null {
  return changes.length === 0 ? null : changes;
}

export function parseFieldChanges(raw: unknown): FieldChange[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(isFieldChange);
  return [];
}

// The trust boundary sits with the consumer: a non-JSON value would still be
// passed through and break at the next read that does parse it. Accepts
// `unknown` because callers often hold values that are JSON-shaped but not
// statically narrowed (form data, third-party responses, etc).
export function serializeEventPayload(payload?: unknown): Json | null {
  if (payload === null || payload === undefined) return null;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return payload as Json;
}

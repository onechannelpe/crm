// The events spine's shared vocabulary. Every domain occurrence (lead lifecycle,
// auth/security actions, invites, capacity decisions) is one row in `events`.
// Two read models project from it: the per-entity activity feed and the
// cross-entity audit explorer. This module owns the field-diff atom and its
// serialization so producers and both readers can never disagree.

// A field-level change records the raw before/after of one field. Values stay
// typed (booleans stay booleans) so the durable log is locale- and
// presentation-independent; display labels resolve at read time below.
export type FieldChangeValue = string | number | boolean | null;

export type FieldChange = {
  field: string;
  from: FieldChangeValue;
  to: FieldChangeValue;
};

// Display labels for diffable fields. Stored changes keep stable field keys
// only; labels live here so renaming a label never rewrites history and every
// surface reads the same wording.
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
  giroNegocio: "Giro de negocio",
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

// Diff two snapshots over a set of keys, keeping only the fields that moved. An
// empty result means "nothing changed", which callers use to skip the whole
// occurrence (no event, no audit row, no version bump).
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

export function serializeFieldChanges(changes: FieldChange[]): string | null {
  return changes.length === 0 ? null : JSON.stringify(changes);
}

export function parseFieldChanges(raw: string | null): FieldChange[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isFieldChange) : [];
  } catch {
    return [];
  }
}

// Per-type event data (a session id, an invite email, rate-limit details). Kept
// as opaque JSON because it is heterogeneous by event type; the field diff is
// the structured part. Also used for telemetry input summaries.
export function serializeEventPayload(payload?: unknown): string | null {
  if (payload === null || payload === undefined) return null;
  return JSON.stringify(payload);
}

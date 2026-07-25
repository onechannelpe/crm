const WIRE_KINDS = [
  "validation",
  "unauthenticated",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limit",
  "internal",
] as const;

export type WireKind = (typeof WIRE_KINDS)[number];

type WireErrorBase = {
  code: string | null;
  message: string;
};

export type WireError = WireErrorBase &
  (
    | { kind: "rate_limit"; retryAfterSeconds?: number }
    | { kind: Exclude<WireKind, "rate_limit">; retryAfterSeconds?: never }
  );

const FALLBACK_MESSAGE = "Ocurrió un error inesperado.";

// wire is an own property, so it survives Seroval's Error serialization across
// the server-action boundary.
export class ActionError extends Error {
  readonly wire: WireError;

  constructor(wire: WireError) {
    super(wire.message);
    this.name = "ActionError";
    this.wire = wire;
  }
}

function isWireKind(value: unknown): value is WireKind {
  return WIRE_KINDS.some((kind) => kind === value);
}

function isWireError(value: unknown): value is WireError {
  if (!value || typeof value !== "object") return false;
  const kind = Reflect.get(value, "kind");
  const code = Reflect.get(value, "code");
  const message = Reflect.get(value, "message");
  const retryAfterSeconds = Reflect.get(value, "retryAfterSeconds");
  if (!isWireKind(kind)) return false;
  if (code !== null && typeof code !== "string") return false;
  if (typeof message !== "string") return false;
  return kind === "rate_limit"
    ? retryAfterSeconds === undefined || typeof retryAfterSeconds === "number"
    : retryAfterSeconds === undefined;
}

function carriedWire(error: unknown): WireError | undefined {
  if (!error || typeof error !== "object") return undefined;
  const wire = Reflect.get(error, "wire");
  return isWireError(wire) ? wire : undefined;
}

// Unknown failures use a generic message so server details are not exposed to the UI.
export function parseWireError(error: unknown): WireError {
  if (error instanceof ActionError) return error.wire;
  return (
    carriedWire(error) ?? {
      kind: "internal",
      code: null,
      message: FALLBACK_MESSAGE,
    }
  );
}

export function actionErrorMessage(error: unknown): string {
  return parseWireError(error).message;
}

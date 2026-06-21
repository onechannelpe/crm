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

// retryAfterSeconds is meaningful only for a 429, so the union keeps it off
// every other kind. A consumer that reads it has, by construction, already
// narrowed to rate_limit.
export type WireError = WireErrorBase &
  (
    | { kind: "rate_limit"; retryAfterSeconds?: number }
    | { kind: Exclude<WireKind, "rate_limit">; retryAfterSeconds?: never }
  );

const FALLBACK_MESSAGE = "Ocurrió un error inesperado.";

// Transport envelope: carries a WireError verbatim across the server-action
// boundary. seroval (SolidStart's serializer) copies an error's own properties
// via Object.getOwnPropertyNames, so `wire` survives as a nested object that the
// client recovers through parseWireError. The envelope reshapes nothing; the
// only place a WireError is constructed is toWire.
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

// The single runtime owner of the wire shape, paired with the type. Enforces the
// rate_limit/retryAfterSeconds invariant so a malformed payload can never pass as
// a typed WireError.
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

// Resolves any caught value to a WireError. A same-realm ActionError exposes
// `wire` directly; a serialized one (deserialized by seroval on the client)
// carries it as an own property; anything else is an untrusted fault and
// collapses to the generic internal message so a raw throw never leaks to the UI.
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

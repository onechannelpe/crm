/**
 * The wire failure DTO. This is the only error shape that crosses the RPC
 * boundary to the client. It carries nothing internal by construction (no
 * stack, no cause, no dev message), so there is no "sanitize" step to forget:
 * the rich internal failure (`DomainError`) is projected into this once, at the
 * boundary, via `toWire`.
 *
 * `message` is render-ready Spanish, authored on the server (catalog copy, a
 * class default, or the generic line). The client renders it verbatim and owns
 * no copy. `kind` and `code` are for client behavior (branching), never display.
 */
export const WIRE_KINDS = [
  "validation",
  "unauthenticated",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limit",
  "internal",
] as const;

export type WireKind = (typeof WIRE_KINDS)[number];

export interface WireError {
  kind: WireKind;
  /** Granular domain code for client branching. Null when none. */
  code: string | null;
  /** Render-ready Spanish shown to the user. Generic for internal failures. */
  message: string;
  /** Seconds until the client may retry. Only set for kind === "rate_limit". */
  retryAfterSeconds?: number;
}

// Last-resort copy shown when a caught value is not a recognizable wire error
// (a network failure, a serialization glitch, a raw throw). This is the
// client's own fallback, distinct from the server's internal-fault copy: they
// read alike today but change for different reasons, so they stay separate.
const FALLBACK_MESSAGE = "Ocurrió un error inesperado.";

/**
 * Thrown at the public action edge (`runAction`). Its enumerable own fields are
 * the `WireError`, so it serializes cleanly across the RPC boundary and the
 * client reconstructs it with `parseWireError`. It is intentionally not a
 * carrier of internal data.
 */
export class ActionError extends Error {
  readonly kind: WireKind;
  readonly code: string | null;
  readonly retryAfterSeconds?: number;

  constructor(wire: WireError) {
    super(wire.message);
    this.name = "ActionError";
    this.kind = wire.kind;
    this.code = wire.code;
    if (wire.retryAfterSeconds !== undefined) {
      this.retryAfterSeconds = wire.retryAfterSeconds;
    }
  }

  get wire(): WireError {
    return {
      kind: this.kind,
      code: this.code,
      message: this.message,
      ...(this.retryAfterSeconds !== undefined
        ? { retryAfterSeconds: this.retryAfterSeconds }
        : {}),
    };
  }
}

function isWireKind(value: unknown): value is WireKind {
  return WIRE_KINDS.some((kind) => kind === value);
}

// A thrown action error arrives at the client serialized to a plain object, so
// match on shape rather than instanceof.
function isWireShaped(error: unknown): error is WireError {
  if (!error || typeof error !== "object") return false;
  const kind = Reflect.get(error, "kind");
  const code = Reflect.get(error, "code");
  const message = Reflect.get(error, "message");
  return (
    isWireKind(kind) &&
    (code === null || typeof code === "string") &&
    typeof message === "string"
  );
}

/**
 * Resolves any caught value into a `WireError`. Recognizes an `ActionError`,
 * the serialized wire shape that crosses the RPC boundary, and falls back to a
 * generic internal failure for anything else (so a raw thrown value never leaks
 * its message to the UI).
 */
export function parseWireError(error: unknown): WireError {
  if (error instanceof ActionError) return error.wire;
  if (isWireShaped(error)) {
    const retryAfterSeconds = Reflect.get(error, "retryAfterSeconds");
    return {
      kind: error.kind,
      code: error.code,
      message: error.message,
      ...(typeof retryAfterSeconds === "number" ? { retryAfterSeconds } : {}),
    };
  }
  return { kind: "internal", code: null, message: FALLBACK_MESSAGE };
}

/**
 * The user-facing message for a caught action error. Copy is authored on the
 * server (catalog entry, class default, or the generic line) and rides on the
 * wire, so the client renders it verbatim and owns no copy table.
 */
export function actionErrorMessage(error: unknown): string {
  return parseWireError(error).message;
}

/**
 * True when a caught action error matches a granular code or coarse class. For
 * behavioral branching only (field-error placement, recovery flows), never for
 * display.
 */
export function isActionErrorCode(error: unknown, code: string): boolean {
  const wire = parseWireError(error);
  return wire.code === code || wire.kind === code;
}

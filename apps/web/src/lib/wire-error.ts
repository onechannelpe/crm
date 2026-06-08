/**
 * The wire failure DTO. This is the only error shape that crosses the RPC
 * boundary to the client. It carries nothing internal by construction (no
 * stack, no cause, no dev message), so there is no "sanitize" step to forget:
 * the rich internal failure (`DomainError`) is projected into this once, at the
 * boundary, via `toWire`.
 *
 * The client localizes on `kind` (coarse class) and `code` (granular domain
 * code); see `lib/error-messages.ts`. `message` is a fallback only and is never
 * shown when a `kind`/`code` mapping exists.
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
  /** Granular domain code the client localizes on. Null when none. */
  code: string | null;
  /** Public fallback message. Generic for hidden (internal) failures. */
  message: string;
  /** Seconds until the client may retry. Only set for kind === "rate_limit". */
  retryAfterSeconds?: number;
}

export const GENERIC_ERROR = "An unexpected error occurred";

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
  return { kind: "internal", code: null, message: GENERIC_ERROR };
}

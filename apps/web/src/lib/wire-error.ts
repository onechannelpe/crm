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

// Client fallback for failures that never reached the server wire projection.
const FALLBACK_MESSAGE = "Ocurrió un error inesperado.";

// Enumerable wire fields make ActionError survive RPC serialization.
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

export function actionErrorMessage(error: unknown): string {
  return parseWireError(error).message;
}

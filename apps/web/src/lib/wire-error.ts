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
    | {
        kind: Exclude<WireKind, "rate_limit">;
        retryAfterSeconds?: never;
      }
  );

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
    if (this.kind === "rate_limit") {
      return {
        kind: this.kind,
        code: this.code,
        message: this.message,
        ...(this.retryAfterSeconds !== undefined
          ? { retryAfterSeconds: this.retryAfterSeconds }
          : {}),
      };
    }

    return {
      kind: this.kind,
      code: this.code,
      message: this.message,
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
  const retryAfterSeconds = Reflect.get(error, "retryAfterSeconds");
  return (
    isWireKind(kind) &&
    (code === null || typeof code === "string") &&
    typeof message === "string" &&
    (kind === "rate_limit"
      ? retryAfterSeconds === undefined || typeof retryAfterSeconds === "number"
      : retryAfterSeconds === undefined)
  );
}

export function parseWireError(error: unknown): WireError {
  if (error instanceof ActionError) return error.wire;
  if (isWireShaped(error)) {
    if (error.kind !== "rate_limit") {
      return { kind: error.kind, code: error.code, message: error.message };
    }

    const retryAfterSeconds = Reflect.get(error, "retryAfterSeconds");
    return {
      kind: "rate_limit",
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

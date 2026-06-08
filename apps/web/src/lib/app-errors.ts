export const APP_ERROR_CODES = [
  "validation",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limit",
  "internal",
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

interface AppErrorInit {
  code: AppErrorCode;
  publicMessage: string;
  internalMessage?: string;
  /**
   * The granular domain failure code (for example "invalid_ruc" or
   * "missing_cci_soles"). The coarse `code` groups errors for HTTP-style
   * handling; `domainCode` is the stable key the client localizes on, so UI
   * copy never has to parse `publicMessage`. Null when the error did not
   * originate from a DomainError.
   */
  domainCode?: string;
  /** Seconds until the client may retry. Only set for code === "rate_limit". */
  retryAfterSeconds?: number;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly publicMessage: string;
  readonly domainCode: string | null;
  readonly internalMessage: string | null;
  readonly retryAfterSeconds: number | null;
  readonly cause: unknown;

  constructor(init: AppErrorInit) {
    super(init.publicMessage);
    this.name = "AppError";
    this.code = init.code;
    this.publicMessage = init.publicMessage;
    this.domainCode = init.domainCode ?? null;
    this.internalMessage = init.internalMessage ?? null;
    this.retryAfterSeconds = init.retryAfterSeconds ?? null;
    this.cause = init.cause;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

function isSerializedAppError(error: unknown): error is AppErrorInit {
  if (!error || typeof error !== "object") return false;

  const code = Reflect.get(error, "code");
  const publicMessage = Reflect.get(error, "publicMessage");
  const domainCode = Reflect.get(error, "domainCode");
  const internalMessage = Reflect.get(error, "internalMessage");
  const retryAfterSeconds = Reflect.get(error, "retryAfterSeconds");

  return (
    APP_ERROR_CODES.some((value) => value === code) &&
    typeof publicMessage === "string" &&
    (domainCode == null || typeof domainCode === "string") &&
    (internalMessage == null || typeof internalMessage === "string") &&
    (retryAfterSeconds == null || typeof retryAfterSeconds === "number")
  );
}

export function toAppError(error: unknown, fallback: string): AppError {
  if (isAppError(error)) return error;
  if (isSerializedAppError(error)) {
    return new AppError(error);
  }
  if (error instanceof Error) {
    return new AppError({
      code: "internal",
      publicMessage: fallback,
      internalMessage: error.message,
      cause: error,
    });
  }
  return new AppError({
    code: "internal",
    publicMessage: fallback,
    cause: error,
  });
}

export function validationError(publicMessage: string): AppError {
  return new AppError({ code: "validation", publicMessage });
}

export function forbiddenError(publicMessage: string): AppError {
  return new AppError({ code: "forbidden", publicMessage });
}

export function notFoundError(publicMessage: string): AppError {
  return new AppError({ code: "not_found", publicMessage });
}

export function conflictError(publicMessage: string): AppError {
  return new AppError({ code: "conflict", publicMessage });
}

export function rateLimitError(
  publicMessage: string,
  retryAfterSeconds?: number,
): AppError {
  return new AppError({ code: "rate_limit", publicMessage, retryAfterSeconds });
}

export function internalError(publicMessage: string): AppError {
  return new AppError({ code: "internal", publicMessage });
}

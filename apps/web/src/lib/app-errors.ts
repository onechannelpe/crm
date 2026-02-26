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
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly publicMessage: string;
  readonly internalMessage: string | null;
  readonly cause: unknown;

  constructor(init: AppErrorInit) {
    super(init.publicMessage);
    this.name = "AppError";
    this.code = init.code;
    this.publicMessage = init.publicMessage;
    this.internalMessage = init.internalMessage ?? null;
    this.cause = init.cause;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

function resolveCodeFromMessage(message: string): AppErrorCode {
  const safe = message.toLowerCase();
  if (
    safe.includes("unauthorized") ||
    safe.includes("forbidden") ||
    safe.includes("not your")
  ) {
    return "forbidden";
  }
  if (safe.includes("not found")) {
    return "not_found";
  }
  if (safe.includes("rate") || safe.includes("throttle")) {
    return "rate_limit";
  }
  if (
    safe.includes("already") ||
    safe.includes("conflict") ||
    safe.includes("cannot")
  ) {
    return "conflict";
  }
  if (
    safe.includes("required") ||
    safe.includes("invalid") ||
    safe.includes("must")
  ) {
    return "validation";
  }
  return "internal";
}

export function appErrorFromMessage(message: string): AppError {
  return new AppError({
    code: resolveCodeFromMessage(message),
    publicMessage: message,
  });
}

export function toAppError(error: unknown, fallback: string): AppError {
  if (isAppError(error)) return error;
  if (error instanceof Error) {
    if (error.message.trim().length > 0) {
      return appErrorFromMessage(error.message);
    }
    return new AppError({ code: "internal", publicMessage: fallback });
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return appErrorFromMessage(error);
  }
  return new AppError({ code: "internal", publicMessage: fallback });
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

export function rateLimitError(publicMessage: string): AppError {
  return new AppError({ code: "rate_limit", publicMessage });
}

export function internalError(publicMessage: string): AppError {
  return new AppError({ code: "internal", publicMessage });
}

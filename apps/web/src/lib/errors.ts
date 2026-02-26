import { toAppError, type AppErrorCode } from "~/lib/app-errors";

export function getErrorMessage(error: unknown, fallback: string): string {
  return toAppError(error, fallback).publicMessage;
}

export function getErrorCode(error: unknown): AppErrorCode | null {
  try {
    return toAppError(error, "Unexpected error").code;
  } catch {
    return null;
  }
}

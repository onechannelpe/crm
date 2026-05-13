"use server";

import { assertPositiveInt } from "~/contracts/guards";
import { validationError } from "~/lib/app-errors";

export function resolveBoundedPositiveInt(params: {
  value: number | undefined;
  fallback: number;
  name: string;
  max: number;
  maxMessage: string;
}): number {
  const resolved = assertPositiveInt(
    params.value ?? params.fallback,
    params.name,
  );
  if (resolved > params.max) {
    throw validationError(params.maxMessage);
  }
  return resolved;
}

export function trimOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

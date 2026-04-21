import { validationError } from "~/lib/app-errors";

function fail(message: string): never {
  throw validationError(message);
}

export function assertPositiveInt(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 1) {
    fail(`${name} must be a positive integer`);
  }
  return value;
}

export function assertFinitePositive(
  value: number,
  name: string,
  allowZero = false,
): number {
  if (!Number.isFinite(value)) {
    fail(`${name} must be a finite number`);
  }
  if (allowZero ? value < 0 : value <= 0) {
    fail(`${name} must be greater than ${allowZero ? "or equal to 0" : "0"}`);
  }
  return value;
}

export function assertNonEmptyString(value: string, name: string): string {
  const normalized = value.trim();
  if (!normalized) {
    fail(`${name} is required`);
  }
  return normalized;
}

export function assertBoolean(value: boolean, name: string): boolean {
  if (typeof value !== "boolean") {
    fail(`${name} must be a boolean`);
  }
  return value;
}

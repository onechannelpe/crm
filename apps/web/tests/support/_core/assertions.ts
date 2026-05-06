import { expect } from "vitest";

export function expectOk<T>(
  result:
    | { ok: true; value: T }
    | { ok: false; error: { kind?: string; message?: string } },
): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.error.message ?? result.error.kind ?? "expected ok");
  }
  return result.value;
}

export function expectErr<E>(
  result: { ok: true; value: unknown } | { ok: false; error: E },
): E {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error("expected err");
  }
  return result.error;
}

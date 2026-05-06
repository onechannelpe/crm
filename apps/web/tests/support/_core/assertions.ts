import { expect } from "vitest";

export function expectOk<T, E extends { kind?: string; message?: string }>(
  result: { ok: boolean } & ({ ok: true; value: T } | { ok: false; error: E }),
): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.error.message ?? result.error.kind ?? "expected ok");
  }
  return result.value;
}

export function expectErr<T, E extends { kind?: string; message?: string }>(
  result: { ok: boolean } & ({ ok: true; value: T } | { ok: false; error: E }),
): E {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error("expected err");
  }
  return result.error;
}

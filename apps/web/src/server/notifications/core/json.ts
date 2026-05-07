export function safeParseUnknown(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function safeParseObject(value: string): Record<string, unknown> | null {
  const parsed = safeParseUnknown(value);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  return null;
}

export function getString(
  obj: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = obj?.[key];
  return typeof value === "string" ? value : null;
}

export function getNumber(
  obj: Record<string, unknown> | null,
  key: string,
): number | null {
  const value = obj?.[key];
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

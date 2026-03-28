export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function sanitizeField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = normalizeWhitespace(value);
  return normalized.length > 0 ? normalized : null;
}

export function parseJsonOrTextPayload(payloadText: string): unknown {
  const trimmed = payloadText.trim();
  if (trimmed.length < 1) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

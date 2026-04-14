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

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/g, " ")
    .replace(/&aacute;/g, "a")
    .replace(/&Aacute;/g, "A")
    .replace(/&eacute;/g, "e")
    .replace(/&Eacute;/g, "E")
    .replace(/&iacute;/g, "i")
    .replace(/&Iacute;/g, "I")
    .replace(/&oacute;/g, "o")
    .replace(/&Oacute;/g, "O")
    .replace(/&uacute;/g, "u")
    .replace(/&Uacute;/g, "U")
    .replace(/&ntilde;/g, "n")
    .replace(/&Ntilde;/g, "N");
}

export function normalizeLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/:/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

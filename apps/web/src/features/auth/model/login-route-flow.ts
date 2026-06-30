export function parseLoginFlowId(
  raw: string | string[] | undefined,
): string | null {
  if (!raw || Array.isArray(raw)) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseLoginFlowId(
  raw: string | string[] | undefined,
): number | null {
  if (!raw || Array.isArray(raw)) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

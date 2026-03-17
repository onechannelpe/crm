export function normalizeDecisionNote(
  note: string | null | undefined,
): string | null {
  const trimmed = note?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

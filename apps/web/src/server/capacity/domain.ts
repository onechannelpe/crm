export function normalizeDecisionNote(note: string | undefined) {
  const trimmed = note?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

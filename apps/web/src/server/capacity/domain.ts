export function normalizeCapacityReason(reason: string) {
  return reason.trim();
}

export function isPositiveAmount(amount: number) {
  return Number.isInteger(amount) && amount > 0;
}

export function normalizeDecisionNote(note: string | undefined) {
  const trimmed = note?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

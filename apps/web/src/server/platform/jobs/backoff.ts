// Exponential backoff with equal jitter, measured from the instant the attempt
// settled rather than a fresh clock read, so the stored retry time and the
// stored settlement time agree.
export function nextClaimableAt(attemptCount: number, settledAt: Date): Date {
  if (attemptCount <= 0) return settledAt;

  const INITIAL_DELAY_MS = 5_000;
  const MAX_DELAY_MS = 300_000;

  const base = Math.min(
    INITIAL_DELAY_MS * Math.pow(2, attemptCount - 1),
    MAX_DELAY_MS,
  );
  const delayMs = base / 2 + Math.random() * (base / 2);

  return new Date(settledAt.getTime() + delayMs);
}

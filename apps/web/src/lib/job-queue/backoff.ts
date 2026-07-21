// Exponential backoff with equal jitter. `now` is injected so tests can control
// the scheduled retry time.
export function nextClaimableAt(attemptCount: number, now: Date): Date {
  if (attemptCount <= 0) return now;

  const INITIAL_DELAY_MS = 5_000;
  const MAX_DELAY_MS = 300_000;

  const base = Math.min(
    INITIAL_DELAY_MS * Math.pow(2, attemptCount - 1),
    MAX_DELAY_MS,
  );
  const delayMs = base / 2 + Math.random() * (base / 2);

  return new Date(now.getTime() + delayMs);
}

/**
 * Calculates the next availability time for a job using exponential backoff.
 *
 * Strategy: delay * 2^(attemptsMade - 1)
 * Default initial delay: 5 seconds
 * Max delay: 5 minutes
 *
 * `now` is passed in rather than read from `Date.now()` so the backoff respects
 * the same injected clock the queues use. Reading wall time here would make the
 * scheduled `available_at` non-deterministic and unreachable under a test clock.
 */
export function nextAvailableAt(attemptCount: number, now: number): number {
  if (attemptCount <= 0) return now;

  const INITIAL_DELAY_MS = 5_000;
  const MAX_DELAY_MS = 300_000; // 5 minutes

  const delayMs = Math.min(
    INITIAL_DELAY_MS * Math.pow(2, attemptCount - 1),
    MAX_DELAY_MS,
  );

  return now + delayMs;
}

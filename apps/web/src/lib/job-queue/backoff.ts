/**
 * Calculates the next availability time for a job using exponential backoff.
 *
 * Strategy: delay * 2^(attemptsMade - 1)
 * Default initial delay: 5 seconds
 * Max delay: 5 minutes
 */
export function nextAvailableAt(attemptCount: number): number {
  if (attemptCount <= 0) return Date.now();

  const INITIAL_DELAY_MS = 5_000;
  const MAX_DELAY_MS = 300_000; // 5 minutes

  const delayMs = Math.min(
    INITIAL_DELAY_MS * Math.pow(2, attemptCount - 1),
    MAX_DELAY_MS,
  );

  return Date.now() + delayMs;
}

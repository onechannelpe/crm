/**
 * Calculates the next availability time for a job using exponential backoff
 * with jitter.
 *
 * Strategy: base = delay * 2^(attemptsMade - 1), capped, then equal jitter in
 * [base/2, base]. Jitter spreads retries so a batch of jobs that fail at the
 * same instant (a provider outage) does not stampede the queue in lockstep on
 * every subsequent attempt.
 *
 * Default initial delay: 5 seconds. Max base delay: 5 minutes.
 *
 * `now` is passed in rather than read from `Date.now()` so the backoff respects
 * the same injected clock the queues use. Reading wall time here would make the
 * scheduled `available_at` non-deterministic and unreachable under a test clock.
 */
export function nextAvailableAt(attemptCount: number, now: Date): Date {
  if (attemptCount <= 0) return now;

  const INITIAL_DELAY_MS = 5_000;
  const MAX_DELAY_MS = 300_000; // 5 minutes

  const base = Math.min(
    INITIAL_DELAY_MS * Math.pow(2, attemptCount - 1),
    MAX_DELAY_MS,
  );
  const delayMs = base / 2 + Math.random() * (base / 2);

  return new Date(now.getTime() + delayMs);
}

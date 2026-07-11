// Delay grows as initialDelay * 2^(attempt-1), capped, then equal jitter lands
// in [base/2, base]. Jitter spreads retries so a provider outage does not
// stampede the queue in lockstep. `now` is injected so scheduled `available_at`
// is reachable under a test clock.
export function nextAvailableAt(attemptCount: number, now: Date): Date {
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

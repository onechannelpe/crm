export function nextNotificationBackoffMs(attemptCount: number): number {
  const base = Math.min(2 ** attemptCount * 1000, 60_000);
  const jitter = Math.floor(Math.random() * 500);
  return base + jitter;
}

import type { QueueJob, QueueJobType } from "@/src/domain/model";

function createJobId(): string {
  return crypto.randomUUID();
}

export function enqueueJob(
  queue: QueueJob[],
  type: QueueJobType,
  payload: Record<string, unknown>,
): QueueJob[] {
  const now = Date.now();
  const next: QueueJob = {
    id: createJobId(),
    type,
    payload,
    createdAt: now,
    attemptCount: 0,
    nextAttemptAt: now,
    lastError: null,
  };

  return [...queue, next];
}

export function markFailed(job: QueueJob, error: string): QueueJob {
  const nextAttemptCount = job.attemptCount + 1;
  const delayMs = Math.min(5 * 60_000, 2 ** nextAttemptCount * 1000);

  return {
    ...job,
    attemptCount: nextAttemptCount,
    nextAttemptAt: Date.now() + delayMs,
    lastError: error,
  };
}

export function dueJobs(queue: QueueJob[]): QueueJob[] {
  const now = Date.now();
  return queue.filter((job) => job.nextAttemptAt <= now);
}

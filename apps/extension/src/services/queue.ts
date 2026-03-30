import type { QueueJob, QueueJobType } from "@/src/domain/model";

function createJobId(): string {
  return crypto.randomUUID();
}

export function createJob(
  type: QueueJobType,
  payload: Record<string, unknown>,
  sequence: number,
): QueueJob {
  const now = Date.now();
  return {
    id: createJobId(),
    sequence,
    type,
    payload,
    createdAt: now,
    attemptCount: 0,
    nextAttemptAt: now,
    lastError: null,
  };
}

export function appendJob(queue: QueueJob[], job: QueueJob): QueueJob[] {
  return [...queue, job];
}

export function hasQueuedJobType(
  queue: QueueJob[],
  type: QueueJobType,
): boolean {
  return queue.some((job) => job.type === type);
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

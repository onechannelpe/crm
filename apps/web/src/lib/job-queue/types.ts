export interface QueueJobBase {
  id: string | number;
  attempt_count: number;
  max_attempts: number;
}

export interface JobQueueConfig<TJob extends QueueJobBase, TResult> {
  name: string;
  leaseMs: number;
  maxConcurrency?: number;
  timeoutMs?: number;
  batchSize?: number;
  // Clock for backoff scheduling on the crash/timeout retry path. Required: a
  // queue is a time-driven component, so its clock is a core dependency rather
  // than an ambient default. Production passes `Date.now`; tests pass a
  // controlled clock so scheduled `available_at` stays reachable.
  now: () => number;
  poll(limit: number): Promise<TJob[]>;
  handle(job: TJob, signal: AbortSignal): Promise<TResult>;
  onResult?: (
    job: TJob,
    result: TResult,
  ) => Promise<
    | { kind: "complete" }
    | { kind: "retry"; availableAt: number; reason?: string }
    | { kind: "fail"; reason: string }
  >;
  extendLease(jobId: TJob["id"]): Promise<boolean>;
  onComplete(jobId: TJob["id"], result: TResult): Promise<void>;
  onRetry(
    jobId: TJob["id"],
    availableAt: number,
    reason?: string,
  ): Promise<void>;
  onFail(jobId: TJob["id"], reason: string): Promise<void>;
}

export interface QueueRunner {
  name: string;
  runOnce(): Promise<void>;
}

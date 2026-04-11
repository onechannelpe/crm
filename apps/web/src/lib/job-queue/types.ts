export interface QueueJobBase {
  id: number;
  attempt_count: number;
  max_attempts: number;
}

export interface JobQueueConfig<TJob extends QueueJobBase, TResult> {
  name: string;
  leaseMs: number;
  maxConcurrency?: number;
  timeoutMs?: number;
  batchSize?: number;
  poll(limit: number): Promise<TJob[]>;
  handle(job: TJob, signal: AbortSignal): Promise<TResult>;
  classifyFailure?: (
    error: unknown,
    job: TJob,
  ) => {
    retryable: boolean;
    reason: string;
    retryAt?: number;
  };
  extendLease(jobId: number): Promise<boolean>;
  onComplete(jobId: number, result: TResult): Promise<void>;
  onRetry(jobId: number, availableAt: number): Promise<void>;
  onFail(jobId: number, reason: string): Promise<void>;
}

export interface QueueRunner {
  name: string;
  runOnce(): Promise<void>;
}

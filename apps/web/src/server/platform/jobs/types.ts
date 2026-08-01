import type { DomainPatch, JobStore } from "./job-store";

export interface QueueJobBase {
  id: string | number;
  attempt_count: number;
  max_attempts: number;
}

// Handlers classify work. The engine manages retries and queue state.
export type Settlement =
  | { kind: "done"; patch?: DomainPatch }
  | { kind: "retry"; reason?: string; patch?: DomainPatch }
  | { kind: "fail"; reason: string; patch?: DomainPatch };

// Retry outcomes include the next retry time.
export type SettleOutcome =
  | { kind: "done"; patch?: DomainPatch }
  | { kind: "retry"; claimableAt: Date; reason?: string; patch?: DomainPatch }
  | { kind: "fail"; reason: string; patch?: DomainPatch };

export interface JobQueueConfig<
  TJob extends QueueJobBase,
  TId extends string | number = TJob["id"],
> {
  name: string;
  leaseMs: number;
  maxConcurrency?: number;
  timeoutMs?: number;

  // Reject stale workers after a lease is reclaimed.
  workerId: string;

  store: JobStore<TId, TJob>;

  /**
   * `claimedAt` is the instant the batch containing this job was claimed. It is
   * the operation instant for the handler: everything the handler writes stamps
   * with it, so one job run cannot record two different times.
   */
  handle(job: TJob, signal: AbortSignal, claimedAt: Date): Promise<Settlement>;
  onSettled?(job: TJob, outcome: SettleOutcome): void | Promise<void>;
}

export interface QueueRunner {
  name: string;

  // Wait until the queue has no claimable jobs.
  drain(): Promise<void>;
}

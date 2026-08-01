import type { Clock } from "~/domain/time/clock";

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

  // Inject time so tests can control retry scheduling.
  now: Clock;

  // Reject stale workers after a lease is reclaimed.
  workerId: string;

  store: JobStore<TId, TJob>;
  handle(job: TJob, signal: AbortSignal): Promise<Settlement>;
  onSettled?(job: TJob, outcome: SettleOutcome): void | Promise<void>;
}

export interface QueueRunner {
  name: string;

  // Wait until the queue has no claimable jobs.
  drain(): Promise<void>;
}

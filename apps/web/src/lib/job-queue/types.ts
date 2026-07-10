import type { ClaimFilter, DomainPatch, JobStore } from "./job-store";

export interface QueueJobBase {
  id: string | number;
  attempt_count: number;
  max_attempts: number;
}

// Handler returns the outcome; everything else (backoff, attempt ceiling,
// queue_state, lease, mirror columns) is owned by the store/engine. A throw
// or timeout is treated by the engine as an implicit `retry`.
export type Settlement =
  | { kind: "done"; patch?: DomainPatch }
  | { kind: "retry"; reason?: string; patch?: DomainPatch }
  | { kind: "fail"; reason: string; patch?: DomainPatch };

// A settlement after the engine has resolved it: a `retry` carries the
// backoff `available_at` from the injected clock, and a `retry` with no
// attempts left has already been demoted to `fail`. Exposed to `onSettled`
// observers.
export type SettleOutcome =
  | { kind: "done"; patch?: DomainPatch }
  | { kind: "retry"; availableAt: Date; reason?: string; patch?: DomainPatch }
  | { kind: "fail"; reason: string; patch?: DomainPatch };

export interface JobQueueConfig<
  TJob extends QueueJobBase,
  TId extends string | number = TJob["id"],
> {
  name: string;
  leaseMs: number;
  maxConcurrency?: number;
  timeoutMs?: number;
  // Required: a queue is time-driven, so its clock is a core dependency
  // rather than an ambient default. Production passes `() => new Date()`;
  // tests pass a controlled clock so scheduled `available_at` stays
  // reachable.
  now: () => Date;
  // Lease-owner id scopes claim and settle writes, so a reaped-and-reclaimed
  // lease cannot be settled by the old worker.
  workerId: string;
  // The engine claims due rows, extends the lease while a handler runs, and
  // settles the classified outcome. No queue writes claim or settle SQL.
  store: JobStore<TId, TJob>;
  claimFilter?: ClaimFilter;
  handle(job: TJob, signal: AbortSignal): Promise<Settlement>;
  onSettled?(job: TJob, outcome: SettleOutcome): void | Promise<void>;
}

export interface QueueRunner {
  name: string;
  runOnce(): Promise<void>;
}

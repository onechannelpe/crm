import type { ClaimFilter, DomainPatch, JobStore } from "./job-store";

export interface QueueJobBase {
  id: string | number;
  attempt_count: number;
  max_attempts: number;
}

// What a handler decides about a job after running. The engine owns retry
// scheduling (backoff + the injected clock) and the attempt-count ceiling, so a
// handler only classifies the outcome and supplies any EXTRA domain columns to
// write in the same statement as the queue transition (the store already owns
// queue_state, lease, finished-at, error and status). A thrown error or a
// timed-out run is treated by the engine as an implicit `retry`.
export type Settlement =
  | { kind: "done"; patch?: DomainPatch }
  | { kind: "retry"; reason?: string; patch?: DomainPatch }
  | { kind: "fail"; reason: string; patch?: DomainPatch };

// A settlement after the engine has resolved it: a `retry` carries the backoff
// `available_at` from the injected clock, and a `retry` with no attempts left
// has already been demoted to `fail`. Exposed to `onSettled` observers.
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
  // Clock for backoff scheduling and finished-at stamps. Required: a queue is a
  // time-driven component, so its clock is a core dependency rather than an
  // ambient default. Production passes `() => new Date()`; tests pass a
  // controlled clock so scheduled `available_at` stays reachable.
  now: () => Date;
  // This worker's lease-owner id. The engine claims and settles through the
  // store under this id, so a reaped-and-reclaimed lease cannot be settled here.
  workerId: string;
  // The lifecycle state machine for this queue's table. The engine drives it
  // directly: it claims due rows, extends the lease while a handler runs, and
  // settles the classified outcome. No queue writes claim or settle SQL.
  store: JobStore<TId, TJob>;
  // Restricts claims to one job kind when a table multiplexes several.
  claimFilter?: ClaimFilter;
  // Runs the job. Returns a classification; extra domain columns ride `patch`.
  handle(job: TJob, signal: AbortSignal): Promise<Settlement>;
  // Optional post-settle side effect (e.g. streaming records-import progress).
  // Runs after the row is persisted, with the engine-resolved outcome.
  onSettled?(job: TJob, outcome: SettleOutcome): void | Promise<void>;
}

export interface QueueRunner {
  name: string;
  runOnce(): Promise<void>;
}

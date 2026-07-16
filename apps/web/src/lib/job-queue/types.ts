import type { ClaimFilter, DomainPatch, JobStore } from "./job-store";

export interface QueueJobBase {
  id: string | number;
  attempt_count: number;
  max_attempts: number;
}

// Handlers classify work. The engine owns retries, leases, and queue state.
// Throws and timeouts become retries.
export type Settlement =
  | { kind: "done"; patch?: DomainPatch }
  | { kind: "retry"; reason?: string; patch?: DomainPatch }
  | { kind: "fail"; reason: string; patch?: DomainPatch };

// Retry outcomes carry the engine-computed schedule. Exhausted retries become failures.
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
  // Queue time is injected so retries are reproducible under a test clock.
  now: () => Date;
  // Lease-owner id scopes claim and settle writes, so a reaped-and-reclaimed
  // lease cannot be settled by the old worker.
  workerId: string;
  store: JobStore<TId, TJob>;
  claimFilter?: ClaimFilter;
  handle(job: TJob, signal: AbortSignal): Promise<Settlement>;
  onSettled?(job: TJob, outcome: SettleOutcome): void | Promise<void>;
}

export interface QueueRunner {
  name: string;
  runOnce(): Promise<void>;
}

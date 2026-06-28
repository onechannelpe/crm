import { createJobQueue } from "~/lib/job-queue/job-queue";
import type { QueueRunner } from "~/lib/job-queue/types";

import type { IntentJob, IntentRepository } from "../repos/intent-repo";
import type { ExpansionOutcome, IntentExpander } from "./expand-intent";

const LEASE_MS = 30_000;
const BATCH_SIZE = 20;

// Stage 1 queue: lease pending intents and expand them. Fan-out is cheap
// (pure DB), so concurrency is modest. After an intent expands its deliveries,
// ring the dispatch doorbell so the send stage wakes immediately.
export function createIntentExpansionQueue(
  workerId: string,
  deps: {
    intents: IntentRepository;
    expand: IntentExpander;
    clock: () => number;
    onExpanded: () => void;
  },
): QueueRunner {
  return createJobQueue<IntentJob, ExpansionOutcome>({
    name: "notifications-intents",
    leaseMs: LEASE_MS,
    batchSize: BATCH_SIZE,
    maxConcurrency: 4,
    poll: (limit) =>
      deps.intents.claimPending(workerId, deps.clock(), limit, LEASE_MS),
    handle: (job) => deps.expand(job, deps.clock()),
    onResult: async (job, outcome) => {
      if (outcome.kind === "expanded") return { kind: "complete" };
      return { kind: "fail", reason: outcome.reason };
    },
    extendLease: (id) =>
      deps.intents.extendLease(id, workerId, LEASE_MS, deps.clock()),
    onComplete: async (id, outcome) => {
      await deps.intents.markExpanded(id, deps.clock());
      if (outcome.kind === "expanded" && outcome.deliveriesPlanned > 0) {
        deps.onExpanded();
      }
    },
    onRetry: (id, availableAt) => deps.intents.scheduleRetry(id, availableAt),
    onFail: (id, reason) => deps.intents.markFailed(id, reason, deps.clock()),
  });
}

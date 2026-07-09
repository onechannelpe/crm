import { createJobQueue } from "~/lib/job-queue/job-queue";
import type { QueueRunner } from "~/lib/job-queue/types";

import type { IntentJob, IntentRepository } from "../repos/intent-repo";
import type { IntentExpander } from "./expand-intent";

const LEASE_MS = 30_000;

// Fan-out is pure DB, so concurrency is modest. After expansion commits its
// deliveries, onExpanded wakes the dispatch stage so the send starts without
// waiting for the poll floor. The store stamps expanded_at on the terminal
// transition.
export function createIntentExpansionQueue(
  workerId: string,
  deps: {
    intents: IntentRepository;
    expand: IntentExpander;
    clock: () => Date;
    onExpanded: () => void;
  },
): QueueRunner {
  return createJobQueue<IntentJob>({
    name: "notifications-intents",
    leaseMs: LEASE_MS,
    maxConcurrency: 4,
    now: deps.clock,
    workerId,
    store: deps.intents.store,
    handle: async (job) => {
      const outcome = await deps.expand(job, deps.clock());
      if (outcome.kind !== "expanded") {
        return { kind: "fail", reason: outcome.reason };
      }
      // Wake dispatch now. Re-running on a retry is harmless: the planned-
      // delivery insert is idempotent.
      if (outcome.deliveriesPlanned > 0) {
        deps.onExpanded();
      }
      return { kind: "done" };
    },
  });
}

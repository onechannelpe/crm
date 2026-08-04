import { createJobQueue } from "~/server/platform/jobs/job-queue";
import type { QueueRunner } from "~/server/platform/jobs/types";

import type { IntentJob, IntentRepository } from "../repos/intent-repo";
import type { IntentExpander } from "./expand-intent";

const LEASE_MS = 30_000;

// Fan-out is pure DB, so concurrency is modest. The database wakes dispatch
// when planned deliveries become pending. The store stamps completed_at on the
// terminal transition.
export function createIntentExpansionQueue(
  workerId: string,
  deps: {
    intents: IntentRepository;
    expand: IntentExpander;
  },
): QueueRunner {
  return createJobQueue<IntentJob>({
    name: "notifications-intents",
    leaseMs: LEASE_MS,
    maxConcurrency: 4,
    workerId,
    store: deps.intents.store,
    handle: async (job, context) => {
      const outcome = await deps.expand(job, context.operationAt);
      if (outcome.kind !== "expanded") {
        return { kind: "fail", reason: outcome.reason };
      }
      return { kind: "done" };
    },
  });
}

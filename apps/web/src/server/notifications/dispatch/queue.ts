import { createJobQueue } from "~/lib/job-queue/job-queue";
import type { QueueRunner } from "~/lib/job-queue/types";

import type { DeliveryJob, DeliveryRepository } from "../repos/delivery-repo";
import type { DeliverySender } from "./send-delivery";

const LEASE_MS = 30_000;

// Concurrency here is real sends-in-flight, so it's tuned for provider rate
// limits (not DB throughput). Transient failures retry up to max_attempts;
// terminal failures dead-letter as failed. The sender's provider/message/
// error fields ride as `patch` on the same lease-guarded settle statement as
// the queue_state transition (store stamps sent_at itself), so a
// reaped-and-reclaimed lease can never overwrite a newer worker's result.
export function createDeliveryDispatchQueue(
  workerId: string,
  deps: {
    deliveries: DeliveryRepository;
    send: DeliverySender;
    clock: () => Date;
  },
): QueueRunner {
  return createJobQueue<DeliveryJob>({
    name: "notifications-deliveries",
    leaseMs: LEASE_MS,
    maxConcurrency: 8,
    now: deps.clock,
    workerId,
    store: deps.deliveries.store,
    handle: async (job) => {
      const outcome = await deps.send(job);
      if (outcome.kind === "sent") {
        return { kind: "done", patch: { ...outcome.fields } };
      }
      if (outcome.kind === "failed") {
        return {
          kind: "fail",
          reason: outcome.reason,
          patch: { ...outcome.fields },
        };
      }
      return {
        kind: "retry",
        reason: outcome.reason,
        patch: { ...outcome.fields },
      };
    },
  });
}

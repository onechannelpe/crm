import { createJobQueue } from "~/lib/job-queue/job-queue";
import type { QueueRunner } from "~/lib/job-queue/types";

import type { DeliveryJob, DeliveryRepository } from "../repos/delivery-repo";
import type { DeliverySender } from "./send-delivery";

const LEASE_MS = 30_000;

// Concurrency here is real sends-in-flight, so it's tuned for provider rate
// limits (not DB throughput). Transient failures retry up to max_attempts;
// terminal failures dead-letter as failed. The store stamps sent_at on
// success; the sender records the provider attempt.
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
        return { kind: "done" };
      }
      if (outcome.kind === "failed") {
        return { kind: "fail", reason: outcome.reason };
      }
      return { kind: "retry", reason: outcome.reason };
    },
  });
}

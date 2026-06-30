import { createJobQueue } from "~/lib/job-queue/job-queue";
import type { QueueRunner } from "~/lib/job-queue/types";

import type { DeliveryJob, DeliveryRepository } from "../repos/delivery-repo";
import type { DeliverySender } from "./send-delivery";

const LEASE_MS = 30_000;

// Stage 2 queue: one job per external send. Concurrency is the real
// sends-in-flight bound here, so it is tuned for provider rate limits rather
// than DB throughput. Transient failures retry with backoff up to max_attempts;
// terminal failures dead-letter as `failed`. The store stamps `sent_at` on
// success; the provider attempt is recorded by the sender.
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

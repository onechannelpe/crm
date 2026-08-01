import type { Clock } from "~/domain/time/clock";
import { createJobQueue } from "~/server/platform/jobs/job-queue";
import type { QueueRunner } from "~/server/platform/jobs/types";

import type { DeliveryJob, DeliveryRepository } from "../repos/delivery-repo";
import type { DeliverySender } from "./send-delivery";

const LEASE_MS = 30_000;

export function createDeliveryDispatchQueue(
  workerId: string,
  deps: {
    deliveries: DeliveryRepository;
    send: DeliverySender;
    now: Clock;
  },
): QueueRunner {
  return createJobQueue<DeliveryJob>({
    name: "notifications-deliveries",
    leaseMs: LEASE_MS,
    maxConcurrency: 8,
    now: deps.now,
    workerId,
    store: deps.deliveries.store,
    handle: async (job) => {
      const outcome = await deps.send(job);

      if (outcome.kind === "sent") {
        return {
          kind: "done",
          patch: { ...outcome.fields },
        };
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

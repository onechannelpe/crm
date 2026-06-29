import { nextAvailableAt } from "~/lib/job-queue/backoff";
import { createJobQueue } from "~/lib/job-queue/job-queue";
import type { QueueRunner } from "~/lib/job-queue/types";

import type { DeliveryJob, DeliveryRepository } from "../repos/delivery-repo";
import type { DeliverySender } from "./send-delivery";

const LEASE_MS = 30_000;
const BATCH_SIZE = 20;

// Stage 2 queue: one job per external send. Concurrency is the real
// sends-in-flight bound here, so it is tuned for provider rate limits rather
// than DB throughput. Transient failures retry with backoff up to max_attempts;
// terminal failures dead-letter as `failed`.
export function createDeliveryDispatchQueue(
  workerId: string,
  deps: {
    deliveries: DeliveryRepository;
    send: DeliverySender;
    clock: () => number;
  },
): QueueRunner {
  return createJobQueue<DeliveryJob, Awaited<ReturnType<DeliverySender>>>({
    name: "notifications-deliveries",
    leaseMs: LEASE_MS,
    batchSize: BATCH_SIZE,
    maxConcurrency: 8,
    now: deps.clock,
    poll: (limit) =>
      deps.deliveries.claimPending(workerId, deps.clock(), limit, LEASE_MS),
    handle: (job) => deps.send(job),
    onResult: async (job, outcome) => {
      if (outcome.kind === "sent") return { kind: "complete" };
      if (outcome.kind === "failed") {
        return { kind: "fail", reason: outcome.reason };
      }
      // Retryable, but respect the attempt ceiling. `attempt_count` was already
      // incremented when the job was claimed.
      if (job.attempt_count >= job.max_attempts) {
        return { kind: "fail", reason: `max attempts: ${outcome.reason}` };
      }
      return {
        kind: "retry",
        availableAt: nextAvailableAt(job.attempt_count, deps.clock()),
        reason: outcome.reason,
      };
    },
    extendLease: (id) =>
      deps.deliveries.extendLease(id, workerId, LEASE_MS, deps.clock()),
    onComplete: (id) => deps.deliveries.markSent(id, deps.clock()),
    onRetry: (id, availableAt) =>
      deps.deliveries.scheduleRetry(id, availableAt),
    onFail: (id) => deps.deliveries.markFailed(id),
  });
}

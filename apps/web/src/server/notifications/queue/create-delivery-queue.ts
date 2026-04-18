import type {
  DeliveryError,
  DeliveryReceipt,
  Result,
} from "@crm/message-channels";

import { createJobQueue } from "~/lib/job-queue/job-queue";
import { type UserId } from "~/server/shared/ids";

import { processDeliveryJob } from "../application/process-delivery-job";
import { nextNotificationBackoffMs } from "../domain/retry-policy";
import type { NotificationServiceDeps } from "../domain/types";
import type { NotificationDeliveryJob } from "../repos/delivery-job";

interface DeliveryQueueDeps {
  repos: NotificationServiceDeps["repos"];
  messaging: NotificationServiceDeps["messaging"];
  leaseMs: number;
  batchSize: number;
  maxConcurrency: number;
}

interface DeliveryHandleResult {
  recipientId: number;
  startedAt: number;
  delivery: Result<DeliveryReceipt, DeliveryError>;
}

function providerForChannel(
  channel: "email" | "whatsapp",
): "resend" | "whatsapp_cloud" {
  return channel === "email" ? "resend" : "whatsapp_cloud";
}

export function createNotificationDeliveryQueue(
  channel: "email" | "whatsapp",
  workerId: UserId,
  deps: DeliveryQueueDeps,
) {
  return createJobQueue<NotificationDeliveryJob, DeliveryHandleResult>({
    name: `notifications-${channel}`,
    leaseMs: deps.leaseMs,
    batchSize: deps.batchSize,
    maxConcurrency: deps.maxConcurrency,
    poll: (limit: number) =>
      deps.repos.notificationDeliveryJob.claimPendingJobsByChannel({
        channel,
        workerId,
        limit,
        leaseMs: deps.leaseMs,
      }),
    handle: async (job) => {
      const startedAt = Date.now();
      const delivery = await processDeliveryJob(
        { messaging: deps.messaging },
        job,
      );
      return { recipientId: job.recipientId, startedAt, delivery };
    },
    onResult: async (job, handled) => {
      if (handled.delivery.ok) {
        return { kind: "complete" };
      }

      const message = handled.delivery.error.message;

      if (
        handled.delivery.error.retryable &&
        job.attempt_count < job.max_attempts
      ) {
        return {
          kind: "retry",
          availableAt:
            Date.now() + nextNotificationBackoffMs(job.attempt_count),
          reason: message,
        };
      }

      const failedAt = Date.now();
      await deps.repos.notificationDeliveryLog.markRecipientFailed(
        handled.recipientId,
        failedAt,
        message,
      );
      await deps.repos.notificationDeliveryLog.createDelivery({
        recipient_id: handled.recipientId,
        provider: providerForChannel(channel),
        provider_message_id: null,
        status: "failed",
        error_code: handled.delivery.error.code,
        error_message: message,
        latency_ms: failedAt - handled.startedAt,
        created_at: failedAt,
      });

      return {
        kind: "fail",
        reason: message,
      };
    },
    extendLease: (jobId: number) =>
      deps.repos.notificationDeliveryJob.extendJobLease(
        jobId,
        workerId,
        deps.leaseMs,
      ),
    onComplete: async (jobId: number, handled) => {
      const sentAt = Date.now();
      if (!handled.delivery.ok) {
        throw new Error(
          "Cannot complete notification job with failed delivery",
        );
      }

      await deps.repos.notificationDeliveryJob.markJobSent(jobId, workerId);
      await deps.repos.notificationDeliveryLog.markRecipientSent(
        handled.recipientId,
        sentAt,
      );
      await deps.repos.notificationDeliveryLog.createDelivery({
        recipient_id: handled.recipientId,
        provider: handled.delivery.value.provider,
        provider_message_id: handled.delivery.value.providerMessageId,
        status: "sent",
        error_code: null,
        error_message: null,
        latency_ms: sentAt - handled.startedAt,
        created_at: sentAt,
      });
    },
    onRetry: async (jobId: number, availableAt: number, reason?: string) => {
      await deps.repos.notificationDeliveryJob.scheduleJobRetry({
        jobId,
        workerId,
        availableAt,
        error: reason ?? "Retrying notification delivery",
      });
    },
    onFail: async (jobId: number, reason: string) => {
      await deps.repos.notificationDeliveryJob.markJobFailed(
        jobId,
        workerId,
        reason,
      );
    },
  });
}

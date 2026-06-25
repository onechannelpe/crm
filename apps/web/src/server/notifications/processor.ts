import type { Logger } from "~/lib/observability/logger-shared";

import type { NotificationDeliveryService } from "./delivery-executor";
import type {
  NotificationOutboxEntry,
  PlannedDeliveries,
} from "./delivery-planner";
import type {
  NotificationOutboxProcessingRepository,
  ProcessableNotification,
} from "./repos/outbox-processing";

type NotificationPlanner = (
  entry: NotificationOutboxEntry,
  now: number,
) => Promise<PlannedDeliveries>;

export function createNotificationProcessor(deps: {
  outbox: NotificationOutboxProcessingRepository;
  plan: NotificationPlanner;
  delivery: NotificationDeliveryService;
  clock: () => number;
  logger: Pick<Logger, "info" | "error">;
}) {
  async function processEntry(
    entry: ProcessableNotification,
    now: number,
  ): Promise<void> {
    const planned = await deps.plan(
      {
        id: entry.id,
        event_type: entry.event_type,
        audience_json: entry.audience_json,
        channels_json: entry.channels_json,
      },
      now,
    );

    deps.logger.info("intent_processing", {
      id: entry.id,
      event_type: entry.event_type,
      recipient_count: planned.recipients.length,
    });

    await deps.delivery.deliverInApp(entry, planned.inAppRecipients, now);
    for (const external of planned.externalDeliveries) {
      await deps.delivery.deliverExternal(entry, external, now);
    }
  }

  async function runOnce(workerId: string, limit = 50): Promise<number> {
    const now = deps.clock();
    const entries = await deps.outbox.lease({ workerId, now, limit });

    for (const entry of entries) {
      try {
        await processEntry(entry, now);
        await deps.outbox.markDone(entry.id, now);
      } catch (error) {
        deps.logger.error("intent_failed", {
          id: entry.id,
          error: String(error),
        });
        await deps.outbox.markFailed(entry.id, error, now);
      }
    }

    return entries.length;
  }

  async function runUntilIdle(input: {
    workerId: string;
    batchSize?: number;
    maxBatches?: number;
  }): Promise<{ processed: number }> {
    const batchSize = input.batchSize ?? 50;
    const maxBatches = input.maxBatches ?? 100;
    let processed = 0;

    for (let batch = 0; batch < maxBatches; batch += 1) {
      const batchCount = await runOnce(input.workerId, batchSize);
      processed += batchCount;
      if (batchCount === 0) {
        const outstanding = await deps.outbox.countOutstanding();
        if (outstanding !== 0) {
          throw new Error(
            `Notification processor stopped with ${outstanding} outstanding intent(s)`,
          );
        }
        return { processed };
      }
    }

    const outstanding = await deps.outbox.countOutstanding();
    throw new Error(
      `Notification processor exceeded ${maxBatches} batches with ${outstanding} outstanding intent(s)`,
    );
  }

  return { runOnce, runUntilIdle };
}

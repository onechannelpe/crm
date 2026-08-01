import {
  createRecipientPlanner,
  projectIntentForPlanning,
} from "~/server/notifications/expansion/plan-recipients";
import { createDeliveryRepository } from "~/server/notifications/repos/delivery-repo";
import { createIntentRepository } from "~/server/notifications/repos/intent-repo";
import type { NotificationIntent } from "~/server/notifications/types";
import { assembleNotificationPipeline } from "~/server/notifications/ui/composition";
import { createLogger } from "~/shared/observability/runtime-logger";
import { isErr } from "~/shared/result";

import { createScriptedMessagingGateway } from "../fakes/messaging-gateway";
import type { TestRuntime } from "../runtime/app";

const MAX_DRAIN_PASSES = 50;

export function createTestNotificationRuntime(runtime: TestRuntime) {
  const logger = createLogger("test-notifications");
  const messages = createScriptedMessagingGateway();

  const pipeline = assembleNotificationPipeline({
    db: runtime.ctx.db,
    messaging: messages.gateway,
    now: () => runtime.now.get(),
    publicOrigin: "https://app.example.test",
    logger,
  });

  const queues = pipeline.createQueues("test-notifications");
  const intents = createIntentRepository(runtime.ctx.db);
  const deliveries = createDeliveryRepository(runtime.ctx.db);
  const planRecipients = createRecipientPlanner(runtime.ctx.db, logger);

  // Use this instead of drain() when a test needs to inspect the pipeline after
  // exactly one expansion/dispatch pass.
  async function expandThenDispatch() {
    await queues.expansion.drain();
    await queues.dispatch.drain();
  }

  async function drain() {
    for (let pass = 0; pass < MAX_DRAIN_PASSES; pass++) {
      await expandThenDispatch();

      if (
        (await intents.store.countOutstanding()) === 0 &&
        (await deliveries.store.countOutstanding()) === 0
      ) {
        return;
      }
    }

    throw new Error("notification pipeline did not drain");
  }

  function advanceClock(ms: number) {
    runtime.now.set(new Date(runtime.now.get().getTime() + ms));
  }

  function planIntentRow(
    row: { event_type: string; audience_json: unknown; channels_json: unknown },
    now = runtime.now.get(),
  ) {
    const input = projectIntentForPlanning(row);

    if (isErr(input)) {
      throw new Error(input.error);
    }

    return planRecipients(input.value, now);
  }

  return {
    messages,
    intents,
    deliveries,
    appNotifications: pipeline.appNotifications,
    enqueue: (intentsToEnqueue: NotificationIntent[], now?: Date) =>
      pipeline.enqueue(intentsToEnqueue, now),
    planRecipients,
    planIntentRow,
    queues,
    expandThenDispatch,
    drain,
    advanceClock,
  };
}

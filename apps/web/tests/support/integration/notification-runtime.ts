import type { Json } from "~/contracts/json";
import { createLogger } from "~/lib/observability/logger";
import { createRecipientPlanner } from "~/server/notifications/expansion/plan-recipients";
import {
  parseNotificationAudience,
  parseNotificationChannels,
} from "~/server/notifications/intent/payload";
import { createDeliveryRepository } from "~/server/notifications/repos/delivery-repo";
import { createIntentRepository } from "~/server/notifications/repos/intent-repo";
import { createRecipientRepository } from "~/server/notifications/repos/recipient-repo";
import type { NotificationIntent } from "~/server/notifications/types";
import { assembleNotificationPipeline } from "~/server/platform/container/notifications-runtime";

import { createScriptedMessagingGateway } from "../fakes/messaging-gateway";
import type { TestRuntime } from "../runtime/app";

const MAX_DRAIN_PASSES = 50;

// Wires the real notification pipeline (via the shared assembly) against the
// test database, a controlled clock, and a scripted gateway. Read-side repos
// and the planner are constructed separately for assertions; they read the same
// tables the pipeline writes.
export function createTestNotificationRuntime(runtime: TestRuntime) {
  const logger = createLogger("test-notifications");
  const messages = createScriptedMessagingGateway();

  const pipeline = assembleNotificationPipeline({
    db: runtime.ctx.db,
    messaging: messages.gateway,
    clock: () => runtime.now.get(),
    publicOrigin: "https://app.example.test",
    logger,
  });

  const queues = pipeline.createQueues("test-notifications");
  const intents = createIntentRepository(runtime.ctx.db);
  const deliveries = createDeliveryRepository(runtime.ctx.db);
  const planRecipients = createRecipientPlanner({
    repository: createRecipientRepository(runtime.ctx.db),
    logger,
  });

  // One expansion pass followed by one dispatch pass. Expansion runs first so a
  // freshly expanded intent's delivery rows are visible to dispatch in the same
  // call. Use this directly to assert mid-flight state (e.g. a scheduled retry)
  // that `drain` would otherwise loop past.
  async function runOnce() {
    await queues.expansion.runOnce();
    await queues.dispatch.runOnce();
  }

  async function drain() {
    for (let pass = 0; pass < MAX_DRAIN_PASSES; pass++) {
      await runOnce();
      if (
        (await intents.countOutstanding()) === 0 &&
        (await deliveries.countOutstanding()) === 0
      ) {
        return;
      }
    }
    throw new Error("notification pipeline did not drain");
  }

  // Moves the injected clock forward so retries scheduled with backoff become
  // claimable. Backoff is computed from this same clock (see nextAvailableAt).
  function advanceClock(ms: number) {
    runtime.now.set(new Date(runtime.now.get().getTime() + ms));
  }

  function planIntentRow(
    row: { audience_json: Json; channels_json: Json },
    now = runtime.now.get(),
  ) {
    return planRecipients(
      {
        audience: parseNotificationAudience(row.audience_json),
        channels: parseNotificationChannels(row.channels_json),
      },
      now,
    );
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
    runOnce,
    drain,
    advanceClock,
  };
}

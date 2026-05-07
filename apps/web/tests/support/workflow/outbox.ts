import { createWorkflowNotificationOutboxQueue } from "~/server/workflow/infrastructure/workflow-notification-outbox-queue";

import type { TestRuntime } from "../runtime/app";

export function createWorkflowOutbox(runtime: TestRuntime) {
  const outbox = {
    async counts(status: "pending" | "completed") {
      const workflowNotifications = await runtime.ctx.db
        .selectFrom("workflow_notification_outbox")
        .select((eb) => eb.fn.count<number>("id").as("count"))
        .where("status", "=", status)
        .executeTakeFirstOrThrow();
      return {
        notifications: workflowNotifications.count,
      };
    },

    async drainAll(workerId = "test-worker"): Promise<void> {
      const queue = createWorkflowNotificationOutboxQueue(workerId, {
        executor: runtime.integrations.executor,
      });

      for (let index = 0; index < 5; index += 1) {
        await queue.runOnce();
        const pending = await outbox.counts("pending");
        if (pending.notifications === 0) {
          return;
        }
      }
    },
  };
  return outbox;
}

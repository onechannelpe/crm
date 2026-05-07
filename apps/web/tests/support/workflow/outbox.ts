import { createNotificationProcessor } from "~/server/notifications/processor";

import type { TestRuntime } from "../runtime/app";

export function createWorkflowOutbox(runtime: TestRuntime) {
  const outbox = {
    async counts(status: "pending" | "done") {
      const count = await runtime.ctx.db
        .selectFrom("notification_outbox")
        .select((eb) => eb.fn.count<number>("id").as("count"))
        .where("status", "=", status)
        .executeTakeFirstOrThrow();
      return { notifications: count.count };
    },

    async drainAll(workerId = "test-worker"): Promise<void> {
      const runOnce = createNotificationProcessor(runtime.ctx.db, {
        async sendCampaignEmail() {
          return {
            ok: true as const,
            value: {
              channel: "email",
              provider: "resend",
              providerMessageId: "campaign",
            },
          };
        },
        async sendWhatsAppText() {
          return {
            ok: true as const,
            value: {
              channel: "whatsapp",
              provider: "whatsapp_cloud",
              providerMessageId: "whatsapp",
            },
          };
        },
      });

      for (let index = 0; index < 5; index += 1) {
        await runOnce(workerId, 50);
        const pending = await outbox.counts("pending");
        if (pending.notifications === 0) return;
      }
    },
  };
  return outbox;
}

import { createNotificationIntentProcessor } from "~/server/notifications/unified";

import type { TestRuntime } from "../runtime/app";

export function createWorkflowOutbox(runtime: TestRuntime) {
  const outbox = {
    async counts(status: "pending" | "completed") {
      const workflowNotifications = await runtime.ctx.db
        .selectFrom("notification_intents_outbox")
        .select((eb) => eb.fn.count<number>("intent_id").as("count"))
        .where("status", "=", status)
        .executeTakeFirstOrThrow();
      return {
        notifications: workflowNotifications.count,
      };
    },

    async drainAll(workerId = "test-worker"): Promise<void> {
      const runOnce = createNotificationIntentProcessor(runtime.ctx.db, {
        async sendInviteEmail() {
          return {
            ok: true as const,
            value: {
            channel: "email",
            provider: "resend",
            providerMessageId: "invite",
            },
          };
        },
        async sendPasswordResetEmail() {
          return {
            ok: true as const,
            value: {
            channel: "email",
            provider: "resend",
            providerMessageId: "password-reset",
            },
          };
        },
        async sendAccountExpiringEmail() {
          return {
            ok: true as const,
            value: {
            channel: "email",
            provider: "resend",
            providerMessageId: "account-expiring",
            },
          };
        },
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
        if (pending.notifications === 0) {
          return;
        }
      }
    },
  };
  return outbox;
}

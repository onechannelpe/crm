import { afterAll, beforeAll, bench, describe } from "vitest";

import type { MessagingGateway } from "~/server/notifications/messaging-gateway";
import { createNotificationProcessor } from "~/server/notifications/processor";

import { createBenchDbFixture } from "../_shared/fixture";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import {
  INTENT_POOL_SIZE,
  seedNotificationsDeliveryFixtures,
} from "./fixtures";

describe("notifications delivery service benchmark", () => {
  const db = createBenchDbFixture("bench-notifications-delivery-service");
  let intentIds: string[] = [];
  const cursor = { value: 0 };

  const messaging: Pick<
    MessagingGateway,
    "sendCampaignEmail" | "sendWhatsAppText"
  > = {
    async sendCampaignEmail() {
      return {
        ok: true as const,
        value: {
          channel: "email",
          provider: "resend",
          providerMessageId: "bench-email-id",
        },
      };
    },
    async sendWhatsAppText() {
      return {
        ok: true as const,
        value: {
          channel: "whatsapp",
          provider: "whatsapp_cloud",
          providerMessageId: "bench-whatsapp-id",
        },
      };
    },
  };

  beforeAll(async () => {
    const ctx = await db.setup();
    const fixtures = await seedNotificationsDeliveryFixtures(ctx);
    intentIds = fixtures.intentIds;
  });

  afterAll(async () => {
    await db.teardown();
  });

  bench(
    "service path: process one intent with in-app + external fanout",
    async () => {
      const intentId = takeFromPool(
        intentIds,
        cursor,
        "notifications delivery pool exhausted before iterations completed",
      );
      const ctx = db.ctx();
      const runOnce = createNotificationProcessor(ctx.db, messaging);

      await runOnce(`bench-worker-${intentId}`, 1);
    },
    fixedIterations(INTENT_POOL_SIZE),
  );
});

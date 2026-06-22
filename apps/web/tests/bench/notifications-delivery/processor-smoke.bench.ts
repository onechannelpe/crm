import { afterAll, beforeAll, bench, describe } from "vitest";

import type { MessagingGateway } from "~/server/notifications/messaging-gateway";

import { createBenchDbFixture } from "../_shared/fixture";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import {
  PROCESSOR_SMOKE_INTENT_COUNT,
  seedProcessorSmokeFixtures,
} from "./fixtures";

describe("notifications delivery processor smoke benchmark", () => {
  const db = createBenchDbFixture(
    "bench-notifications-delivery-processor-smoke",
  );
  let intentIds: string[] = [];
  const cursor = { value: 0 };
  let runOnce: ((workerId: string, limit?: number) => Promise<void>) | null =
    null;
  const originalLogLevel = process.env.LOG_LEVEL;

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
    process.env.LOG_LEVEL = "error";

    const ctx = await db.setup();
    intentIds = await seedProcessorSmokeFixtures(ctx);

    const module = await import("~/server/notifications/processor");
    runOnce = module.createNotificationProcessor(ctx.db, messaging, {
      publicOrigin: "http://localhost:3000",
    });
  });

  afterAll(async () => {
    process.env.LOG_LEVEL = originalLogLevel;
    await db.teardown();
  });

  bench(
    "service path: processor runOnce smoke",
    async () => {
      if (runOnce === null) {
        throw new Error("processor benchmark used before setup");
      }

      const intentId = takeFromPool(
        intentIds,
        cursor,
        "processor smoke pool exhausted before iterations completed",
      );

      await runOnce(`bench-smoke-${intentId}`, 1);
    },
    {
      ...fixedIterations(PROCESSOR_SMOKE_INTENT_COUNT),
      warmupTime: 0,
      warmupIterations: 0,
    },
  );
});

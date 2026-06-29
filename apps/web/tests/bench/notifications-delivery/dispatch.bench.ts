import { afterAll, beforeAll, bench, describe } from "vitest";

import { createLogger } from "~/lib/observability/logger";
import type { MessagingGateway } from "~/server/notifications/channels/messaging-gateway";
import { createDeliverySender } from "~/server/notifications/dispatch/send-delivery";
import {
  createDeliveryRepository,
  type DeliveryJob,
} from "~/server/notifications/repos/delivery-repo";

import { createBenchDbFixture } from "../_shared/fixture";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { DISPATCH_DELIVERY_COUNT, seedDispatchFixtures } from "./fixtures";

// No-op gateway: the dispatch benchmark measures the send path (message build +
// attempt recording), not provider I/O.
const messaging: Pick<
  MessagingGateway,
  "sendCampaignEmail" | "sendWhatsAppText"
> = {
  async sendCampaignEmail() {
    return {
      ok: true,
      value: {
        channel: "email",
        provider: "resend",
        providerMessageId: "bench-email-id",
      },
    };
  },
  async sendWhatsAppText() {
    return {
      ok: true,
      value: {
        channel: "whatsapp",
        provider: "whatsapp_cloud",
        providerMessageId: "bench-whatsapp-id",
      },
    };
  },
};

describe("notifications dispatch benchmark", () => {
  const db = createBenchDbFixture("bench-notifications-dispatch");
  const cursor = { value: 0 };
  let pool: DeliveryJob[] = [];
  let send: ReturnType<typeof createDeliverySender> | null = null;
  const originalLogLevel = process.env.LOG_LEVEL;

  beforeAll(async () => {
    process.env.LOG_LEVEL = "error";
    const ctx = await db.setup();
    pool = await seedDispatchFixtures(ctx);

    send = createDeliverySender({
      messaging,
      deliveries: createDeliveryRepository(ctx.db),
      publicOrigin: "http://localhost:3000",
      logger: createLogger("bench-notification-dispatch"),
    });
  });

  afterAll(async () => {
    process.env.LOG_LEVEL = originalLogLevel;
    await db.teardown();
  });

  bench(
    "service path: send one delivery",
    async () => {
      if (!send) throw new Error("dispatch benchmark used before setup");
      const job = takeFromPool(pool, cursor, "dispatch pool exhausted");
      await send(job);
    },
    {
      ...fixedIterations(DISPATCH_DELIVERY_COUNT),
      warmupTime: 0,
      warmupIterations: 0,
    },
  );
});

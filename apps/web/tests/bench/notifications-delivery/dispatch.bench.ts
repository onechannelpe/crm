import { afterAll, beforeAll, beforeEach, bench, describe } from "vitest";

import type { UserId } from "~/domain/ids";
import type { MessagingGateway } from "~/server/notifications/channels/messaging-gateway";
import { createDeliverySender } from "~/server/notifications/dispatch/send-delivery";
import type { DeliveryJob } from "~/server/notifications/repos/delivery-repo";
import { createLogger } from "~/shared/observability/runtime-logger";

import { createBenchDbFixture } from "../_shared/fixture";
import { SINGLE_CALL } from "../_shared/options";
import { seedDispatchDelivery, seedDispatchRecipient } from "./fixtures";

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
  let send: ReturnType<typeof createDeliverySender>;
  let userId: UserId;
  let job: DeliveryJob;
  const originalLogLevel = process.env.LOG_LEVEL;

  beforeAll(async () => {
    process.env.LOG_LEVEL = "error";
    const ctx = await db.setup();
    userId = await seedDispatchRecipient(ctx);

    send = createDeliverySender({
      messaging,
      publicOrigin: "http://localhost:3000",
      logger: createLogger("bench-notification-dispatch"),
    });
  });

  beforeEach(async () => {
    job = await seedDispatchDelivery(db.ctx(), userId);
  });

  afterAll(async () => {
    process.env.LOG_LEVEL = originalLogLevel;
    await db.teardown();
  });

  bench(
    "service path: send one delivery",
    async () => {
      await send(job);
    },
    SINGLE_CALL,
  );
});

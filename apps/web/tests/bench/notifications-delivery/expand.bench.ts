import { afterAll, beforeAll, beforeEach, bench, describe } from "vitest";

import type { UserId } from "~/domain/ids";
import { createIntentExpander } from "~/server/notifications/expansion/expand-intent";
import { createRecipientPlanner } from "~/server/notifications/expansion/plan-recipients";
import { createAppNotificationRepo } from "~/server/notifications/repos/app-notification";
import { createDeliveryRepository } from "~/server/notifications/repos/delivery-repo";
import type { IntentJob } from "~/server/notifications/repos/intent-repo";
import { createLogger } from "~/shared/observability/runtime-logger";

import { BENCH_NOW } from "../_shared/constants";
import { createBenchDbFixture } from "../_shared/fixture";
import { SINGLE_CALL } from "../_shared/options";
import { seedExpandIntent, seedExpandRecipients } from "./fixtures";

describe("notifications expansion benchmark", () => {
  const db = createBenchDbFixture("bench-notifications-expand");
  let expand: ReturnType<typeof createIntentExpander>;
  let recipients: UserId[];
  let job: IntentJob;
  const originalLogLevel = process.env.LOG_LEVEL;

  beforeAll(async () => {
    process.env.LOG_LEVEL = "error";
    const ctx = await db.setup();
    recipients = await seedExpandRecipients(ctx);

    const logger = createLogger("bench-notification-expand");
    expand = createIntentExpander({
      planRecipients: createRecipientPlanner(ctx.db, logger),
      appNotifications: createAppNotificationRepo(ctx.db),
      deliveries: createDeliveryRepository(ctx.db),
      logger,
    });
  });

  beforeEach(async () => {
    job = await seedExpandIntent(db.ctx(), recipients);
  });

  afterAll(async () => {
    process.env.LOG_LEVEL = originalLogLevel;
    await db.teardown();
  });

  bench(
    "service path: expand one intent",
    async () => {
      await expand(job, BENCH_NOW);
    },
    SINGLE_CALL,
  );
});

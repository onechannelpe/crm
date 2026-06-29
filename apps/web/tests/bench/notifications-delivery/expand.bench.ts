import { afterAll, beforeAll, bench, describe } from "vitest";

import { createLogger } from "~/lib/observability/logger";
import { createIntentExpander } from "~/server/notifications/expansion/expand-intent";
import { createRecipientPlanner } from "~/server/notifications/expansion/plan-recipients";
import { createAppNotificationRepo } from "~/server/notifications/repos/app-notification";
import { createDeliveryRepository } from "~/server/notifications/repos/delivery-repo";
import type { IntentJob } from "~/server/notifications/repos/intent-repo";
import { createRecipientRepository } from "~/server/notifications/repos/recipient-repo";

import { BENCH_NOW } from "../_shared/constants";
import { createBenchDbFixture } from "../_shared/fixture";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { EXPAND_INTENT_COUNT, seedExpandFixtures } from "./fixtures";

describe("notifications expansion benchmark", () => {
  const db = createBenchDbFixture("bench-notifications-expand");
  const cursor = { value: 0 };
  let pool: IntentJob[] = [];
  let expand: ReturnType<typeof createIntentExpander> | null = null;
  const originalLogLevel = process.env.LOG_LEVEL;

  beforeAll(async () => {
    process.env.LOG_LEVEL = "error";
    const ctx = await db.setup();
    pool = await seedExpandFixtures(ctx);

    const logger = createLogger("bench-notification-expand");
    expand = createIntentExpander({
      planRecipients: createRecipientPlanner({
        repository: createRecipientRepository(ctx.db),
        logger,
      }),
      appNotifications: createAppNotificationRepo(ctx.db),
      deliveries: createDeliveryRepository(ctx.db),
      logger,
    });
  });

  afterAll(async () => {
    process.env.LOG_LEVEL = originalLogLevel;
    await db.teardown();
  });

  bench(
    "service path: expand one intent",
    async () => {
      if (!expand) throw new Error("expand benchmark used before setup");
      const job = takeFromPool(pool, cursor, "expand pool exhausted");
      await expand(job, BENCH_NOW);
    },
    {
      ...fixedIterations(EXPAND_INTENT_COUNT),
      warmupTime: 0,
      warmupIterations: 0,
    },
  );
});

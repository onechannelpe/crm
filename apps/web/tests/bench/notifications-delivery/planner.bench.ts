import { afterAll, beforeAll, bench, describe } from "vitest";

import {
  planDeliveries,
  type NotificationOutboxEntry,
} from "~/server/notifications/delivery-planner";

import { createBenchDbFixture } from "../_shared/fixture";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import {
  INTENT_POOL_SIZE,
  seedNotificationsDeliveryFixtures,
} from "./fixtures";

describe("notifications delivery planner benchmark", () => {
  const db = createBenchDbFixture("bench-notifications-delivery-planner");
  let entries: NotificationOutboxEntry[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    const ctx = await db.setup();
    const fixtures = await seedNotificationsDeliveryFixtures(ctx);

    entries = await ctx.db
      .selectFrom("notification_outbox")
      .select(["id", "event_type", "audience_json", "channels_json"])
      .where("id", "in", fixtures.intentIds)
      .execute();
  });

  afterAll(async () => {
    await db.teardown();
  });

  bench(
    "service path: plan recipients and channel deliveries",
    async () => {
      const entry = takeFromPool(
        entries,
        cursor,
        "notifications planner pool exhausted before iterations completed",
      );

      await planDeliveries(db.ctx().db, entry);
    },
    fixedIterations(INTENT_POOL_SIZE),
  );
});

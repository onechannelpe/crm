import { afterAll, beforeAll, bench, describe } from "vitest";

import type { UserId } from "~/server/shared/ids";
import { currentMonthlyPeriod } from "~/server/shared/time";

import { createBenchDbFixture } from "../_shared/fixture";
import { seedQuotaUser } from "./fixtures";

describe("search capacity grant repository benchmark", () => {
  const db = createBenchDbFixture("bench-quota-consume-repository");
  let userId: UserId;

  beforeAll(async () => {
    const ctx = await db.setup();
    userId = await seedQuotaUser(ctx);
  });

  afterAll(async () => {
    await db.teardown();
  });

  bench("repository path: load search capacity grants by user and period", async () => {
    const { periodStart, periodEnd } = currentMonthlyPeriod(new Date());
    const grants = await db
      .ctx()
      .repos.searchCapacityGrants.findByUserAndPeriod(
        userId,
        periodStart,
        periodEnd,
      );
    if (grants.length === 0) {
      throw new Error("expected at least one search capacity grant row");
    }
  });
});

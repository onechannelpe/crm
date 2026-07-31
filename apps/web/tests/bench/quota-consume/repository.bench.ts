import { afterAll, beforeAll, bench, describe } from "vitest";

import { appMonthRange } from "~/domain/time/app-time";
import type { UserId } from "~/domain/ids";

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
    const range = appMonthRange(new Date());
    const grants = await db
      .ctx()
      .repos.searchCapacityGrants.findByUserAndRange(userId, range);
    if (grants.length === 0) {
      throw new Error("expected at least one search capacity grant row");
    }
  });
});

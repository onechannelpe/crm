import { afterAll, beforeAll, bench, describe } from "vitest";

import { createQuotaService } from "~/server/quota/service";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("quota performance", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("quota-bench");
    const quota = createQuotaService(ctx.repos);
    const day = new Date().toISOString().slice(0, 10);
    await quota.allocate(2, 1, 120, day);
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  bench("consumes a single quota unit", async () => {
    const quota = createQuotaService(ctx.repos);
    await quota.consume(1, 1);
  });
});

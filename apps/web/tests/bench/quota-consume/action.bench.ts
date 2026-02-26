import { afterAll, beforeAll, bench, describe } from "vitest";

import { createQuotaService } from "~/server/quota/service";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { BENCH_DATE } from "../_shared/constants";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { seedQuotaUsers, USER_POOL_SIZE } from "./fixtures";

describe("quota consume action benchmark", () => {
  let ctx: TestDbContext | null = null;
  let quotaService: ReturnType<typeof createQuotaService> | null = null;
  let userIds: number[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-quota-consume-action");
    quotaService = createQuotaService(ctx.repos, {
      todayDateString: () => BENCH_DATE,
    });
    userIds = await seedQuotaUsers(ctx);

    for (const userId of userIds) {
      const result = await quotaService.allocate(2, userId, 2, BENCH_DATE);
      if (!result.ok) {
        throw new Error(
          `expected quota allocation success, got ${result.error.message}`,
        );
      }
    }
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
    quotaService = null;
  });

  bench(
    "action path: consume quota for allocated user",
    async () => {
      const userId = takeFromPool(
        userIds,
        cursor,
        "quota-consume pool exhausted before iterations completed",
      );

      const result = await quotaService!.consume(userId, 1);
      if (!result.ok) {
        throw new Error(
          `expected quota consume success, got ${result.error.message}`,
        );
      }
    },
    fixedIterations(USER_POOL_SIZE),
  );
});

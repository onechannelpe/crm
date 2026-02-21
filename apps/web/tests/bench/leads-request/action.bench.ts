import { afterAll, beforeAll, bench, describe } from "vitest";

import { createLeadAssignmentService } from "~/server/leads/service";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { seedLeadsRequestFixtures, USER_POOL_SIZE } from "./fixtures";

describe("lead assignment action benchmark", () => {
  let ctx: TestDbContext | null = null;
  let leadService: ReturnType<typeof createLeadAssignmentService> | null = null;
  let userIds: number[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-leads-request-action");
    const fixtures = await seedLeadsRequestFixtures(ctx);
    userIds = fixtures.userIds;

    leadService = createLeadAssignmentService(ctx.repos, {
      quotaService: fixtures.quotaService,
      engineClient: fixtures.engineClient,
    });
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
    leadService = null;
  });

  bench(
    "action path: request leads for one user",
    async () => {
      const userId = takeFromPool(
        userIds,
        cursor,
        "leads-request pool exhausted before iterations completed",
      );

      const result = await leadService!.requestLeads(userId, 1, 1);
      if (!result.ok) {
        throw new Error(`expected lead request success, got ${result.error}`);
      }
      if (result.value !== 1) {
        throw new Error(`expected one assigned lead, got ${result.value}`);
      }
    },
    fixedIterations(USER_POOL_SIZE),
  );
});

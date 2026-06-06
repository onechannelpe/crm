import { afterAll, beforeAll, bench, describe } from "vitest";

import { assignContacts } from "~/server/contact-assignments/application/assign-contacts";
import { createContactAssignmentsContext } from "~/server/contact-assignments/infrastructure/context";
import type { EngineClient } from "~/server/shared/engine/client";

import { createBenchDbFixture } from "../_shared/fixture";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { seedLeadsRequestFixtures, USER_POOL_SIZE } from "./fixtures";

describe("lead refill service benchmark", () => {
  const db = createBenchDbFixture("bench-leads-request-service");
  let engine!: EngineClient;
  let userIds: number[] = [];
  const cursor = { value: 0 };
  let assignmentContext!: ReturnType<typeof createContactAssignmentsContext>;

  beforeAll(async () => {
    const ctx = await db.setup();
    const fixtures = await seedLeadsRequestFixtures(ctx);
    userIds = fixtures.userIds;
    engine = fixtures.engineClient;

    assignmentContext = createContactAssignmentsContext({
      executor: ctx.db,
      engine,
    });
  });

  afterAll(async () => {
    await db.teardown();
  });

  bench(
    "service path: request lead refill for one user",
    async () => {
      const userId = takeFromPool(
        userIds,
        cursor,
        "leads-request pool exhausted before iterations completed",
      );

      const result = await assignContacts(
        {
          actorUserId: userId,
          branchId: 1,
        },
        {
          repos: assignmentContext.repos,
          uow: assignmentContext.uow,
          engine: assignmentContext.engine,
        },
      );

      if (!result.ok) {
        throw new Error(
          `expected lead refill success, got ${result.error.code}`,
        );
      }
    },
    fixedIterations(USER_POOL_SIZE),
  );
});
